import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, and } from "drizzle-orm";
import type { ToolExecutor } from "../types";
import type { ScrapeUrlInput } from "../definitions";

// Types for extracted data
export interface ExtractedProfile {
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  experience?: ExtractedExperience[];
  education?: ExtractedEducation[];
  skills?: string[];
  certifications?: ExtractedCertification[];
  languages?: ExtractedLanguage[];
}

export interface ExtractedExperience {
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  highlights?: string[];
}

export interface ExtractedEducation {
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  description?: string;
}

export interface ExtractedCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface ExtractedLanguage {
  language: string;
  proficiency: string;
}

export interface ExtractedJobPosting {
  title: string;
  company: string;
  location?: string;
  salary?: string;
  description: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  benefits?: string[];
  applicationUrl?: string;
}

export interface ScrapeResult {
  type: "profile" | "job_posting" | "general";
  url: string;
  profile?: ExtractedProfile;
  jobPosting?: ExtractedJobPosting;
  rawContent?: string;
}

// Helper to fetch content using Exa or fallback methods
async function fetchUrlContent(url: string): Promise<string> {
  // Try using Exa API first if available
  const exaApiKey = process.env.EXA_API_KEY;

  if (exaApiKey) {
    try {
      const response = await fetch("https://api.exa.ai/contents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": exaApiKey,
        },
        body: JSON.stringify({
          ids: [url],
          text: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results?.[0]?.text) {
          return data.results[0].text;
        }
      }
    } catch (e) {
      console.error("Exa fetch failed:", e);
    }
  }

  // Fallback: simple fetch with user-agent
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; 123Resume/1.0; +https://123resume.co)",
      },
    });

    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    console.error("Direct fetch failed:", e);
  }

  throw new Error("Unable to fetch URL content");
}

// Parse LinkedIn profile from HTML
function parseLinkedInProfile(html: string): ExtractedProfile {
  const profile: ExtractedProfile = {};

  // Extract name from title or meta tags
  const nameMatch = html.match(/<title>([^-|<]+)/i);
  const name = nameMatch?.[1];
  if (name) {
    profile.fullName = name.trim().replace(/ \| LinkedIn$/, "");
  }

  // Extract headline from meta description
  const headlineMatch = html.match(/property="og:description"\s+content="([^"]+)"/i);
  const headline = headlineMatch?.[1];
  if (headline) {
    profile.headline = headline.trim();
  }

  // Extract location from structured data
  const locationMatch = html.match(/addressLocality['"]\s*:\s*['"]([^'"]+)/i);
  const location = locationMatch?.[1];
  if (location) {
    profile.location = location;
  }

  return profile;
}

// Parse GitHub profile
function parseGitHubProfile(html: string, url: string): ExtractedProfile {
  const profile: ExtractedProfile = {};

  // Extract name
  const nameMatch = html.match(/itemprop="name">([^<]+)/i);
  const name = nameMatch?.[1];
  if (name) {
    profile.fullName = name.trim();
  }

  // Extract bio/headline
  const bioMatch = html.match(/class="user-profile-bio[^"]*">([^<]+)/i);
  const bio = bioMatch?.[1];
  if (bio) {
    profile.headline = bio.trim();
  }

  // Extract location
  const locationMatch = html.match(/itemprop="homeLocation"[^>]*>([^<]+)/i);
  const location = locationMatch?.[1];
  if (location) {
    profile.location = location.trim();
  }

  profile.githubUrl = url;

  return profile;
}

// Parse generic webpage for resume-like content
function parseGenericContent(html: string): ExtractedProfile {
  const profile: ExtractedProfile = {};

  // Extract email addresses
  const emailMatch = html.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch?.[0];
  if (email) {
    profile.email = email;
  }

  // Extract phone numbers
  const phoneMatch = html.match(
    /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/
  );
  const phone = phoneMatch?.[0];
  if (phone) {
    profile.phone = phone;
  }

  // Try to extract name from title
  const titleMatch = html.match(/<title>([^<]+)/i);
  const title = titleMatch?.[1];
  if (title) {
    const titleText = title.trim();
    // Filter out common non-name titles
    if (!titleText.match(/home|welcome|portfolio|resume|cv|website/i)) {
      const nameCandidate = titleText.split(/[|–-]/)[0];
      if (nameCandidate) {
        profile.fullName = nameCandidate.trim();
      }
    }
  }

  return profile;
}

// Parse job posting
function parseJobPosting(html: string, url: string): ExtractedJobPosting {
  const jobPosting: ExtractedJobPosting = {
    title: "",
    company: "",
    description: "",
    applicationUrl: url,
  };

  // Try to extract job title from title tag or h1
  const titleMatch = html.match(/<title>([^<]+)/i) || html.match(/<h1[^>]*>([^<]+)/i);
  const title = titleMatch?.[1];
  if (title) {
    const titleCandidate = title.trim().split(/[|–-]/)[0];
    if (titleCandidate) {
      jobPosting.title = titleCandidate.trim();
    }
  }

  // Try to extract company name
  const companyMatch = html.match(/company['":\s]+['"]?([^'"<,]+)/i);
  const company = companyMatch?.[1];
  if (company) {
    jobPosting.company = company.trim();
  }

  // Extract structured data if available (JSON-LD)
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonContent = match.replace(/<\/?script[^>]*>/gi, "");
        const data = JSON.parse(jsonContent);

        if (data["@type"] === "JobPosting") {
          if (data.title) jobPosting.title = data.title;
          if (data.hiringOrganization?.name) jobPosting.company = data.hiringOrganization.name;
          if (data.jobLocation?.address?.addressLocality) {
            jobPosting.location = data.jobLocation.address.addressLocality;
          }
          if (data.description)
            jobPosting.description = data.description.replace(/<[^>]+>/g, " ").trim();
          if (data.baseSalary) {
            const salary = data.baseSalary;
            if (salary.value) {
              jobPosting.salary =
                typeof salary.value === "object"
                  ? `${salary.value.minValue}-${salary.value.maxValue}`
                  : String(salary.value);
            }
          }
        }
      } catch {
        // Continue if JSON parsing fails
      }
    }
  }

  return jobPosting;
}

// Main scrape executor
export const scrapeUrlExecutor: ToolExecutor<ScrapeUrlInput, ScrapeResult> = async (
  input,
  context
) => {
  const { url, extractType = "profile" } = input;
  const { tenantId } = context;

  try {
    // Check cache first
    const cached = await db.query.scrapedProfiles.findFirst({
      where: and(
        eq(schema.scrapedProfiles.url, url),
        eq(schema.scrapedProfiles.tenantId, tenantId)
      ),
    });

    // Return cached if fresh (less than 24 hours old)
    if (cached) {
      const cacheAge = Date.now() - new Date(cached.scrapedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (cacheAge < twentyFourHours) {
        return {
          success: true,
          data: {
            type: extractType,
            url,
            profile: cached.extractedData as ExtractedProfile,
          },
          streamContent: "Retrieved cached profile data",
        };
      }
    }

    // Fetch fresh content
    const html = await fetchUrlContent(url);

    let result: ScrapeResult;

    if (extractType === "job_posting") {
      const jobPosting = parseJobPosting(html, url);
      result = {
        type: "job_posting",
        url,
        jobPosting,
      };
    } else {
      // Determine profile type based on URL
      let profile: ExtractedProfile;
      let source: schema.ExtractedProfileData["source"] = "other";

      if (url.includes("linkedin.com")) {
        profile = parseLinkedInProfile(html);
        profile.linkedinUrl = url;
        source = "linkedin";
      } else if (url.includes("github.com")) {
        profile = parseGitHubProfile(html, url);
        source = "github";
      } else {
        profile = parseGenericContent(html);
        profile.portfolioUrl = url;
        source = "website";
      }

      const extractedData: schema.ExtractedProfileData = {
        source,
        personalInfo: {
          fullName: profile.fullName,
          headline: profile.headline,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          linkedinUrl: profile.linkedinUrl,
          githubUrl: profile.githubUrl,
          websiteUrl: profile.portfolioUrl,
        },
        summary: profile.summary,
        experience: profile.experience?.map((item) => ({
          company: item.company,
          position: item.position,
          location: item.location,
          startDate: item.startDate,
          endDate: item.endDate,
          isCurrent: item.isCurrent,
          description: item.description,
        })),
        education: profile.education?.map((item) => ({
          institution: item.institution,
          degree: item.degree,
          field: item.field,
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description,
        })),
        skills: profile.skills,
        certifications: profile.certifications?.map((item) => ({
          name: item.name,
          issuer: item.issuer,
          date: item.issueDate ?? item.expirationDate,
          url: item.credentialUrl,
        })),
        languages: profile.languages?.map((item) => ({
          language: item.language,
          proficiency: item.proficiency,
        })),
      };

      result = {
        type: "profile",
        url,
        profile,
      };

      // Cache the result
      if (cached) {
        await db
          .update(schema.scrapedProfiles)
          .set({
            extractedData,
            rawData: { html: html.substring(0, 50000) }, // Limit stored HTML
            scrapedAt: new Date(),
          })
          .where(eq(schema.scrapedProfiles.id, cached.id));
      } else {
        await db.insert(schema.scrapedProfiles).values({
          tenantId,
          url,
          source,
          extractedData,
          rawData: { html: html.substring(0, 50000) },
          scrapedAt: new Date(),
        });
      }
    }

    const profileName = result.profile?.fullName || result.jobPosting?.title || "data";
    return {
      success: true,
      data: result,
      streamContent: `Successfully extracted ${extractType} data: ${profileName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scrape URL",
    };
  }
};

// Export scraping executors
export const scrapingExecutors = {
  scrape_url: scrapeUrlExecutor,
};
