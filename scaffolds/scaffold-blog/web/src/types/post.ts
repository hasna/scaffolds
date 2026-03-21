export interface PostSummary {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  content: string | null
  featuredImage?: string | null
  likesCount?: number
  publishedAt: string | null
  createdAt: string
  updatedAt?: string
  author?: {
    id?: string
    name: string
    avatar?: string | null
  }
  categories?: Array<{
    name: string
    slug: string
  }>
  tags?: Array<{
    name: string
    slug: string
  }>
}
