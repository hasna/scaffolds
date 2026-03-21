import { count, findMany, findOne, run, generateId, now } from '../db'

export interface NewsletterSubscriber {
  id: string
  email: string
  phone: string | null
  source: string
  createdAt: string
  updatedAt: string
}

interface NewsletterSubscriberRow {
  id: string
  email: string
  phone: string | null
  source: string
  created_at: string
  updated_at: string
}

function rowToSubscriber(row: NewsletterSubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listNewsletterSubscribers(options: {
  page: number
  pageSize: number
  search?: string
}): Promise<{
  data: NewsletterSubscriber[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const page = Math.max(1, options.page)
  const pageSize = Math.min(200, Math.max(1, options.pageSize))
  const offset = (page - 1) * pageSize

  const params: unknown[] = []
  const where: string[] = []

  if (options.search && options.search.trim().length > 0) {
    const q = `%${options.search.trim().toLowerCase()}%`
    params.push(q)
    where.push(`(email_lower LIKE $${params.length} OR phone LIKE $${params.length})`)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const total = await count(`SELECT COUNT(*) as count FROM newsletter_subscribers ${whereSql}`, params)

  params.push(pageSize)
  params.push(offset)

  const rows = await findMany<NewsletterSubscriberRow>(
    `SELECT id, email, phone, source, created_at, updated_at
     FROM newsletter_subscribers
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return {
    data: rows.map(rowToSubscriber),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function deleteNewsletterSubscriber(id: string): Promise<boolean> {
  const result = await run('DELETE FROM newsletter_subscribers WHERE id = $1', [id])
  return result.rowCount > 0
}

export async function upsertNewsletterSubscriber(input: {
  email: string
  phone?: string
  source?: string
}): Promise<{ subscriber: NewsletterSubscriber; alreadySubscribed: boolean }> {
  const email = input.email.trim()
  const emailLower = email.toLowerCase()
  const phone = input.phone?.trim() || null
  const source = input.source?.trim() || 'footer'

  const existing = await findOne<NewsletterSubscriberRow>(
    'SELECT id, email, phone, source, created_at, updated_at FROM newsletter_subscribers WHERE email_lower = $1',
    [emailLower]
  )

  if (existing) {
    // Keep the original email casing; only update phone/source when provided
    await run(
      `UPDATE newsletter_subscribers
       SET phone = COALESCE($1, phone),
           source = COALESCE($2, source),
           updated_at = $3
       WHERE email_lower = $4`,
      [phone, source, now(), emailLower]
    )

    const updated = await findOne<NewsletterSubscriberRow>(
      'SELECT id, email, phone, source, created_at, updated_at FROM newsletter_subscribers WHERE email_lower = $1',
      [emailLower]
    )
    if (!updated) throw new Error('Failed to update subscriber')

    return { subscriber: rowToSubscriber(updated), alreadySubscribed: true }
  }

  const id = generateId()
  const timestamp = now()

  await run(
    `INSERT INTO newsletter_subscribers (id, email, email_lower, phone, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, email, emailLower, phone, source, timestamp, timestamp]
  )

  const created = await findOne<NewsletterSubscriberRow>(
    'SELECT id, email, phone, source, created_at, updated_at FROM newsletter_subscribers WHERE id = $1',
    [id]
  )
  if (!created) throw new Error('Failed to create subscriber')

  return { subscriber: rowToSubscriber(created), alreadySubscribed: false }
}
