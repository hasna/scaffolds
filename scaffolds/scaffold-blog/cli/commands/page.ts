import { apiRequest, formatTable, log, error, success } from '../lib/api'
import fs from 'fs'
import slugify from 'slugify'

type Page = {
  id: string
  title: string
  slug: string
  content: string | null
  status: 'draft' | 'published'
  showInNav: boolean
  navOrder: number
  createdAt: string
  updatedAt: string
}

export async function listPages(options: { json?: boolean }): Promise<void> {
  const result = await apiRequest<Page[]>('/api/pages')

  if (!result.success) {
    error(result.error || 'Failed to fetch pages')
    return
  }

  const pages = result.data || []

  if (options.json) {
    log(JSON.stringify(pages, null, 2))
    return
  }

  log(
    formatTable(
      pages.map((p) => ({
        id: p.id.slice(0, 8),
        title: p.title.slice(0, 40),
        slug: p.slug,
        status: p.status,
        nav: p.showInNav ? 'yes' : 'no',
        order: p.navOrder,
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'title', label: 'Title', width: 40 },
        { key: 'slug', label: 'Slug', width: 18 },
        { key: 'status', label: 'Status', width: 10 },
        { key: 'nav', label: 'Nav', width: 3 },
        { key: 'order', label: 'Order', width: 5 },
      ]
    )
  )
}

export async function getPage(slug: string, options: { json?: boolean }): Promise<void> {
  const result = await apiRequest<Page>(`/api/pages/${slug}`, { auth: 'optional' })

  if (!result.success) {
    error(result.error || 'Page not found')
    return
  }

  const page = result.data
  if (options.json) {
    log(JSON.stringify(page, null, 2))
    return
  }

  log(`Title: ${page?.title}`)
  log(`Slug: ${page?.slug}`)
  log(`Status: ${page?.status}`)
  log(`Show in nav: ${page?.showInNav ? 'yes' : 'no'}`)
  log(`Nav order: ${page?.navOrder}`)
}

export async function createPage(options: {
  title: string
  slug?: string
  content?: string
  status?: string
  showInNav?: boolean
  navOrder?: number
}): Promise<void> {
  let content = options.content
  if (content && fs.existsSync(content)) {
    content = fs.readFileSync(content, 'utf-8')
  }

  const slug = options.slug?.trim() || slugify(options.title, { lower: true, strict: true })

  const result = await apiRequest<Page>('/api/pages', {
    method: 'POST',
    body: {
      title: options.title,
      slug,
      content,
      status: options.status || 'draft',
      showInNav: options.showInNav || false,
      navOrder: options.navOrder || 0,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to create page')
    return
  }

  success(`Page created: ${result.data?.title}`)
  log(`ID: ${result.data?.id}`)
  log(`Slug: ${result.data?.slug}`)
}

export async function updatePage(
  id: string,
  options: {
    title?: string
    slug?: string
    content?: string
    status?: string
    showInNav?: boolean
    navOrder?: number
  }
): Promise<void> {
  let content = options.content
  if (content && fs.existsSync(content)) {
    content = fs.readFileSync(content, 'utf-8')
  }

  const body: Record<string, unknown> = {}
  if (options.title) body.title = options.title
  if (options.slug) body.slug = options.slug
  if (content !== undefined) body.content = content
  if (options.status) body.status = options.status
  if (options.showInNav !== undefined) body.showInNav = options.showInNav
  if (options.navOrder !== undefined) body.navOrder = options.navOrder

  const result = await apiRequest<Page>(`/api/pages/${id}`, {
    method: 'PUT',
    body,
  })

  if (!result.success) {
    error(result.error || 'Failed to update page')
    return
  }

  success(`Page updated: ${result.data?.title}`)
}

export async function deletePage(id: string): Promise<void> {
  const result = await apiRequest(`/api/pages/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete page')
    return
  }

  success('Page deleted')
}

export async function publishPage(id: string): Promise<void> {
  const result = await apiRequest<Page>(`/api/pages/${id}`, { method: 'PUT', body: { status: 'published' } })

  if (!result.success) {
    error(result.error || 'Failed to publish page')
    return
  }

  success(`Page published: ${result.data?.title}`)
}

