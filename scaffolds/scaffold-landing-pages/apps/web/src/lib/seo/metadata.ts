import { type Metadata } from "next";

/**
 * SEO Metadata Configuration
 * Centralized configuration for all meta tags including Open Graph and Twitter Cards
 */

interface SiteConfig {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  twitterHandle: string;
  locale: string;
}

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "SaaS Platform",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
    "A modern SaaS platform built with Next.js, offering powerful features for teams and individuals.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://example.com",
  ogImage: "/og-image.png",
  twitterHandle: "@saasplatform",
  locale: "en_US",
};

interface PageMetadata {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  pathname?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
}

/**
 * Generate metadata for a page
 */
export function generateMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  noIndex = false,
  pathname = "",
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  section,
  tags,
}: PageMetadata = {}): Metadata {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const pageUrl = `${siteConfig.url}${pathname}`;
  const imageUrl = image.startsWith("http") ? image : `${siteConfig.url}${image}`;

  const metadata: Metadata = {
    title: pageTitle,
    description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: pageUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: [imageUrl],
      creator: siteConfig.twitterHandle,
      site: siteConfig.twitterHandle,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };

  // Add article-specific metadata
  if (type === "article" && metadata.openGraph) {
    const ogMetadata = metadata.openGraph as Record<string, unknown>;
    if (publishedTime) {
      ogMetadata.publishedTime = publishedTime;
    }
    if (modifiedTime) {
      ogMetadata.modifiedTime = modifiedTime;
    }
    if (authors?.length) {
      ogMetadata.authors = authors;
    }
    if (section) {
      ogMetadata.section = section;
    }
    if (tags?.length) {
      ogMetadata.tags = tags;
    }
  }

  return metadata;
}

/**
 * Default metadata for the entire application
 */
export const defaultMetadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  keywords: [
    "SaaS",
    "Platform",
    "AI",
    "Collaboration",
    "Team",
    "Productivity",
    "Business",
    "Software",
  ],
  authors: [
    {
      name: siteConfig.name,
      url: siteConfig.url,
    },
  ],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.ogImage}`,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
    creator: siteConfig.twitterHandle,
    site: siteConfig.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    // Add other verifications as needed
  },
};

/**
 * Generate JSON-LD structured data for organization
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [
      `https://twitter.com/${siteConfig.twitterHandle.replace("@", "")}`,
      // Add other social profiles
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${siteConfig.url}/contact`,
    },
  };
}

/**
 * Generate JSON-LD structured data for a web page
 */
export function generateWebPageSchema(options: {
  title: string;
  description: string;
  pathname: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: options.title,
    description: options.description,
    url: `${siteConfig.url}${options.pathname}`,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

/**
 * Generate JSON-LD structured data for a software application
 */
export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * Generate JSON-LD structured data for FAQ page
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate JSON-LD structured data for article/blog post
 */
export function generateArticleSchema(options: {
  title: string;
  description: string;
  pathname: string;
  publishedTime: string;
  modifiedTime?: string;
  authorName: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.title,
    description: options.description,
    url: `${siteConfig.url}${options.pathname}`,
    datePublished: options.publishedTime,
    dateModified: options.modifiedTime ?? options.publishedTime,
    author: {
      "@type": "Person",
      name: options.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
      },
    },
    image: options.image
      ? `${siteConfig.url}${options.image}`
      : `${siteConfig.url}${siteConfig.ogImage}`,
  };
}
