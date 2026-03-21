import { db } from "../client";
import { resumes, users, teamMembers } from "../schema";
import { eq } from "drizzle-orm";
import type { ResumeContent } from "../schema/resumes";

export async function seedResumes() {
  console.log("Seeding sample resumes...");

  // Find test user and tenant
  const testUser = await db.query.users.findFirst({
    where: eq(users.email, "andrei@hasna.com"),
  });

  if (!testUser) {
    console.log("Test user not found, skipping resume seeding");
    return;
  }

  const teamMember = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, testUser.id),
    with: {
      tenant: true,
    },
  });

  if (!teamMember?.tenant) {
    console.log("Test tenant not found, skipping resume seeding");
    return;
  }

  const tenantId = teamMember.tenant.id;

  // Sample resume content
  const sampleContent: ResumeContent = {
    personalInfo: {
      fullName: "Andrei Hasna",
      email: "andrei@hasna.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      linkedinUrl: "https://linkedin.com/in/andreihasna",
      githubUrl: "https://github.com/andreihasna",
      websiteUrl: "https://hasna.com",
    },
    summary:
      "Full-stack engineer with 8+ years of experience building scalable web applications. Passionate about AI, developer tools, and creating exceptional user experiences. Led teams at startups and Fortune 500 companies.",
    sections: [
      {
        id: "exp-1",
        type: "experience",
        title: "Work Experience",
        order: 0,
        visible: true,
        content: [
          {
            type: "experience",
            company: "TechCorp Inc.",
            position: "Senior Software Engineer",
            location: "San Francisco, CA",
            startDate: "2021-03",
            endDate: "",
            isCurrent: true,
            description:
              "Leading the development of AI-powered developer tools and infrastructure.",
            highlights: [
              "Architected and led development of AI code assistant used by 50K+ developers",
              "Reduced deployment time by 80% through CI/CD pipeline optimization",
              "Mentored team of 5 junior engineers, improving team velocity by 40%",
              "Implemented real-time collaboration features handling 10K concurrent users",
            ],
          },
          {
            type: "experience",
            company: "StartupXYZ",
            position: "Software Engineer",
            location: "Remote",
            startDate: "2018-06",
            endDate: "2021-02",
            isCurrent: false,
            description: "Built core features for B2B SaaS platform.",
            highlights: [
              "Developed microservices architecture handling 1M+ requests/day",
              "Built payment integration processing $10M+ annually",
              "Reduced page load times by 60% through performance optimization",
            ],
          },
          {
            type: "experience",
            company: "BigTech Corp",
            position: "Junior Developer",
            location: "Seattle, WA",
            startDate: "2016-01",
            endDate: "2018-05",
            isCurrent: false,
            description: "Full-stack development on enterprise applications.",
            highlights: [
              "Contributed to internal tools used by 5000+ employees",
              "Implemented automated testing reducing bug rate by 50%",
            ],
          },
        ],
      },
      {
        id: "edu-1",
        type: "education",
        title: "Education",
        order: 1,
        visible: true,
        content: [
          {
            type: "education",
            institution: "University of Washington",
            degree: "Bachelor of Science",
            field: "Computer Science",
            location: "Seattle, WA",
            startDate: "2012-09",
            endDate: "2016-06",
            gpa: "3.8",
            description: "Dean's List, Computer Science Club President",
          },
        ],
      },
      {
        id: "skills-1",
        type: "skills",
        title: "Skills",
        order: 2,
        visible: true,
        content: [
          {
            type: "skills",
            category: "Languages",
            skills: ["TypeScript", "JavaScript", "Python", "Go", "Rust", "SQL"],
            level: "expert",
          },
          {
            type: "skills",
            category: "Frontend",
            skills: ["React", "Next.js", "Vue.js", "Tailwind CSS", "GraphQL"],
            level: "expert",
          },
          {
            type: "skills",
            category: "Backend",
            skills: ["Node.js", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS"],
            level: "advanced",
          },
          {
            type: "skills",
            category: "AI/ML",
            skills: ["OpenAI API", "LangChain", "Vector Databases", "RAG"],
            level: "intermediate",
          },
        ],
      },
      {
        id: "proj-1",
        type: "projects",
        title: "Projects",
        order: 3,
        visible: true,
        content: [
          {
            type: "projects",
            name: "Open Source CLI Tool",
            url: "https://github.com/example/cli",
            description: "Developer productivity CLI tool with 5K+ GitHub stars",
            highlights: [
              "Built with Rust for maximum performance",
              "Featured in GitHub's trending repositories",
            ],
            technologies: ["Rust", "Tokio", "CLI"],
          },
          {
            type: "projects",
            name: "AI Resume Builder",
            description: "AI-powered resume creation platform",
            highlights: [
              "Integrated with GPT-4 for content generation",
              "PDF export with multiple templates",
            ],
            technologies: ["Next.js", "TypeScript", "OpenAI", "React-PDF"],
          },
        ],
      },
      {
        id: "cert-1",
        type: "certifications",
        title: "Certifications",
        order: 4,
        visible: true,
        content: [
          {
            type: "certifications",
            name: "AWS Solutions Architect Professional",
            issuer: "Amazon Web Services",
            issueDate: "2023-01",
            credentialId: "AWS-SAP-12345",
          },
          {
            type: "certifications",
            name: "Google Cloud Professional Developer",
            issuer: "Google Cloud",
            issueDate: "2022-06",
            credentialId: "GCP-PD-67890",
          },
        ],
      },
    ],
  };

  // Create master resume
  const [masterResume] = await db
    .insert(resumes)
    .values({
      tenantId,
      userId: testUser.id,
      title: "Master Resume - Software Engineer",
      template: "modern",
      isMaster: true,
      isPublic: true,
      slug: "andrei-hasna",
      content: sampleContent,
    })
    .onConflictDoUpdate({
      target: resumes.slug,
      set: {
        title: "Master Resume - Software Engineer",
        content: sampleContent,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log(`Created master resume: ${masterResume?.id}`);

  // Create a variant for a specific job
  const variantContent: ResumeContent = {
    ...sampleContent,
    summary:
      "AI/ML engineer with 8+ years of software development experience, specializing in LLM applications and developer tools. Proven track record of building AI-powered products used by thousands of developers.",
  };

  const [variantResume] = await db
    .insert(resumes)
    .values({
      tenantId,
      userId: testUser.id,
      title: "AI Engineer - OpenAI Application",
      template: "modern",
      isMaster: false,
      isPublic: false,
      parentResumeId: masterResume?.id,
      targetJobTitle: "AI/ML Engineer",
      targetJobUrl: "https://example.com/jobs/ai-engineer",
      content: variantContent,
    })
    .onConflictDoNothing()
    .returning();

  if (variantResume) {
    console.log(`Created variant resume: ${variantResume.id}`);
  }

  console.log("Resume seeding completed");
}
