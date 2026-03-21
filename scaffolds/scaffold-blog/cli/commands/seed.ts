import { apiRequest, error, log, success } from '../lib/api'

type Category = { id: string; name: string; slug: string }
type PostGenResult = { postId: string; title: string; slug: string; status: 'draft' | 'published' }
type Comment = { id: string; status: 'pending' | 'approved' | 'spam' | 'deleted' }

const DEFAULT_CATEGORY_PROMPT =
  'Create categories for a general-purpose modern blog. Cover technology, business, product, design, marketing, lifestyle, tutorials, and news.'

const DEFAULT_TOPICS = [
  'How to build a simple API with Bun and Hono',
  'The practical guide to writing great technical documentation',
  'How to think in systems: a framework for better decisions',
  'Shipping faster: small-batch product development for teams',
  'Modern CSS layouts: grid + flexbox patterns that scale',
  'Database basics: indexing, performance, and common pitfalls',
  'Security fundamentals for web apps: simple steps that matter',
  'How to build a content strategy that compounds over time',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeComment(i: number): { authorName: string; authorEmail: string; content: string } {
  const names = ['Alex', 'Jordan', 'Taylor', 'Sam', 'Casey', 'Morgan', 'Riley', 'Avery', 'Jamie', 'Cameron']
  const last = ['Smith', 'Johnson', 'Lee', 'Garcia', 'Brown', 'Davis', 'Miller', 'Wilson', 'Martinez', 'Anderson']
  const authorName = `${pick(names)} ${pick(last)}`
  const authorEmail = `demo${Date.now()}_${i}@example.com`
  const content = pick([
    'This was super helpful — especially the concrete steps. Thanks for sharing.',
    'Great breakdown. I tried this approach and it made the whole flow much clearer.',
    'Love the clarity here. The examples made it easy to follow along.',
    'Solid post. A quick follow-up: do you have a recommendation for next steps?',
  ])
  return { authorName, authorEmail, content }
}

export async function seedDemoAi(options: {
  posts?: number
  commentsPerPost?: number
  categoryPrompt?: string
  categoryCount?: number
  json?: boolean
}): Promise<void> {
  const postsCount = Math.max(1, Math.min(30, options.posts ?? 8))
  const commentsPerPost = Math.max(0, Math.min(10, options.commentsPerPost ?? 2))
  const categoryPrompt = (options.categoryPrompt || DEFAULT_CATEGORY_PROMPT).trim()
  const categoryCount = Math.max(0, Math.min(30, options.categoryCount ?? 6))

  if (categoryCount > 0) {
    log(`Seeding categories with AI (${categoryCount})...`)
    const catRes = await apiRequest<{ applied: boolean; created: number; updated: number }>(
      '/api/ai/categories',
      {
        method: 'POST',
        body: { prompt: categoryPrompt, count: categoryCount, apply: true },
      }
    )
    if (!catRes.success) {
      error(catRes.error || 'Failed to seed categories')
      return
    }
    success(`Categories seeded (created ${catRes.data?.created ?? 0}, updated ${catRes.data?.updated ?? 0})`)
  }

  const categoriesRes = await apiRequest<Category[]>('/api/categories', { requireAuth: false })
  const categories = categoriesRes.success ? (categoriesRes.data || []) : []

  const createdPosts: Array<{ id: string; title: string; slug: string }> = []
  const createdComments: Array<{ id: string; postId: string }> = []

  for (let i = 0; i < postsCount; i++) {
    const topic = DEFAULT_TOPICS[i % DEFAULT_TOPICS.length]
    log(`Generating post ${i + 1}/${postsCount}: ${topic}`)

    const gen = await apiRequest<PostGenResult>('/api/ai/generate', {
      method: 'POST',
      body: { topic, tone: 'professional', length: 'medium', autoPublish: true },
    })

    if (!gen.success || !gen.data) {
      error(gen.error || 'Failed to generate post')
      return
    }

    createdPosts.push({ id: gen.data.postId, title: gen.data.title, slug: gen.data.slug })

    // Assign a random category (if any exist)
    if (categories.length > 0) {
      const categoryId = pick(categories).id
      await apiRequest(`/api/posts/${gen.data.postId}`, {
        method: 'PUT',
        body: { categoryIds: [categoryId] },
      })
    }

    // Seed comments
    for (let j = 0; j < commentsPerPost; j++) {
      const c0 = makeComment(i * 100 + j)
      const created = await apiRequest<Comment>('/api/comments', {
        method: 'POST',
        requireAuth: false,
        body: {
          postId: gen.data.postId,
          authorName: c0.authorName,
          authorEmail: c0.authorEmail,
          content: c0.content,
        },
      })

      if (created.success && created.data?.id) {
        createdComments.push({ id: created.data.id, postId: gen.data.postId })

        // If moderation is enabled, approve it so it shows up.
        if (created.data.status === 'pending') {
          await apiRequest(`/api/comments/${created.data.id}`, {
            method: 'PUT',
            body: { status: 'approved' },
          })
        }
      }
    }
  }

  if (options.json) {
    log(JSON.stringify({ posts: createdPosts, comments: createdComments }, null, 2))
    return
  }

  success(`Seeded ${createdPosts.length} posts and ${createdComments.length} comments`)
  if (createdPosts.length > 0) {
    log(`Latest post: /post/${createdPosts[createdPosts.length - 1].slug}`)
  }
}

