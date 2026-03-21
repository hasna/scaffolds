import { apiRequest, formatTable, log, error, success } from '../lib/api'
import type { Category } from '../../shared/types'

export async function getHeaderCategories(options: { json?: boolean } = {}): Promise<void> {
  const result = await apiRequest<{ key: string; value: string }[]>('/api/settings')

  if (!result.success) {
    error(result.error || 'Failed to fetch settings')
    return
  }

  const list = result.data || []
  const setting = list.find((s) => s.key === 'headerCategorySlugs')
  if (!setting) {
    log(options.json ? JSON.stringify({ mode: 'all' }, null, 2) : 'Header categories: all')
    return
  }

  let value: unknown = undefined
  try {
    value = JSON.parse(setting.value)
  } catch {
    value = setting.value
  }

  if (options.json) {
    log(JSON.stringify({ headerCategorySlugs: value }, null, 2))
    return
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      log('Header categories: none')
      return
    }
    log(`Header categories: ${(value as unknown[]).join(', ')}`)
    return
  }

  log('Header categories: all')
}

export async function setHeaderCategories(input: string): Promise<void> {
  const trimmed = input.trim()

  let headerCategorySlugs: string[] | null
  if (trimmed.toLowerCase() === 'all') {
    headerCategorySlugs = null
  } else if (trimmed.toLowerCase() === 'none') {
    headerCategorySlugs = []
  } else {
    headerCategorySlugs = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const result = await apiRequest('/api/settings', {
    method: 'PUT',
    body: { headerCategorySlugs },
  })

  if (!result.success) {
    error(result.error || 'Failed to update header categories')
    return
  }

  success('Header categories updated')
}

export async function listCategories(options: { json?: boolean }): Promise<void> {
  const result = await apiRequest<Category[]>('/api/categories', { requireAuth: false })

  if (!result.success) {
    error(result.error || 'Failed to fetch categories')
    return
  }

  const categories = result.data || []

  if (options.json) {
    log(JSON.stringify(categories, null, 2))
    return
  }

  log(
    formatTable(
      categories.map((c) => ({
        id: c.id.slice(0, 8),
        name: c.name,
        slug: c.slug,
        posts: c.postCount || 0,
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'name', label: 'Name', width: 20 },
        { key: 'slug', label: 'Slug', width: 20 },
        { key: 'posts', label: 'Posts', width: 6 },
      ]
    )
  )

  log(`\nTotal: ${categories.length} categories`)
}

export async function createCategory(options: {
  name: string
  description?: string
  parentId?: string
}): Promise<void> {
  const result = await apiRequest<Category>('/api/categories', {
    method: 'POST',
    body: {
      name: options.name,
      description: options.description,
      parentId: options.parentId,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to create category')
    return
  }

  success(`Category created: ${result.data?.name}`)
  log(`ID: ${result.data?.id}`)
  log(`Slug: ${result.data?.slug}`)
}

export async function deleteCategory(id: string): Promise<void> {
  const result = await apiRequest(`/api/categories/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete category')
    return
  }

  success('Category deleted')
}
