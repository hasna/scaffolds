import { defineConfig } from './shared/config'

export default defineConfig({
  site: {
    name: 'Engine Blog',
    url: 'http://localhost:3000',
    description: 'An autonomous blog powered by AI',
    language: 'en',
  },

  database: {
    type: 'sqlite',
  },

  ai: {
    enabled: true,
    content: {
      provider: 'openai',
      model: 'gpt-4o',
    },
    images: {
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    },
    schedule: {
      enabled: false,
      cron: '0 9 * * *', // Daily at 9 AM
      postsPerRun: 1,
    },
    defaults: {
      tone: 'professional',
      length: 'medium',
      autoPublish: false,
    },
    topics: [
      { name: 'Technology', keywords: ['AI', 'software', 'innovation'] },
      { name: 'Productivity', keywords: ['efficiency', 'tools', 'workflow'] },
    ],
  },

  comments: {
    enabled: true,
    moderation: 'manual',
    requireApproval: true,
    maxDepth: 3,
  },

  storage: {
    type: 'local',
    path: './uploads',
  },
})
