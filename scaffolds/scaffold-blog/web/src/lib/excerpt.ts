import { truncate } from '@/lib/utils'

function collapseInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function stripMarkdown(input: string): string {
  let text = input.replace(/\r/g, '')

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '')

  // Inline code
  text = text.replace(/`([^`]+)`/g, '$1')

  // Images -> alt text
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')

  // Links -> text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Headings / blockquotes
  text = text.replace(/^#{1,6}\s+/gm, '')
  text = text.replace(/^>\s?/gm, '')

  // List markers
  text = text.replace(/^\s*[-*+]\s+/gm, '')
  text = text.replace(/^\s*\d+\.\s+/gm, '')

  // Emphasis markers
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2')
  text = text.replace(/(\*|_)(.*?)\1/g, '$2')

  // HR
  text = text.replace(/^\s*-{3,}\s*$/gm, '')

  // Normalize newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

function splitIntoParagraphs(text: string): string[] {
  const parts = text
    .split(/\n\s*\n/g)
    .map((p) => collapseInlineWhitespace(p))
    .filter(Boolean)

  return parts
}

function splitIntoSentenceBuckets(text: string, opts: { maxBuckets: number; bucketSize: number }): string[] {
  const sentences = collapseInlineWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (sentences.length === 0) return []

  const buckets: string[] = []
  let current = ''

  for (const s of sentences) {
    if (!current) {
      current = s
      continue
    }

    if ((current.length + 1 + s.length) <= opts.bucketSize) {
      current = `${current} ${s}`
    } else {
      buckets.push(current)
      current = s
      if (buckets.length >= opts.maxBuckets) break
    }
  }

  if (buckets.length < opts.maxBuckets && current) buckets.push(current)
  return buckets
}

export function getExcerptParagraphs(input: {
  excerpt?: string | null
  content?: string | null
}, options?: {
  maxParagraphs?: number
  maxChars?: number
}): string[] {
  const maxParagraphs = options?.maxParagraphs ?? 4
  const maxChars = options?.maxChars ?? 900

  const raw = (input.excerpt || input.content || '').trim()
  if (!raw) return []

  const stripped = stripMarkdown(raw)
  let paragraphs = splitIntoParagraphs(stripped)

  if (paragraphs.length < Math.min(3, maxParagraphs)) {
    const buckets = splitIntoSentenceBuckets(stripped, { maxBuckets: maxParagraphs, bucketSize: 260 })
    if (buckets.length > paragraphs.length) paragraphs = buckets
  }

  paragraphs = paragraphs.slice(0, maxParagraphs)

  // Enforce total maxChars (truncate last paragraph if needed)
  const result: string[] = []
  let used = 0
  for (const p of paragraphs) {
    if (used >= maxChars) break
    const remaining = maxChars - used
    if (p.length <= remaining) {
      result.push(p)
      used += p.length
    } else {
      const minTail = 40
      if (remaining < minTail) break
      result.push(truncate(p, remaining))
      break
    }
  }

  return result
}

