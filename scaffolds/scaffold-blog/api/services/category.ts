import { findOne, findMany, run, count, generateId, now } from '../db'
import type { Category } from '../../shared/types'
import type { CreateCategoryInput } from '../../shared/validators'
import slugify from 'slugify'

interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  created_at: string
}

function rowToCategory(row: CategoryRow, postCount?: number): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    createdAt: row.created_at,
    postCount,
  }
}

export async function getAllCategories(): Promise<Category[]> {
  const rows = await findMany<CategoryRow>('SELECT * FROM categories ORDER BY name ASC')

  const categories = await Promise.all(
    rows.map(async (row) => {
      const postCount = await count(
        'SELECT COUNT(*) as count FROM post_categories WHERE category_id = $1',
        [row.id]
      )
      return rowToCategory(row, postCount)
    })
  )

  return categories
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const row = await findOne<CategoryRow>('SELECT * FROM categories WHERE id = $1', [id])
  if (!row) return null

  const postCount = await count(
    'SELECT COUNT(*) as count FROM post_categories WHERE category_id = $1',
    [id]
  )

  return rowToCategory(row, postCount)
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const row = await findOne<CategoryRow>('SELECT * FROM categories WHERE slug = $1', [slug])
  if (!row) return null

  const postCount = await count(
    'SELECT COUNT(*) as count FROM post_categories WHERE category_id = $1',
    [row.id]
  )

  return rowToCategory(row, postCount)
}

export async function createCategory(data: CreateCategoryInput): Promise<Category> {
  const id = generateId()
  const slug = slugify(data.name, { lower: true, strict: true })
  const timestamp = now()

  await run(
    'INSERT INTO categories (id, name, slug, description, parent_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, data.name, slug, data.description || null, data.parentId || null, timestamp]
  )

  const category = await getCategoryById(id)
  if (!category) throw new Error('Failed to create category')
  return category
}

export async function upsertCategory(data: { name: string; description?: string | null }): Promise<Category> {
  const slug = slugify(data.name, { lower: true, strict: true })
  const timestamp = now()

  const row = await findOne<{ id: string }>(
    `INSERT INTO categories (id, name, slug, description, parent_id, created_at)
     VALUES ($1, $2, $3, $4, NULL, $5)
     ON CONFLICT (slug)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = CASE WHEN EXCLUDED.description IS NULL THEN categories.description ELSE EXCLUDED.description END
     RETURNING id`,
    [generateId(), data.name, slug, data.description || null, timestamp]
  )

  if (!row?.id) throw new Error('Failed to upsert category')
  const category = await getCategoryById(row.id)
  if (!category) throw new Error('Failed to load category')
  return category
}

export async function updateCategory(id: string, data: Partial<CreateCategoryInput>): Promise<Category | null> {
  const existing = await getCategoryById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`)
    params.push(data.name)
    updates.push(`slug = $${paramIndex++}`)
    params.push(slugify(data.name, { lower: true, strict: true }))
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`)
    params.push(data.description)
  }

  if (data.parentId !== undefined) {
    updates.push(`parent_id = $${paramIndex++}`)
    params.push(data.parentId)
  }

  if (updates.length > 0) {
    params.push(id)
    await run(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params)
  }

  return getCategoryById(id)
}

export async function deleteCategory(id: string): Promise<boolean> {
  const result = await run('DELETE FROM categories WHERE id = $1', [id])
  return result.rowCount > 0
}
