import { apiRequest, formatTable, log, error, success } from '../lib/api'
import type { Tag } from '../../shared/types'

export async function listTags(options: { json?: boolean }): Promise<void> {
  const result = await apiRequest<Tag[]>('/api/tags', { requireAuth: false })

  if (!result.success) {
    error(result.error || 'Failed to fetch tags')
    return
  }

  const tags = result.data || []

  if (options.json) {
    log(JSON.stringify(tags, null, 2))
    return
  }

  log(
    formatTable(
      tags.map((t) => ({
        id: t.id.slice(0, 8),
        name: t.name,
        slug: t.slug,
        posts: t.postCount || 0,
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'name', label: 'Name', width: 20 },
        { key: 'slug', label: 'Slug', width: 20 },
        { key: 'posts', label: 'Posts', width: 6 },
      ]
    )
  )

  log(`\nTotal: ${tags.length} tags`)
}

export async function createTag(options: { name: string }): Promise<void> {
  const result = await apiRequest<Tag>('/api/tags', {
    method: 'POST',
    body: { name: options.name },
  })

  if (!result.success) {
    error(result.error || 'Failed to create tag')
    return
  }

  success(`Tag created: ${result.data?.name}`)
  log(`ID: ${result.data?.id}`)
  log(`Slug: ${result.data?.slug}`)
}

export async function deleteTag(id: string): Promise<void> {
  const result = await apiRequest(`/api/tags/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete tag')
    return
  }

  success('Tag deleted')
}
