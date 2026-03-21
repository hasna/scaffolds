import { apiRequest, formatTable, log, error, success } from '../lib/api'
import type { Post } from '../../shared/types'
import fs from 'fs'

export async function listPosts(options: { status?: string; json?: boolean }): Promise<void> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  params.set('includeUnpublished', '1')

  const result = await apiRequest<{ data: Post[]; total: number }>(
    `/api/posts?${params.toString()}`
  )

  if (!result.success) {
    error(result.error || 'Failed to fetch posts')
    return
  }

  const posts = result.data?.data || []

  if (options.json) {
    log(JSON.stringify(posts, null, 2))
    return
  }

  log(
    formatTable(
      posts.map((p) => ({
        id: p.id.slice(0, 8),
        title: p.title.slice(0, 40),
        status: p.status,
        created: p.createdAt.slice(0, 10),
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'title', label: 'Title', width: 40 },
        { key: 'status', label: 'Status', width: 10 },
        { key: 'created', label: 'Created', width: 10 },
      ]
    )
  )

  log(`\nTotal: ${posts.length} posts`)
}

export async function getPost(slug: string, options: { json?: boolean; preview?: boolean }): Promise<void> {
  const preview = options.preview === true
  const result = await apiRequest<Post>(
    `/api/posts/${slug}${preview ? '?preview=1' : ''}`,
    { requireAuth: preview ? true : false }
  )

  if (!result.success) {
    error(result.error || 'Post not found')
    return
  }

  const post = result.data

  if (options.json) {
    log(JSON.stringify(post, null, 2))
    return
  }

  log(`Title: ${post?.title}`)
  log(`Slug: ${post?.slug}`)
  log(`Status: ${post?.status}`)
  log(`Created: ${post?.createdAt}`)
  log(`---`)
  log(post?.excerpt || 'No excerpt')
}

export async function createPost(options: {
  title: string
  content?: string
  status?: string
}): Promise<void> {
  let content = options.content

  // If content is a file path, read it
  if (content && fs.existsSync(content)) {
    content = fs.readFileSync(content, 'utf-8')
  }

  const result = await apiRequest<Post>('/api/posts', {
    method: 'POST',
    body: {
      title: options.title,
      content,
      status: options.status || 'draft',
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to create post')
    return
  }

  success(`Post created: ${result.data?.title}`)
  log(`ID: ${result.data?.id}`)
  log(`Slug: ${result.data?.slug}`)
}

export async function updatePost(
  id: string,
  options: { title?: string; content?: string; status?: string }
): Promise<void> {
  let content = options.content

  // If content is a file path, read it
  if (content && fs.existsSync(content)) {
    content = fs.readFileSync(content, 'utf-8')
  }

  const body: Record<string, string> = {}
  if (options.title) body.title = options.title
  if (content) body.content = content
  if (options.status) body.status = options.status

  const result = await apiRequest<Post>(`/api/posts/${id}`, {
    method: 'PUT',
    body,
  })

  if (!result.success) {
    error(result.error || 'Failed to update post')
    return
  }

  success(`Post updated: ${result.data?.title}`)
}

export async function deletePost(id: string): Promise<void> {
  const result = await apiRequest(`/api/posts/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete post')
    return
  }

  success('Post deleted')
}

export async function publishPost(id: string): Promise<void> {
  const result = await apiRequest<Post>(`/api/posts/${id}`, {
    method: 'PUT',
    body: { status: 'published' },
  })

  if (!result.success) {
    error(result.error || 'Failed to publish post')
    return
  }

  success(`Post published: ${result.data?.title}`)
}
