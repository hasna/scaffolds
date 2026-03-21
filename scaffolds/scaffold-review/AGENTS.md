# 123Resume.co - Agent Instructions

## Project Overview

**123Resume.co** is an AI-first conversational resume builder. Users chat with an AI assistant that builds their resume through tool calling. The AI can:

- Scrape data from any URL (LinkedIn, GitHub, portfolios)
- Generate professional content
- Manipulate a section-based rich text editor
- Tailor resumes for specific job postings
- Export to PDF, DOCX, and JSON

**Dev Server Port:** 6210
**URL:** http://localhost:6210

## Architecture

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** NextAuth v5
- **AI:** OpenAI GPT-4o with tool calling
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query
- **Monorepo:** Turborepo + Bun

### Key Directories

```
apps/web/src/
├── app/api/v1/
│   ├── resumes/              # Resume CRUD API
│   ├── resume-assistant/     # AI chat streaming API
│   └── scrape/               # URL scraping API
├── lib/ai/tools/
│   ├── definitions.ts        # All tool schemas
│   ├── types.ts              # ToolContext, ToolExecutor
│   └── executors/            # Tool implementations
├── components/
│   ├── resume/               # Resume display components
│   └── editor/               # Section editor components
└── hooks/
    └── use-resume-chat.ts    # Streaming chat hook

packages/database/src/schema/
├── resumes.ts                # Resume & sections tables
├── scraped-profiles.ts       # Cached profile data
└── job-postings.ts           # Job posting analysis
```

## AI Tool System

### Tool Categories

| Category           | Tools                                                                       | Purpose                     |
| ------------------ | --------------------------------------------------------------------------- | --------------------------- |
| Data Extraction    | `scrape_url`, `extract_linkedin`, `extract_github`                          | Pull profile data from URLs |
| Resume Operations  | `get_resume`, `create_resume`, `update_resume`, `list_resumes`              | CRUD for resumes            |
| Section Operations | `add_section`, `update_section`, `remove_section`, `reorder_sections`       | Manipulate sections         |
| Content Generation | `generate_summary`, `generate_bullets`, `improve_content`, `tailor_for_job` | AI content creation         |
| Job Matching       | `analyze_job_posting`, `create_variant`, `compare_to_job`                   | Job-specific tailoring      |
| Export             | `export_pdf`, `export_docx`, `export_json`                                  | File generation             |

### Tool Executor Pattern

Each tool executor follows this signature:

```typescript
type ToolExecutor<TInput, TOutput> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult<TOutput>>;

interface ToolContext {
  userId: string;
  tenantId: string;
  resumeId?: string;
  threadId?: string;
}

interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  streamContent?: string; // For real-time UI feedback
}
```

## Database Schema

### Core Tables

- **resumes** - Main resume with contact info, template, theme
- **resume_sections** - Individual sections (experience, education, etc.)
- **scraped_profiles** - Cached scraped URL data
- **job_postings** - Analyzed job postings for matching

### Section Types

```typescript
type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "custom";
```

## API Endpoints

### Resume API

| Method | Endpoint                             | Description             |
| ------ | ------------------------------------ | ----------------------- |
| GET    | `/api/v1/resumes`                    | List user's resumes     |
| POST   | `/api/v1/resumes`                    | Create new resume       |
| GET    | `/api/v1/resumes/:id`                | Get single resume       |
| PUT    | `/api/v1/resumes/:id`                | Update resume           |
| DELETE | `/api/v1/resumes/:id`                | Soft delete resume      |
| POST   | `/api/v1/resumes/:id/duplicate`      | Duplicate resume        |
| POST   | `/api/v1/resumes/:id/variant`        | Create tailored variant |
| PUT    | `/api/v1/resumes/:id/publish`        | Publish with slug       |
| GET    | `/api/v1/resumes/:id/export/:format` | Export PDF/DOCX/JSON    |

### Sections API

| Method | Endpoint                                  | Description      |
| ------ | ----------------------------------------- | ---------------- |
| GET    | `/api/v1/resumes/:id/sections`            | List sections    |
| POST   | `/api/v1/resumes/:id/sections`            | Add section      |
| PUT    | `/api/v1/resumes/:id/sections/:sectionId` | Update section   |
| DELETE | `/api/v1/resumes/:id/sections/:sectionId` | Remove section   |
| POST   | `/api/v1/resumes/:id/sections/reorder`    | Reorder sections |

### Other APIs

| Method | Endpoint                        | Description       |
| ------ | ------------------------------- | ----------------- |
| POST   | `/api/v1/scrape`                | Scrape any URL    |
| POST   | `/api/v1/resume-assistant/chat` | Streaming AI chat |

## Development Guidelines

### Adding New Tools

1. Define schema in `lib/ai/tools/definitions.ts`:

```typescript
export const myNewTool = {
  name: "my_new_tool",
  description: "What this tool does",
  inputSchema: z.object({
    param1: z.string(),
  }),
};
```

2. Create executor in `lib/ai/tools/executors/`:

```typescript
export const myNewTool: ToolExecutor<MyInput, MyOutput> = async (input, ctx) => {
  // Implementation
  return { success: true, data: result };
};
```

3. Register in `executors/index.ts`:

```typescript
export const toolExecutors = {
  my_new_tool: myNewTool,
  // ...
};
```

### Adding New Sections

1. Add type to `packages/types/src/resume.ts`
2. Create display component in `components/resume/sections/`
3. Create editor component in `components/editor/sections/`
4. Update `SectionEditor` and `SectionRenderer` dispatchers

## Build, Test, and Development Commands

- `bun dev:web` starts the web app on port 6210
- `bun dev` starts all apps via Turborepo
- `bun build` builds all packages/apps
- `bun lint` and `bun lint:fix` run ESLint
- `bun test`, `bun test:watch`, `bun test:coverage` run Vitest
- `bun test:e2e` and `bun test:e2e:ui` run Playwright
- `bun db:push` pushes schema changes
- `bun db:seed` seeds test data

## Database Operations

```bash
bunx drizzle-kit push --force    # Push schema changes
bunx drizzle-kit studio          # Open Drizzle Studio
bun db:seed                      # Seed test data
```

## Test Credentials

| Field    | Value            |
| -------- | ---------------- |
| Email    | andrei@hasna.com |
| Password | TestDev#2024!    |
| Role     | super_admin      |
| Tenant   | hasna-dev        |

## Multi-Tenancy

All resume operations enforce tenant isolation:

```typescript
const userResumes = await db.query.resumes.findMany({
  where: and(
    eq(resumes.tenantId, ctx.tenantId), // Tenant isolation
    eq(resumes.userId, ctx.userId), // User ownership
    isNull(resumes.deletedAt) // Soft delete filter
  ),
});
```

## Coding Style & Conventions

- TypeScript is strict; prefer typed APIs and shared types from `packages/types`
- Formatting is enforced by Prettier (including Tailwind class ordering)
- ESLint rules apply across apps; fix lint before opening a PR
- Tests use `.test.ts`/`.test.tsx` (Vitest) and `.spec.ts` (Playwright)

## Commit Guidelines

Follow Conventional Commits:

- `feat(resume): add PDF export`
- `fix(api): correct tenant isolation`
- `test(e2e): add resume creation tests`

## Feature Flags

Resume builder features can be gated:

- `resume_builder` - Main feature toggle
- `resume_export_pdf` - PDF export
- `resume_export_docx` - DOCX export
- `resume_scraping` - URL scraping
- `resume_job_matching` - Job tailoring features
