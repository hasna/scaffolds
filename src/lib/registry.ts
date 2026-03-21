export type Category = "App" | "AI";

export interface EnvVar {
  key: string;
  label: string;
  description: string;
  default?: string;
  required: boolean;
  secret: boolean;
  group: string;
  hint?: string;
}

export interface ScaffoldMeta {
  id: string;
  name: string;
  description: string;
  category: Category;
  techStack: string[];
  auth: string[];
  sourceRepo?: string;
  tags: string[];
}

export const CATEGORIES: Category[] = ["App", "AI"];

export const SCAFFOLDS: Record<string, ScaffoldMeta> = {
  "scaffold-saas": {
    id: "scaffold-saas",
    name: "scaffold-saas",
    description:
      "Full SaaS boilerplate with Next.js 15, Drizzle ORM, NextAuth, Stripe billing, Redis/BullMQ workers",
    category: "App",
    techStack: ["Next.js", "Drizzle", "PostgreSQL", "NextAuth", "Stripe", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    sourceRepo: "hasnaxyz/scaffold-saas",
    tags: ["saas", "billing", "stripe", "nextauth", "workers", "bullmq", "redis", "nextjs"],
  },
  "scaffold-agent": {
    id: "scaffold-agent",
    name: "scaffold-agent",
    description:
      "Anthropic-primary AI agent with a built-in task loop (OpenAI also supported via providers.ts)",
    category: "AI",
    techStack: ["Bun", "TypeScript", "Anthropic SDK", "OpenAI SDK"],
    auth: [],
    sourceRepo: "hasnaxyz/scaffold-agent",
    tags: ["ai", "agent", "openai", "anthropic", "task-loop", "multi-provider"],
  },
  "scaffold-blog": {
    id: "scaffold-blog",
    name: "scaffold-blog",
    description: "Blog engine with posts, tags, authors, comments — Hono API + React/Vite frontend",
    category: "App",
    techStack: ["Hono", "React", "Vite", "Drizzle", "PostgreSQL", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    sourceRepo: "hasnaxyz/engine-blog",
    tags: ["blog", "posts", "tags", "authors", "comments", "cms"],
  },
  "scaffold-news": {
    id: "scaffold-news",
    name: "scaffold-news",
    description: "News/media platform with articles, categories, feeds",
    category: "App",
    techStack: ["Next.js", "Drizzle", "PostgreSQL", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    sourceRepo: "hasnaxyz/engine-news",
    tags: ["news", "media", "articles", "categories", "feeds", "rss"],
  },
  "scaffold-landing-pages": {
    id: "scaffold-landing-pages",
    name: "scaffold-landing-pages",
    description: "Landing page builder with sections, leads, analytics",
    category: "App",
    techStack: ["Next.js", "Drizzle", "PostgreSQL", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    sourceRepo: "hasnaxyz/engine-lander",
    tags: ["landing-page", "builder", "leads", "analytics", "marketing"],
  },
  "scaffold-review": {
    id: "scaffold-review",
    name: "scaffold-review",
    description: "Product review platform with ratings, moderation",
    category: "App",
    techStack: ["Next.js", "Drizzle", "PostgreSQL", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    sourceRepo: "hasnaxyz/engine-review",
    tags: ["reviews", "ratings", "moderation", "products", "community"],
  },
  "scaffold-social": {
    id: "scaffold-social",
    name: "scaffold-social",
    description: "Social media platform with feed, follows, likes, notifications",
    category: "App",
    techStack: ["Next.js", "Drizzle", "PostgreSQL", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    tags: ["social", "feed", "follows", "likes", "notifications", "community"],
  },
  "scaffold-competition": {
    id: "scaffold-competition",
    name: "scaffold-competition",
    description: "Hackathon/competition platform with teams, submissions, judging",
    category: "App",
    techStack: ["Next.js", "Drizzle", "PostgreSQL", "Bun"],
    auth: ["oauth", "email", "magic-link"],
    tags: ["hackathon", "competition", "teams", "submissions", "judging"],
  },
};

export function getScaffold(id: string): ScaffoldMeta | undefined {
  return SCAFFOLDS[id];
}

export function getScaffoldsByCategory(category: Category): ScaffoldMeta[] {
  return Object.values(SCAFFOLDS).filter((s) => s.category === category);
}

export function searchScaffolds(query: string): ScaffoldMeta[] {
  const q = query.toLowerCase();
  return Object.values(SCAFFOLDS).filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}
