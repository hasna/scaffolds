import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";

// ─── Agent registry (in-memory) ─────────────────────────────────────────
const _agentReg = new Map<string, { id: string; name: string; last_seen_at: string; project_id?: string }>();
import {
  SCAFFOLDS,
  CATEGORIES,
  searchScaffolds,
  getScaffoldsByCategory,
  getScaffold,
  type ScaffoldMeta,
} from "../lib/registry.js";
import {
  installScaffold,
  getInstalledScaffolds,
  type InstallOptions,
} from "../lib/installer.js";
import { runSetup } from "../lib/setup.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allScaffolds(): ScaffoldMeta[] {
  return Object.values(SCAFFOLDS);
}

function scaffoldToJson(s: ScaffoldMeta) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    techStack: s.techStack,
    auth: s.auth,
    sourceRepo: s.sourceRepo ?? null,
    tags: s.tags,
  };
}

// ─── Tool Schemas ─────────────────────────────────────────────────────────────

const ListScaffoldsSchema = z.object({
  category: z.enum(["App", "AI"]).optional(),
});

const SearchScaffoldsSchema = z.object({
  query: z.string(),
});

const ScaffoldInfoSchema = z.object({
  id: z.string(),
});

const InstallScaffoldSchema = z.object({
  id: z.string(),
  target_dir: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const ListInstalledSchema = z.object({
  dir: z.string().optional(),
});

const CreateScaffoldSchema = z.object({
  id: z.string().describe("Scaffold id e.g. saas, social, blog"),
  target_dir: z.string().describe("Absolute path for the new app"),
  app_name: z.string().describe("App name (used in .env, package.json, etc)"),
  description: z.string().optional(),
  skip_db: z.boolean().optional().default(false),
  agents: z.array(z.enum(["claude", "codex", "gemini"])).optional(),
});

// ─── Server ──────────────────────────────────────────────────────────────────

const server = new Server(
  {
    name: "open-scaffolds",
    version: "0.0.1",
    description:
      "open-scaffolds — App scaffolds for AI agents. Install production-ready templates with install_scaffold.",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── List Tools ───────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_scaffolds",
        description:
          "List all available scaffolds, optionally filtered by category (App or AI).",
        inputSchema: {
          type: "object" as const,
          properties: {
            category: {
              type: "string",
              enum: ["App", "AI"],
              description: "Filter by category",
            },
          },
        },
      },
      {
        name: "search_scaffolds",
        description:
          "Search scaffolds by name, description, or tags. Returns matching scaffolds.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "scaffold_info",
        description: "Get full metadata for a specific scaffold by its ID.",
        inputSchema: {
          type: "object" as const,
          properties: {
            id: {
              type: "string",
              description:
                'Scaffold ID (e.g. "scaffold-saas", "scaffold-agent")',
            },
          },
          required: ["id"],
        },
      },
      {
        name: "install_scaffold",
        description:
          "Install a scaffold into a target directory. Returns the install result including files written.",
        inputSchema: {
          type: "object" as const,
          properties: {
            id: {
              type: "string",
              description: "Scaffold ID to install",
            },
            target_dir: {
              type: "string",
              description: "Absolute path to the target directory",
            },
            name: {
              type: "string",
              description:
                "Application name — replaces {{name}} in template files",
            },
            description: {
              type: "string",
              description:
                "Application description — replaces {{description}} in template files",
            },
          },
          required: ["id", "target_dir"],
        },
      },
      {
        name: "list_categories",
        description: "List all scaffold categories with scaffold counts.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "list_installed",
        description:
          "List scaffolds installed in a directory (reads .scaffolds/installed.json).",
        inputSchema: {
          type: "object" as const,
          properties: {
            dir: {
              type: "string",
              description:
                "Directory to check (defaults to current working directory)",
            },
          },
        },
      },
      {
        name: "create_scaffold",
        description:
          "Set up a new app from a scaffold. Copies files, writes .env, runs bun install, and optionally sets up the database and registers AI agents.",
        inputSchema: {
          type: "object" as const,
          properties: {
            id: {
              type: "string",
              description: 'Scaffold id e.g. saas, social, blog',
            },
            target_dir: {
              type: "string",
              description: "Absolute path for the new app",
            },
            app_name: {
              type: "string",
              description: "App name (used in .env, package.json, etc)",
            },
            description: {
              type: "string",
              description: "Short description of the app",
            },
            skip_db: {
              type: "boolean",
              description: "Skip db:push + db:seed (default false)",
            },
            agents: {
              type: "array",
              items: { type: "string", enum: ["claude", "codex", "gemini"] },
              description: "Which AI agents to register the MCP server with",
            },
          },
          required: ["id", "target_dir", "app_name"],
        },
      },
      // Agent tools
      {
        name: "register_agent",
        description: "Register an agent session (idempotent). Auto-updates last_seen_at on re-register.",
        inputSchema: { type: "object" as const, properties: { name: { type: "string" }, session_id: { type: "string" } }, required: ["name"] },
      },
      {
        name: "heartbeat",
        description: "Update last_seen_at to signal agent is active.",
        inputSchema: { type: "object" as const, properties: { agent_id: { type: "string" } }, required: ["agent_id"] },
      },
      {
        name: "set_focus",
        description: "Set active project context for this agent session.",
        inputSchema: { type: "object" as const, properties: { agent_id: { type: "string" }, project_id: { type: "string" } }, required: ["agent_id"] },
      },
      {
        name: "list_agents",
        description: "List all registered agents.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "send_feedback",
        description: "Send feedback about this service",
        inputSchema: { type: "object" as const, properties: { message: { type: "string" }, email: { type: "string" }, category: { type: "string", enum: ["bug", "feature", "general"] } }, required: ["message"] },
      },
    ],
  };
});

// ─── Feedback DB helper ──────────────────────────────────────────────────────

function getFeedbackDb() {
  const home = homedir();
  const dbPath = join(home, ".hasna", "scaffolds", "scaffolds.db");
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const { Database } = require("bun:sqlite");
  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), message TEXT NOT NULL, email TEXT, category TEXT DEFAULT 'general', version TEXT, machine_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
  return db;
}

// ─── Call Tool ────────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Agent tools
      case "register_agent": {
        const a = args as { name: string; session_id?: string };
        const existing = [..._agentReg.values()].find(x => x.name === a.name);
        if (existing) { existing.last_seen_at = new Date().toISOString(); return { content: [{ type: "text" as const, text: JSON.stringify(existing) }] }; }
        const id = Math.random().toString(36).slice(2, 10);
        const ag = { id, name: a.name, last_seen_at: new Date().toISOString() };
        _agentReg.set(id, ag);
        return { content: [{ type: "text" as const, text: JSON.stringify(ag) }] };
      }
      case "heartbeat": {
        const a = args as { agent_id: string };
        const ag = _agentReg.get(a.agent_id);
        if (!ag) return { content: [{ type: "text" as const, text: `Agent not found: ${a.agent_id}` }], isError: true };
        ag.last_seen_at = new Date().toISOString();
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: ag.id, name: ag.name, last_seen_at: ag.last_seen_at }) }] };
      }
      case "set_focus": {
        const a = args as { agent_id: string; project_id?: string };
        const ag = _agentReg.get(a.agent_id);
        if (!ag) return { content: [{ type: "text" as const, text: `Agent not found: ${a.agent_id}` }], isError: true };
        (ag as any).project_id = a.project_id ?? undefined;
        return { content: [{ type: "text" as const, text: a.project_id ? `Focus: ${a.project_id}` : "Focus cleared" }] };
      }
      case "list_agents": {
        const agents = [..._agentReg.values()];
        return { content: [{ type: "text" as const, text: agents.length === 0 ? "No agents registered." : JSON.stringify(agents, null, 2) }] };
      }
      case "send_feedback": {
        const p = args as { message: string; email?: string; category?: string };
        const db = getFeedbackDb();
        db.prepare("INSERT INTO feedback (message, email, category, version) VALUES (?, ?, ?, ?)").run(p.message, p.email || null, p.category || "general", "0.0.2");
        db.close();
        return { content: [{ type: "text" as const, text: "Feedback saved. Thank you!" }] };
      }

      case "list_scaffolds": {
        const params = ListScaffoldsSchema.parse(args ?? {});
        const scaffolds = params.category
          ? getScaffoldsByCategory(params.category)
          : allScaffolds();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(scaffolds.map(scaffoldToJson), null, 2),
            },
          ],
        };
      }

      case "search_scaffolds": {
        const params = SearchScaffoldsSchema.parse(args);
        const results = searchScaffolds(params.query);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  query: params.query,
                  count: results.length,
                  results: results.map(scaffoldToJson),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "scaffold_info": {
        const params = ScaffoldInfoSchema.parse(args);
        const normalized = params.id.startsWith("scaffold-")
          ? params.id
          : `scaffold-${params.id}`;
        const scaffold = getScaffold(normalized) ?? getScaffold(params.id);

        if (!scaffold) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  { error: `Scaffold "${params.id}" not found.` },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(scaffoldToJson(scaffold), null, 2),
            },
          ],
        };
      }

      case "install_scaffold": {
        const params = InstallScaffoldSchema.parse(args);
        const options: InstallOptions = {
          targetDir: params.target_dir,
          name: params.name,
          description: params.description,
        };

        const result = installScaffold(params.id, options);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  scaffold: scaffoldToJson(result.scaffold),
                  targetDir: result.targetDir,
                  filesWritten: result.filesWritten,
                  skipped: result.skipped,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_categories": {
        const categories = CATEGORIES.map((cat) => ({
          name: cat,
          count: getScaffoldsByCategory(cat).length,
          scaffolds: getScaffoldsByCategory(cat).map((s) => s.id),
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      }

      case "list_installed": {
        const params = ListInstalledSchema.parse(args ?? {});
        const installed = getInstalledScaffolds(params.dir);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  dir: params.dir ?? process.cwd(),
                  count: installed.length,
                  installed,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_scaffold": {
        const params = CreateScaffoldSchema.parse(args);
        const result = await runSetup({
          scaffoldId: params.id,
          targetDir: params.target_dir,
          appName: params.app_name,
          description: params.description,
          skipEnvWizard: true, // MCP can't do interactive prompts
          skipInstall: false,
          skipDbSetup: params.skip_db,
          agents: params.agents,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Unknown tool: ${name}` }, null, 2),
            },
          ],
          isError: true,
        };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
