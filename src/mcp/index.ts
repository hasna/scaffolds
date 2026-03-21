import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
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
    ],
  };
});

// ─── Call Tool ────────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
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
