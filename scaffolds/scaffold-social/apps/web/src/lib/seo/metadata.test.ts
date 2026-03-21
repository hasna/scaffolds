// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  siteConfig,
  generateMetadata,
  defaultMetadata,
  generateOrganizationSchema,
  generateWebPageSchema,
  generateSoftwareApplicationSchema,
  generateFAQSchema,
  generateArticleSchema,
} from "./metadata";

describe("seo/metadata", () => {
  describe("siteConfig", () => {
    it("should have required properties", () => {
      expect(siteConfig.name).toBeDefined();
      expect(siteConfig.description).toBeDefined();
      expect(siteConfig.url).toBeDefined();
      expect(siteConfig.ogImage).toBeDefined();
      expect(siteConfig.twitterHandle).toBeDefined();
      expect(siteConfig.locale).toBeDefined();
    });
  });

  describe("generateMetadata", () => {
    it("should generate metadata with default values", () => {
      const metadata = generateMetadata({});

      expect(metadata.title).toBe(siteConfig.name);
      expect(metadata.description).toBe(siteConfig.description);
    });

    it("should generate metadata with custom title", () => {
      const metadata = generateMetadata({ title: "Test Page" });

      expect(metadata.title).toBe(`Test Page | ${siteConfig.name}`);
    });

    it("should generate metadata with custom description", () => {
      const metadata = generateMetadata({ description: "Custom description" });

      expect(metadata.description).toBe("Custom description");
    });

    it("should set noIndex robots when specified", () => {
      const metadata = generateMetadata({ noIndex: true });

      expect(metadata.robots).toEqual({
        index: false,
        follow: false,
      });
    });

    it("should set indexable robots by default", () => {
      const metadata = generateMetadata({});

      expect(metadata.robots).toMatchObject({
        index: true,
        follow: true,
      });
    });

    it("should include Open Graph metadata", () => {
      const metadata = generateMetadata({
        title: "Test",
        description: "Test description",
        pathname: "/test",
      });

      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.title).toBe(`Test | ${siteConfig.name}`);
      expect(metadata.openGraph?.description).toBe("Test description");
      expect(metadata.openGraph?.url).toBe(`${siteConfig.url}/test`);
    });

    it("should include Twitter metadata", () => {
      const metadata = generateMetadata({ title: "Test" });

      expect(metadata.twitter).toBeDefined();
      expect(metadata.twitter?.card).toBe("summary_large_image");
      expect(metadata.twitter?.creator).toBe(siteConfig.twitterHandle);
    });

    it("should handle article type with extra fields", () => {
      const metadata = generateMetadata({
        title: "Article Title",
        type: "article",
        publishedTime: "2024-01-15T00:00:00Z",
        modifiedTime: "2024-01-16T00:00:00Z",
        authors: ["John Doe"],
        section: "Technology",
        tags: ["tech", "coding"],
      });

      expect(metadata.openGraph?.type).toBe("article");
      const og = metadata.openGraph as Record<string, unknown>;
      expect(og.publishedTime).toBe("2024-01-15T00:00:00Z");
      expect(og.modifiedTime).toBe("2024-01-16T00:00:00Z");
      expect(og.authors).toEqual(["John Doe"]);
      expect(og.section).toBe("Technology");
      expect(og.tags).toEqual(["tech", "coding"]);
    });

    it("should handle absolute image URLs", () => {
      const metadata = generateMetadata({
        image: "https://example.com/custom-image.png",
      });

      const og = metadata.openGraph as Record<string, unknown>;
      const images = og.images as Array<{ url: string }>;
      expect(images[0].url).toBe("https://example.com/custom-image.png");
    });
  });

  describe("defaultMetadata", () => {
    it("should have title template", () => {
      expect(defaultMetadata.title).toBeDefined();
      expect((defaultMetadata.title as { template: string }).template).toContain(
        siteConfig.name
      );
    });

    it("should have keywords", () => {
      expect(defaultMetadata.keywords).toBeDefined();
      expect(Array.isArray(defaultMetadata.keywords)).toBe(true);
    });

    it("should have Open Graph configuration", () => {
      expect(defaultMetadata.openGraph).toBeDefined();
      expect(defaultMetadata.openGraph?.siteName).toBe(siteConfig.name);
    });

    it("should have Twitter configuration", () => {
      expect(defaultMetadata.twitter).toBeDefined();
      expect(defaultMetadata.twitter?.card).toBe("summary_large_image");
    });

    it("should have icons configuration", () => {
      expect(defaultMetadata.icons).toBeDefined();
    });

    it("should have manifest reference", () => {
      expect(defaultMetadata.manifest).toBe("/manifest.json");
    });
  });

  describe("generateOrganizationSchema", () => {
    it("should generate valid organization schema", () => {
      const schema = generateOrganizationSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Organization");
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.url).toBe(siteConfig.url);
    });

    it("should include contact point", () => {
      const schema = generateOrganizationSchema();

      expect(schema.contactPoint).toBeDefined();
      expect(schema.contactPoint["@type"]).toBe("ContactPoint");
    });

    it("should include social profiles", () => {
      const schema = generateOrganizationSchema();

      expect(schema.sameAs).toBeDefined();
      expect(Array.isArray(schema.sameAs)).toBe(true);
    });
  });

  describe("generateWebPageSchema", () => {
    it("should generate valid web page schema", () => {
      const schema = generateWebPageSchema({
        title: "Test Page",
        description: "Test description",
        pathname: "/test",
      });

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("WebPage");
      expect(schema.name).toBe("Test Page");
      expect(schema.description).toBe("Test description");
      expect(schema.url).toBe(`${siteConfig.url}/test`);
    });

    it("should include isPartOf reference", () => {
      const schema = generateWebPageSchema({
        title: "Test",
        description: "Test",
        pathname: "/test",
      });

      expect(schema.isPartOf).toBeDefined();
      expect(schema.isPartOf["@type"]).toBe("WebSite");
    });
  });

  describe("generateSoftwareApplicationSchema", () => {
    it("should generate valid software application schema", () => {
      const schema = generateSoftwareApplicationSchema();

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("SoftwareApplication");
      expect(schema.name).toBe(siteConfig.name);
      expect(schema.applicationCategory).toBe("BusinessApplication");
    });

    it("should include offers", () => {
      const schema = generateSoftwareApplicationSchema();

      expect(schema.offers).toBeDefined();
      expect(schema.offers["@type"]).toBe("Offer");
      expect(schema.offers.priceCurrency).toBe("USD");
    });
  });

  describe("generateFAQSchema", () => {
    it("should generate valid FAQ schema", () => {
      const faqs = [
        { question: "Q1?", answer: "A1" },
        { question: "Q2?", answer: "A2" },
      ];
      const schema = generateFAQSchema(faqs);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity).toHaveLength(2);
    });

    it("should format FAQ items correctly", () => {
      const faqs = [{ question: "What is this?", answer: "A SaaS platform" }];
      const schema = generateFAQSchema(faqs);

      expect(schema.mainEntity[0]["@type"]).toBe("Question");
      expect(schema.mainEntity[0].name).toBe("What is this?");
      expect(schema.mainEntity[0].acceptedAnswer["@type"]).toBe("Answer");
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe("A SaaS platform");
    });

    it("should handle empty FAQ array", () => {
      const schema = generateFAQSchema([]);

      expect(schema.mainEntity).toHaveLength(0);
    });
  });

  describe("generateArticleSchema", () => {
    it("should generate valid article schema", () => {
      const schema = generateArticleSchema({
        title: "Test Article",
        description: "Article description",
        pathname: "/blog/test-article",
        publishedTime: "2024-01-15T00:00:00Z",
        authorName: "John Doe",
      });

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Article");
      expect(schema.headline).toBe("Test Article");
      expect(schema.description).toBe("Article description");
      expect(schema.datePublished).toBe("2024-01-15T00:00:00Z");
    });

    it("should use publishedTime as modifiedTime if not provided", () => {
      const schema = generateArticleSchema({
        title: "Test",
        description: "Test",
        pathname: "/blog/test",
        publishedTime: "2024-01-15T00:00:00Z",
        authorName: "John Doe",
      });

      expect(schema.dateModified).toBe("2024-01-15T00:00:00Z");
    });

    it("should use custom modifiedTime when provided", () => {
      const schema = generateArticleSchema({
        title: "Test",
        description: "Test",
        pathname: "/blog/test",
        publishedTime: "2024-01-15T00:00:00Z",
        modifiedTime: "2024-01-20T00:00:00Z",
        authorName: "John Doe",
      });

      expect(schema.dateModified).toBe("2024-01-20T00:00:00Z");
    });

    it("should include author and publisher", () => {
      const schema = generateArticleSchema({
        title: "Test",
        description: "Test",
        pathname: "/blog/test",
        publishedTime: "2024-01-15T00:00:00Z",
        authorName: "Jane Smith",
      });

      expect(schema.author).toBeDefined();
      expect(schema.author["@type"]).toBe("Person");
      expect(schema.author.name).toBe("Jane Smith");
      expect(schema.publisher).toBeDefined();
      expect(schema.publisher["@type"]).toBe("Organization");
    });

    it("should use custom image when provided", () => {
      const schema = generateArticleSchema({
        title: "Test",
        description: "Test",
        pathname: "/blog/test",
        publishedTime: "2024-01-15T00:00:00Z",
        authorName: "John Doe",
        image: "/images/custom.png",
      });

      expect(schema.image).toBe(`${siteConfig.url}/images/custom.png`);
    });

    it("should use default OG image when not provided", () => {
      const schema = generateArticleSchema({
        title: "Test",
        description: "Test",
        pathname: "/blog/test",
        publishedTime: "2024-01-15T00:00:00Z",
        authorName: "John Doe",
      });

      expect(schema.image).toBe(`${siteConfig.url}${siteConfig.ogImage}`);
    });
  });
});
