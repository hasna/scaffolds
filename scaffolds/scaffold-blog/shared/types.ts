// Shared types for engine-blog

export interface Post {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  featuredImage: string | null
  status: 'draft' | 'published' | 'archived'
  authorId: string | null
  aiGenerated: boolean
  likesCount?: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  metaTitle: string | null
  metaDescription: string | null
  categories?: Category[]
  tags?: Tag[]
  author?: User
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  createdAt: string
  parent?: Category
  children?: Category[]
  postCount?: number
}

export interface Tag {
  id: string
  name: string
  slug: string
  createdAt: string
  postCount?: number
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'author'
  avatar: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  postId: string
  parentId: string | null
  authorName: string
  authorEmail: string
  content: string
  status: 'pending' | 'approved' | 'spam' | 'deleted'
  createdAt: string
  replies?: Comment[]
}

export interface Media {
  id: string
  filename: string
  path: string
  mimeType: string | null
  size: number | null
  altText: string | null
  uploadedBy: string | null
  createdAt: string
}

export interface Setting {
  key: string
  value: string
  updatedAt: string
}

export interface AIGeneration {
  id: string
  type: 'content' | 'image'
  prompt: string | null
  model: string | null
  provider: 'openai' | 'gemini' | 'anthropic'
  result: string | null
  tokensUsed: number | null
  status: 'pending' | 'completed' | 'failed'
  error: string | null
  postId: string | null
  createdAt: string
}

export interface AISchedule {
  id: string
  name: string
  cron: string
  topicPool: AITopic[]
  settings: AIGenerationSettings
  enabled: boolean
  lastRun: string | null
  nextRun: string | null
  createdAt: string
}

export interface AITopic {
  name: string
  keywords: string[]
}

export interface AIGenerationSettings {
  tone: 'casual' | 'professional' | 'technical'
  length: 'short' | 'medium' | 'long'
  autoPublish: boolean
}

export interface NewsletterSubscriber {
  id: string
  email: string
  phone: string | null
  source: string
  createdAt: string
  updatedAt: string
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'author'
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  exp: number
}

// Create/Update DTOs
export interface CreatePostInput {
  title: string
  content?: string
  excerpt?: string
  featuredImage?: string
  status?: 'draft' | 'published'
  authorId?: string
  categoryIds?: string[]
  tagIds?: string[]
  metaTitle?: string
  metaDescription?: string
}

export interface UpdatePostInput extends Partial<CreatePostInput> {
  id: string
}

export interface CreateCategoryInput {
  name: string
  description?: string
  parentId?: string
}

export interface CreateTagInput {
  name: string
}

export interface CreateCommentInput {
  postId: string
  parentId?: string
  authorName: string
  authorEmail: string
  content: string
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role?: 'admin' | 'editor' | 'author'
}

export interface AIGenerateInput {
  topic?: string
  keywords?: string[]
  tone?: 'casual' | 'professional' | 'technical'
  length?: 'short' | 'medium' | 'long'
  autoPublish?: boolean
}
