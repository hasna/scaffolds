import { describe, expect, it } from "bun:test";
import {
  getScaffold,
  getScaffoldsByCategory,
  searchScaffolds,
  SCAFFOLDS,
} from "./registry.js";

const ALL_IDS = [
  "scaffold-saas",
  "scaffold-agent",
  "scaffold-blog",
  "scaffold-news",
  "scaffold-landing-pages",
  "scaffold-review",
  "scaffold-social",
  "scaffold-competition",
];

describe("getScaffold", () => {
  it("returns correct metadata for scaffold-saas", () => {
    const s = getScaffold("scaffold-saas");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-saas");
    expect(s!.name).toBe("scaffold-saas");
    expect(s!.category).toBe("App");
    expect(s!.techStack).toContain("Next.js");
    expect(s!.auth).toContain("oauth");
    expect(s!.tags).toContain("saas");
  });

  it("returns correct metadata for scaffold-agent", () => {
    const s = getScaffold("scaffold-agent");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-agent");
    expect(s!.category).toBe("AI");
    expect(s!.techStack).toContain("Anthropic SDK");
    expect(s!.tags).toContain("agent");
  });

  it("returns correct metadata for scaffold-blog", () => {
    const s = getScaffold("scaffold-blog");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-blog");
    expect(s!.category).toBe("App");
    expect(s!.tags).toContain("blog");
  });

  it("returns correct metadata for scaffold-news", () => {
    const s = getScaffold("scaffold-news");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-news");
    expect(s!.category).toBe("App");
    expect(s!.tags).toContain("news");
  });

  it("returns correct metadata for scaffold-landing-pages", () => {
    const s = getScaffold("scaffold-landing-pages");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-landing-pages");
    expect(s!.category).toBe("App");
    expect(s!.tags).toContain("landing-page");
  });

  it("returns correct metadata for scaffold-review", () => {
    const s = getScaffold("scaffold-review");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-review");
    expect(s!.category).toBe("App");
    expect(s!.tags).toContain("reviews");
  });

  it("returns correct metadata for scaffold-social", () => {
    const s = getScaffold("scaffold-social");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-social");
    expect(s!.category).toBe("App");
    expect(s!.tags).toContain("social");
  });

  it("returns correct metadata for scaffold-competition", () => {
    const s = getScaffold("scaffold-competition");
    expect(s).toBeDefined();
    expect(s!.id).toBe("scaffold-competition");
    expect(s!.category).toBe("App");
    expect(s!.tags).toContain("hackathon");
  });

  it("returns undefined for unknown id", () => {
    expect(getScaffold("scaffold-nonexistent")).toBeUndefined();
  });
});

describe("getScaffoldsByCategory", () => {
  it("returns 7 scaffolds for category App", () => {
    const results = getScaffoldsByCategory("App");
    expect(results.length).toBe(7);
    expect(results.every((s) => s.category === "App")).toBe(true);
  });

  it("returns 1 scaffold for category AI", () => {
    const results = getScaffoldsByCategory("AI");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("scaffold-agent");
  });
});

describe("searchScaffolds", () => {
  it("finds scaffold-social when searching 'social'", () => {
    const results = searchScaffolds("social");
    const ids = results.map((s) => s.id);
    expect(ids).toContain("scaffold-social");
  });

  it("finds scaffold-blog when searching 'blog'", () => {
    const results = searchScaffolds("blog");
    const ids = results.map((s) => s.id);
    expect(ids).toContain("scaffold-blog");
  });

  it("returns empty array for nonexistent query", () => {
    expect(searchScaffolds("nonexistent")).toEqual([]);
  });

  it("is case-insensitive", () => {
    const lower = searchScaffolds("social");
    const upper = searchScaffolds("SOCIAL");
    expect(lower.length).toBe(upper.length);
  });
});

describe("SCAFFOLDS registry completeness", () => {
  it("contains exactly 8 scaffolds", () => {
    expect(Object.keys(SCAFFOLDS).length).toBe(8);
  });

  it.each(ALL_IDS)("%s has all required fields", (id) => {
    const s = SCAFFOLDS[id];
    expect(s).toBeDefined();
    expect(typeof s.id).toBe("string");
    expect(s.id.length).toBeGreaterThan(0);
    expect(typeof s.name).toBe("string");
    expect(s.name.length).toBeGreaterThan(0);
    expect(typeof s.description).toBe("string");
    expect(s.description.length).toBeGreaterThan(0);
    expect(["App", "AI"]).toContain(s.category);
    expect(Array.isArray(s.techStack)).toBe(true);
    expect(s.techStack.length).toBeGreaterThan(0);
    expect(Array.isArray(s.auth)).toBe(true);
    expect(Array.isArray(s.tags)).toBe(true);
    expect(s.tags.length).toBeGreaterThan(0);
  });
});
