import { z } from 'zod'

const configSchema = z.object({
  site: z.object({
    name: z.string().default('My Blog'),
    url: z.string().url().default('http://localhost:3000'),
    description: z.string().default(''),
    language: z.string().default('en'),
  }),

  database: z.object({
    type: z.enum(['sqlite', 'postgres']).default('sqlite'),
  }),

  ai: z.object({
    enabled: z.boolean().default(true),
    content: z.object({
      provider: z.enum(['openai']).default('openai'),
      model: z.string().default('gpt-4o'),
    }),
    images: z.object({
      provider: z.enum(['gemini']).default('gemini'),
      model: z.string().default('gemini-2.0-flash-exp'),
    }),
    schedule: z.object({
      enabled: z.boolean().default(false),
      cron: z.string().default('0 9 * * *'),
      postsPerRun: z.number().int().positive().default(1),
    }),
    defaults: z.object({
      tone: z.enum(['casual', 'professional', 'technical']).default('professional'),
      length: z.enum(['short', 'medium', 'long']).default('medium'),
      autoPublish: z.boolean().default(false),
    }),
    topics: z.array(z.object({
      name: z.string(),
      keywords: z.array(z.string()),
    })).default([]),
  }),

  comments: z.object({
    enabled: z.boolean().default(true),
    moderation: z.enum(['manual', 'auto', 'disabled']).default('manual'),
    requireApproval: z.boolean().default(true),
    maxDepth: z.number().int().positive().default(3),
  }),

  storage: z.object({
    type: z.enum(['local', 's3']).default('local'),
    path: z.string().default('./uploads'),
  }),
})

export type BlogConfig = z.infer<typeof configSchema>

export function defineConfig(config: Partial<BlogConfig>): BlogConfig {
  return configSchema.parse(config)
}

// Load config with defaults
export function loadConfig(): BlogConfig {
  try {
    // In production, this would dynamically import blog.config.ts
    // For now, return defaults
    return configSchema.parse({})
  } catch {
    return configSchema.parse({})
  }
}
