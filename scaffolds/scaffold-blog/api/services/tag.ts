import { findOne, findMany, run, count, generateId, now } from '../db'
import type { Tag } from '../../shared/types'
import type { CreateTagInput } from '../../shared/validators'
import slugify from 'slugify'

interface TagRow {
  id: string
  name: string
  slug: string
  created_at: string
}

function rowToTag(row: TagRow, postCount?: number): Tag {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    postCount,
  }
}

export async function getAllTags(): Promise<Tag[]> {
  const rows = await findMany<TagRow>('SELECT * FROM tags ORDER BY name ASC')

  const tags = await Promise.all(
    rows.map(async (row) => {
      const postCount = await count('SELECT COUNT(*) as count FROM post_tags WHERE tag_id = $1', [row.id])
      return rowToTag(row, postCount)
    })
  )

  return tags
}

export async function getTagById(id: string): Promise<Tag | null> {
  const row = await findOne<TagRow>('SELECT * FROM tags WHERE id = $1', [id])
  if (!row) return null

  const postCount = await count('SELECT COUNT(*) as count FROM post_tags WHERE tag_id = $1', [id])

  return rowToTag(row, postCount)
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const row = await findOne<TagRow>('SELECT * FROM tags WHERE slug = $1', [slug])
  if (!row) return null

  const postCount = await count('SELECT COUNT(*) as count FROM post_tags WHERE tag_id = $1', [row.id])

  return rowToTag(row, postCount)
}

export async function createTag(data: CreateTagInput): Promise<Tag> {
  const id = generateId()
  const slug = slugify(data.name, { lower: true, strict: true })
  const timestamp = now()

  await run('INSERT INTO tags (id, name, slug, created_at) VALUES ($1, $2, $3, $4)', [
    id,
    data.name,
    slug,
    timestamp,
  ])

  const tag = await getTagById(id)
  if (!tag) throw new Error('Failed to create tag')
  return tag
}

export async function deleteTag(id: string): Promise<boolean> {
  const result = await run('DELETE FROM tags WHERE id = $1', [id])
  return result.rowCount > 0
}
