import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. AI features are disabled.')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export interface ContentGenerationInput {
  topic: string
  keywords?: string[]
  tone?: 'casual' | 'professional' | 'technical'
  length?: 'short' | 'medium' | 'long'
}

export interface GeneratedContent {
  title: string
  content: string
  excerpt: string
  metaTitle: string
  metaDescription: string
  suggestedTags: string[]
}

export async function generateSiteDescription(input: {
  prompt: string
  siteName?: string
  tone?: 'casual' | 'professional' | 'technical'
  maxChars?: number
}): Promise<string> {
  const tone = input.tone || 'professional'
  const maxChars = Math.max(80, Math.min(500, input.maxChars ?? 200))
  const siteName = input.siteName?.trim() || 'Engine Blog'

  const prompt = `Write a short blog site description for "${siteName}".

Admin prompt/context:
${input.prompt.trim()}

Requirements:
- Tone: ${tone}
- Length: max ${maxChars} characters
- 1–2 sentences
- No emojis
- No quotes around the text

Respond in JSON format:
{
  "siteDescription": "..."
}`

  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL_SITE_DESCRIPTION || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert brand and UX copywriter. Create concise, high-signal site descriptions. Always respond with valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No content generated')

  const parsed = JSON.parse(content) as { siteDescription?: string }
  const raw = String(parsed.siteDescription || '').trim()
  const normalized = raw.replace(/\s+/g, ' ').trim()

  if (!normalized) throw new Error('No siteDescription generated')

  // Keep within max chars (avoid cutting in the middle of a word when possible)
  if (normalized.length <= maxChars) return normalized

  const slice = normalized.slice(0, maxChars)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).replace(/[,\s]+$/, '').trim()
}

export async function generateCategories(input: {
  prompt: string
  tone?: 'casual' | 'professional' | 'technical'
  count?: number
  existing?: string[]
}): Promise<Array<{ name: string; description: string }>> {
  const tone = input.tone || 'professional'
  const count = Math.max(1, Math.min(30, input.count ?? 10))
  const existing = (input.existing || []).map((s) => s.trim()).filter(Boolean).slice(0, 50)

  const prompt = `Generate ${count} blog categories for a blog.

Context/prompt:
${input.prompt.trim()}

${existing.length > 0 ? `Existing categories (avoid duplicates): ${existing.join(', ')}` : ''}

Requirements:
- Tone: ${tone}
- Categories should be broad, useful, and not overlap too much
- Each item: name (2-4 words) and a short description (8-18 words)
- No emojis

Respond in JSON format:
{
  "categories": [
    { "name": "Category name", "description": "Short description" }
  ]
}`

  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL_CATEGORIES || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert content strategist. You create blog category taxonomies. Always respond with valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('No content generated')

  const parsed = JSON.parse(content) as { categories?: Array<{ name?: string; description?: string }> }
  const categories = Array.isArray(parsed.categories) ? parsed.categories : []

  return categories
    .map((c) => ({
      name: String(c.name || '').trim(),
      description: String(c.description || '').trim(),
    }))
    .filter((c) => c.name.length >= 2 && c.description.length >= 5)
    .slice(0, count)
}

const LENGTH_TOKENS = {
  short: 500,
  medium: 1000,
  long: 2000,
}

export async function generateContent(input: ContentGenerationInput): Promise<GeneratedContent> {
  const { topic, keywords = [], tone = 'professional', length = 'medium' } = input

  const wordCount = LENGTH_TOKENS[length]
  const keywordStr = keywords.length > 0 ? `Include these keywords naturally: ${keywords.join(', ')}.` : ''

  const prompt = `Write a blog post about: ${topic}

Requirements:
- Tone: ${tone}
- Length: approximately ${wordCount} words
- ${keywordStr}
- Use markdown formatting with headers, lists, and emphasis where appropriate
- Make it engaging and informative
- Include a compelling introduction and conclusion

Respond in JSON format:
{
  "title": "The blog post title",
  "content": "The full markdown content of the blog post",
  "excerpt": "A 1-2 sentence summary for previews (max 160 chars)",
  "metaTitle": "SEO-optimized title (max 60 chars)",
  "metaDescription": "SEO meta description (max 160 chars)",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`

  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a professional blog writer. You write engaging, well-structured content. Always respond with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No content generated')
  }

  const parsed = JSON.parse(content) as GeneratedContent

  return {
    title: parsed.title,
    content: parsed.content,
    excerpt: parsed.excerpt.slice(0, 160),
    metaTitle: parsed.metaTitle.slice(0, 60),
    metaDescription: parsed.metaDescription.slice(0, 160),
    suggestedTags: parsed.suggestedTags || [],
  }
}

export async function generateExcerpt(content: string): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a content summarizer. Create a brief, engaging excerpt.',
      },
      {
        role: 'user',
        content: `Create a 1-2 sentence excerpt (max 160 characters) for this blog post:\n\n${content.slice(0, 2000)}`,
      },
    ],
    max_tokens: 100,
  })

  return response.choices[0].message.content?.slice(0, 160) || ''
}

export async function generateSEO(title: string, content: string): Promise<{ metaTitle: string; metaDescription: string }> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an SEO expert. Create optimized meta tags. Respond in JSON.',
      },
      {
        role: 'user',
        content: `Create SEO meta tags for this blog post:
Title: ${title}
Content preview: ${content.slice(0, 1000)}

Respond in JSON:
{
  "metaTitle": "SEO title (max 60 chars)",
  "metaDescription": "Meta description (max 160 chars)"
}`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0].message.content || '{}')
  return {
    metaTitle: (parsed.metaTitle || title).slice(0, 60),
    metaDescription: (parsed.metaDescription || '').slice(0, 160),
  }
}
