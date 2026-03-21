import Anthropic from '@anthropic-ai/sdk'
import { generateContent, type ContentGenerationInput } from './content'
import { generateImage, generateImagePrompt } from './images'
import { generateId, now, run, findOne, findMany } from '../db'
import slugify from 'slugify'

let anthropicClient: Anthropic | null = null

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured. AI features are disabled.')
    }
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicClient
}

export interface ArticleGenerationInput {
  topic?: string
  keywords?: string[]
  tone?: 'casual' | 'professional' | 'technical'
  length?: 'short' | 'medium' | 'long'
  autoPublish?: boolean
  categoryId?: string
}

export interface GeneratedArticle {
  postId: string
  title: string
  slug: string
  status: 'draft' | 'published'
  generationId: string
}

export async function generateArticle(input: ArticleGenerationInput): Promise<GeneratedArticle> {
  const {
    topic,
    keywords = [],
    tone = 'professional',
    length = 'medium',
    autoPublish = false,
    categoryId,
  } = input

  const generationId = generateId()
  const timestamp = now()

  // Log the start of generation
  await run(
    `INSERT INTO ai_generations (id, type, prompt, model, provider, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [generationId, 'content', topic || 'auto-generated', 'gpt-4o', 'openai', 'pending', timestamp]
  )

  try {
    // Step 1: If no topic provided, use Claude to brainstorm one
    let finalTopic = topic
    if (!finalTopic) {
      finalTopic = await brainstormTopic(keywords)
    }

    // Step 2: Generate article content using OpenAI
    const contentInput: ContentGenerationInput = {
      topic: finalTopic,
      keywords,
      tone,
      length,
    }

    const content = await generateContent(contentInput)

    // Step 3: Generate featured image
    const imagePrompt = await generateImagePrompt(content.title, content.excerpt)
    const image = await generateImage({ prompt: imagePrompt })

    // Step 4: Create the post
    const postId = generateId()
    const slug = slugify(content.title, { lower: true, strict: true })

    // Check for slug uniqueness
    let finalSlug = slug
    let counter = 1
    while (await findOne('SELECT id FROM posts WHERE slug = $1', [finalSlug])) {
      finalSlug = `${slug}-${counter}`
      counter++
    }

    const status = autoPublish ? 'published' : 'draft'
    const publishedAt = autoPublish ? timestamp : null

    const aiAuthorEmail = process.env.AI_AUTHOR_EMAIL || 'ai@engine-blog.local'
    const aiAuthor =
      await findOne<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [aiAuthorEmail]) ??
      await findOne<{ id: string }>("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")

    await run(
      `INSERT INTO posts (id, title, slug, content, excerpt, featured_image, status, author_id, ai_generated, published_at, created_at, updated_at, meta_title, meta_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        postId,
        content.title,
        finalSlug,
        content.content,
        content.excerpt,
        image.path,
        status,
        aiAuthor?.id || null,
        true,
        publishedAt,
        timestamp,
        timestamp,
        content.metaTitle,
        content.metaDescription,
      ]
    )

    // Step 5: Add category if provided
    if (categoryId) {
      await run(
        `INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2)`,
        [postId, categoryId]
      )
    }

    // Step 6: Create tags from suggestions
    for (const tagName of content.suggestedTags.slice(0, 5)) {
      const tagSlug = slugify(tagName, { lower: true, strict: true })
      let tag = await findOne<{ id: string }>('SELECT id FROM tags WHERE slug = $1', [tagSlug])

      if (!tag) {
        const tagId = generateId()
        await run(
          `INSERT INTO tags (id, name, slug, created_at) VALUES ($1, $2, $3, $4)`,
          [tagId, tagName, tagSlug, timestamp]
        )
        tag = { id: tagId }
      }

      await run(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, tag.id]
      )
    }

    // Step 7: Save image to media
    await run(
      `INSERT INTO media (id, filename, path, mime_type, alt_text, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateId(), image.filename, image.path, image.mimeType, content.title, timestamp]
    )

    // Step 8: Update generation record
    await run(
      `UPDATE ai_generations SET status = $1, result = $2, post_id = $3 WHERE id = $4`,
      ['completed', JSON.stringify({ title: content.title, slug: finalSlug }), postId, generationId]
    )

    return {
      postId,
      title: content.title,
      slug: finalSlug,
      status,
      generationId,
    }
  } catch (error) {
    // Log failure
    await run(
      `UPDATE ai_generations SET status = $1, error = $2 WHERE id = $3`,
      ['failed', error instanceof Error ? error.message : 'Unknown error', generationId]
    )
    throw error
  }
}

async function brainstormTopic(keywords: string[]): Promise<string> {
  const keywordStr = keywords.length > 0
    ? `Related to these topics: ${keywords.join(', ')}`
    : 'Choose an interesting topic about technology, productivity, or business'

  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Generate a single blog post topic idea. ${keywordStr}.

        Just respond with the topic title, nothing else. Make it specific and engaging.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type === 'text') {
    return content.text.trim()
  }

  return 'The Future of Technology'
}

export async function getGenerationHistory(limit = 20): Promise<unknown[]> {
  return findMany(
    `SELECT g.*, p.title as post_title, p.slug as post_slug
     FROM ai_generations g
     LEFT JOIN posts p ON g.post_id = p.id
     ORDER BY g.created_at DESC
     LIMIT $1`,
    [limit]
  )
}
