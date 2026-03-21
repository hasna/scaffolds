import { findOne, findMany, run, generateId, now } from '../db'

interface PageRow {
  id: string
  title: string
  slug: string
  content: string | null
  status: 'draft' | 'published'
  show_in_nav: boolean
  nav_order: number
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  title: string
  slug: string
  content: string | null
  status: 'draft' | 'published'
  showInNav: boolean
  navOrder: number
  metaTitle: string | null
  metaDescription: string | null
  createdAt: string
  updatedAt: string
}

function rowToPage(row: PageRow): Page {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    status: row.status,
    showInNav: row.show_in_nav,
    navOrder: row.nav_order,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAllPages(): Promise<Page[]> {
  const rows = await findMany<PageRow>('SELECT * FROM pages ORDER BY nav_order ASC, created_at DESC')
  return rows.map(rowToPage)
}

export async function getPublishedPages(): Promise<Page[]> {
  const rows = await findMany<PageRow>(
    "SELECT * FROM pages WHERE status = 'published' ORDER BY nav_order ASC, created_at DESC"
  )
  return rows.map(rowToPage)
}

export async function getNavPages(): Promise<Page[]> {
  const rows = await findMany<PageRow>(
    "SELECT * FROM pages WHERE status = 'published' AND show_in_nav = true ORDER BY nav_order ASC"
  )
  return rows.map(rowToPage)
}

export async function getPageById(id: string): Promise<Page | null> {
  const row = await findOne<PageRow>('SELECT * FROM pages WHERE id = $1', [id])
  if (!row) return null
  return rowToPage(row)
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const row = await findOne<PageRow>('SELECT * FROM pages WHERE slug = $1', [slug])
  if (!row) return null
  return rowToPage(row)
}

export interface CreatePageInput {
  title: string
  slug: string
  content?: string
  status?: 'draft' | 'published'
  showInNav?: boolean
  navOrder?: number
  metaTitle?: string
  metaDescription?: string
}

export async function createPage(data: CreatePageInput): Promise<Page> {
  const id = generateId()
  const timestamp = now()

  await run(
    `INSERT INTO pages (id, title, slug, content, status, show_in_nav, nav_order, meta_title, meta_description, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      data.title,
      data.slug,
      data.content || null,
      data.status || 'draft',
      data.showInNav || false,
      data.navOrder || 0,
      data.metaTitle || null,
      data.metaDescription || null,
      timestamp,
      timestamp,
    ]
  )

  const page = await getPageById(id)
  if (!page) throw new Error('Failed to create page')
  return page
}

export interface UpdatePageInput {
  title?: string
  slug?: string
  content?: string
  status?: 'draft' | 'published'
  showInNav?: boolean
  navOrder?: number
  metaTitle?: string
  metaDescription?: string
}

export async function updatePage(id: string, data: UpdatePageInput): Promise<Page | null> {
  const existing = await getPageById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`)
    params.push(data.title)
  }

  if (data.slug !== undefined) {
    updates.push(`slug = $${paramIndex++}`)
    params.push(data.slug)
  }

  if (data.content !== undefined) {
    updates.push(`content = $${paramIndex++}`)
    params.push(data.content)
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    params.push(data.status)
  }

  if (data.showInNav !== undefined) {
    updates.push(`show_in_nav = $${paramIndex++}`)
    params.push(data.showInNav)
  }

  if (data.navOrder !== undefined) {
    updates.push(`nav_order = $${paramIndex++}`)
    params.push(data.navOrder)
  }

  if (data.metaTitle !== undefined) {
    updates.push(`meta_title = $${paramIndex++}`)
    params.push(data.metaTitle)
  }

  if (data.metaDescription !== undefined) {
    updates.push(`meta_description = $${paramIndex++}`)
    params.push(data.metaDescription)
  }

  updates.push(`updated_at = $${paramIndex++}`)
  params.push(now())

  if (updates.length > 0) {
    params.push(id)
    await run(`UPDATE pages SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params)
  }

  return getPageById(id)
}

export async function deletePage(id: string): Promise<boolean> {
  const result = await run('DELETE FROM pages WHERE id = $1', [id])
  return result.rowCount > 0
}
