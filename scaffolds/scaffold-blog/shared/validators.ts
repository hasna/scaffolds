import { z } from 'zod'

// Post validators
export const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
  authorId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
})

export const updatePostSchema = createPostSchema.partial().extend({
  id: z.string(),
})

// Category validators
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
})

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string(),
})

// Tag validators
export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
})

// Comment validators
export const createCommentSchema = z.object({
  postId: z.string(),
  parentId: z.string().optional(),
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email(),
  content: z.string().min(1).max(5000),
})

export const updateCommentStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'spam', 'deleted']),
})

// User validators
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'editor', 'author']).default('author'),
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'editor', 'author']).optional(),
  bio: z.string().max(1000).optional(),
  avatar: z.string().url().optional(),
})

// Auth validators
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// AI validators
export const aiGenerateSchema = z.object({
  topic: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  tone: z.enum(['casual', 'professional', 'technical']).default('professional'),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
  autoPublish: z.boolean().default(false),
})

export const aiSiteDescriptionSchema = z.object({
  prompt: z.string().min(5).max(2000),
  tone: z.enum(['casual', 'professional', 'technical']).default('professional'),
  maxChars: z.coerce.number().int().min(80).max(500).default(200),
})

export const aiCategoriesSchema = z.object({
  prompt: z.string().min(5).max(4000),
  tone: z.enum(['casual', 'professional', 'technical']).default('professional'),
  count: z.coerce.number().int().min(1).max(30).default(10),
  apply: z.boolean().default(true),
})

export const aiLogoSchema = z.object({
  prompt: z.string().min(5).max(2000),
  style: z.string().max(2000).optional(),
})

export const aiAvatarSchema = z.object({
  prompt: z.string().min(0).max(2000).optional(),
})

export const aiScheduleSchema = z.object({
  name: z.string().min(1).max(100),
  cron: z.string().min(1),
  topicPool: z.array(z.object({
    name: z.string(),
    keywords: z.array(z.string()),
  })),
  settings: z.object({
    tone: z.enum(['casual', 'professional', 'technical']),
    length: z.enum(['short', 'medium', 'long']),
    autoPublish: z.boolean(),
  }),
  enabled: z.boolean().default(true),
})

// Settings validators
export const updateSettingsSchema = z.record(z.string(), z.unknown())

// Pagination validators
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export const postFiltersSchema = paginationSchema.extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
  authorId: z.string().optional(),
  search: z.string().optional(),
})

export const commentFiltersSchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'spam', 'deleted']).optional(),
  postId: z.string().optional(),
})

// Newsletter validators
export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email(),
  phone: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return v
      const trimmed = v.trim()
      return trimmed.length === 0 ? undefined : trimmed
    },
    z
      .string()
      .min(7)
      .max(32)
      .regex(/^[0-9+()\-.\s]+$/)
      .optional()
  ).optional(),
})

// Type exports for use in other files
export type CreatePostInput = z.infer<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AIGenerateInput = z.infer<typeof aiGenerateSchema>
export type AISiteDescriptionInput = z.infer<typeof aiSiteDescriptionSchema>
export type AICategoriesInput = z.infer<typeof aiCategoriesSchema>
export type AILogoInput = z.infer<typeof aiLogoSchema>
export type AIAvatarInput = z.infer<typeof aiAvatarSchema>
export type AIScheduleInput = z.infer<typeof aiScheduleSchema>
export type PostFilters = z.infer<typeof postFiltersSchema>
export type CommentFilters = z.infer<typeof commentFiltersSchema>
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>
