import { findOne, findMany, run, count, generateId, now, transaction } from '../db'
import type { Post, Category, Tag, User, PaginatedResponse } from '../../shared/types'
import type { CreatePostInput, PostFilters } from '../../shared/validators'
import type { PoolClient } from 'pg'
import slugify from 'slugify'

interface PostRow {
  id: string
  title: string
  slug: string
  content: string | null
  excerpt: string | null
  featured_image: string | null
  status: 'draft' | 'published' | 'archived'
  author_id: string | null
  ai_generated: boolean
  likes_count: number | null
  published_at: string | null
  created_at: string
  updated_at: string
  meta_title: string | null
  meta_description: string | null
}

interface TopPostRow {
  id: string
  title: string
  slug: string
  created_at: string
  published_at: string | null
  author_name: string | null
}

function rowToPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    featuredImage: row.featured_image,
    status: row.status,
    authorId: row.author_id,
    aiGenerated: row.ai_generated,
    likesCount: row.likes_count ?? 0,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
  }
}

export async function getTopPosts(limit: number): Promise<Array<{ id: string; title: string; slug: string; createdAt: string; publishedAt: string | null; authorName: string | null }>> {
  const rows = await findMany<TopPostRow>(
    `SELECT
      p.id,
      p.title,
      p.slug,
      p.created_at,
      p.published_at,
      u.name as author_name
     FROM posts p
     LEFT JOIN users u ON u.id = p.author_id
     WHERE p.status = $1
     ORDER BY COALESCE(p.published_at, p.created_at) DESC
     LIMIT $2`,
    ['published', limit]
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    authorName: row.author_name,
  }))
}

async function loadPostRelations(postId: string): Promise<{ categories: Category[]; tags: Tag[]; author?: User }> {
  // Load categories
  const categoryRows = await findMany<{ id: string; name: string; slug: string; description: string | null; parent_id: string | null; created_at: string }>(
    `SELECT c.* FROM categories c
     INNER JOIN post_categories pc ON c.id = pc.category_id
     WHERE pc.post_id = $1`,
    [postId]
  )
  const categories: Category[] = categoryRows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    createdAt: row.created_at,
  }))

  // Load tags
  const tagRows = await findMany<{ id: string; name: string; slug: string; created_at: string }>(
    `SELECT t.* FROM tags t
     INNER JOIN post_tags pt ON t.id = pt.tag_id
     WHERE pt.post_id = $1`,
    [postId]
  )
  const tags: Tag[] = tagRows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
  }))

  // Load author
  let author: User | undefined
  const authorRow = await findOne<{ id: string; email: string; name: string; role: 'admin' | 'editor' | 'author'; avatar: string | null; bio: string | null; created_at: string; updated_at: string }>(
    `SELECT u.id, u.email, u.name, u.role, u.avatar, u.bio, u.created_at, u.updated_at
     FROM users u
     INNER JOIN posts p ON u.id = p.author_id
     WHERE p.id = $1`,
    [postId]
  )
  if (authorRow) {
    author = {
      id: authorRow.id,
      email: authorRow.email,
      name: authorRow.name,
      role: authorRow.role,
      avatar: authorRow.avatar,
      bio: authorRow.bio,
      createdAt: authorRow.created_at,
      updatedAt: authorRow.updated_at,
    }
  }

  return { categories, tags, author }
}

async function loadPostRelationsInTransaction(
  client: PoolClient,
  postId: string,
  authorId: string | null
): Promise<{ categories: Category[]; tags: Tag[]; author?: User }> {
  const categoryResult = await client.query<{
    id: string
    name: string
    slug: string
    description: string | null
    parent_id: string | null
    created_at: string
  }>(
    `SELECT c.* FROM categories c
     INNER JOIN post_categories pc ON c.id = pc.category_id
     WHERE pc.post_id = $1`,
    [postId]
  )

  const categories: Category[] = categoryResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parent_id,
    createdAt: row.created_at,
  }))

  const tagResult = await client.query<{
    id: string
    name: string
    slug: string
    created_at: string
  }>(
    `SELECT t.* FROM tags t
     INNER JOIN post_tags pt ON t.id = pt.tag_id
     WHERE pt.post_id = $1`,
    [postId]
  )

  const tags: Tag[] = tagResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
  }))

  let author: User | undefined
  if (authorId) {
    const authorResult = await client.query<{
      id: string
      email: string
      name: string
      role: 'admin' | 'editor' | 'author'
      avatar: string | null
      bio: string | null
      created_at: string
      updated_at: string
    }>(
      `SELECT id, email, name, role, avatar, bio, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [authorId]
    )

    const row = authorResult.rows[0]
    if (row) {
      author = {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        avatar: row.avatar,
        bio: row.bio,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    }
  }

  return { categories, tags, author }
}

async function getPostByIdInTransaction(client: PoolClient, id: string): Promise<Post | null> {
  const result = await client.query<PostRow>('SELECT * FROM posts WHERE id = $1', [id])
  const row = result.rows[0]
  if (!row) return null

  const post = rowToPost(row)
  const relations = await loadPostRelationsInTransaction(client, post.id, row.author_id)
  return { ...post, ...relations }
}

export async function getAllPosts(filters: PostFilters): Promise<PaginatedResponse<Post>> {
  const { page = 1, pageSize = 20, status, categoryId, tagId, authorId, search } = filters

  let whereClauses: string[] = []
  let params: unknown[] = []
  let paramIndex = 1

  if (status) {
    whereClauses.push(`p.status = $${paramIndex++}`)
    params.push(status)
  }

  if (categoryId) {
    whereClauses.push(`EXISTS (SELECT 1 FROM post_categories pc WHERE pc.post_id = p.id AND pc.category_id = $${paramIndex++})`)
    params.push(categoryId)
  }

  if (tagId) {
    whereClauses.push(`EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id = $${paramIndex++})`)
    params.push(tagId)
  }

  if (authorId) {
    whereClauses.push(`p.author_id = $${paramIndex++}`)
    params.push(authorId)
  }

  if (search) {
    whereClauses.push(`(p.title ILIKE $${paramIndex} OR p.content ILIKE $${paramIndex++})`)
    params.push(`%${search}%`)
  }

  const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''

  // Get total count
  const totalCount = await count(`SELECT COUNT(*) as count FROM posts p ${whereClause}`, params)

  // Get paginated posts
  const offset = (page - 1) * pageSize
  const postRows = await findMany<PostRow>(
    `SELECT p.* FROM posts p ${whereClause} ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, pageSize, offset]
  )

  const posts: Post[] = await Promise.all(
    postRows.map(async (row) => {
      const post = rowToPost(row)
      const relations = await loadPostRelations(post.id)
      return { ...post, ...relations }
    })
  )

  return {
    data: posts,
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const row = await findOne<PostRow>('SELECT * FROM posts WHERE slug = $1', [slug])
  if (!row) return null

  const post = rowToPost(row)
  const relations = await loadPostRelations(post.id)
  return { ...post, ...relations }
}

export async function getPostById(id: string): Promise<Post | null> {
  const row = await findOne<PostRow>('SELECT * FROM posts WHERE id = $1', [id])
  if (!row) return null

  const post = rowToPost(row)
  const relations = await loadPostRelations(post.id)
  return { ...post, ...relations }
}

export async function createPost(data: CreatePostInput, authorId: string): Promise<Post> {
  return transaction(async (client: PoolClient) => {
    const id = generateId()
    const slug = slugify(data.title, { lower: true, strict: true })
    const timestamp = now()
    const publishedAt = data.status === 'published' ? timestamp : null

    await client.query(
      `INSERT INTO posts (id, title, slug, content, excerpt, featured_image, status, author_id, published_at, created_at, updated_at, meta_title, meta_description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        data.title,
        slug,
        data.content || null,
        data.excerpt || null,
        data.featuredImage || null,
        data.status || 'draft',
        authorId,
        publishedAt,
        timestamp,
        timestamp,
        data.metaTitle || null,
        data.metaDescription || null,
      ]
    )

    // Insert categories
    if (data.categoryIds && data.categoryIds.length > 0) {
      for (const categoryId of data.categoryIds) {
        await client.query('INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2)', [id, categoryId])
      }
    }

    // Insert tags
    if (data.tagIds && data.tagIds.length > 0) {
      for (const tagId of data.tagIds) {
        await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [id, tagId])
      }
    }

    const post = await getPostByIdInTransaction(client, id)
    if (!post) throw new Error('Failed to create post')
    return post
  })
}

export async function updatePost(id: string, data: Partial<CreatePostInput>): Promise<Post | null> {
  return transaction(async (client: PoolClient) => {
    const existing = await getPostById(id)
    if (!existing) return null

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      params.push(data.title)
      updates.push(`slug = $${paramIndex++}`)
      params.push(slugify(data.title, { lower: true, strict: true }))
    }

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`)
      params.push(data.content)
    }

    if (data.excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`)
      params.push(data.excerpt)
    }

    if (data.featuredImage !== undefined) {
      updates.push(`featured_image = $${paramIndex++}`)
      params.push(data.featuredImage)
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(data.status)
      if (data.status === 'published' && existing.status !== 'published') {
        updates.push(`published_at = $${paramIndex++}`)
        params.push(now())
      }
    }

    if (data.metaTitle !== undefined) {
      updates.push(`meta_title = $${paramIndex++}`)
      params.push(data.metaTitle)
    }

    if (data.metaDescription !== undefined) {
      updates.push(`meta_description = $${paramIndex++}`)
      params.push(data.metaDescription)
    }

    if (data.authorId !== undefined) {
      updates.push(`author_id = $${paramIndex++}`)
      params.push(data.authorId)
    }

    updates.push(`updated_at = $${paramIndex++}`)
    params.push(now())

    if (updates.length > 0) {
      params.push(id)
      await client.query(`UPDATE posts SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params)
    }

    // Update categories
    if (data.categoryIds !== undefined) {
      await client.query('DELETE FROM post_categories WHERE post_id = $1', [id])
      for (const categoryId of data.categoryIds) {
        await client.query('INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2)', [id, categoryId])
      }
    }

    // Update tags
    if (data.tagIds !== undefined) {
      await client.query('DELETE FROM post_tags WHERE post_id = $1', [id])
      for (const tagId of data.tagIds) {
        await client.query('INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)', [id, tagId])
      }
    }

    return getPostByIdInTransaction(client, id)
  })
}

export async function deletePost(id: string): Promise<boolean> {
  const result = await run('DELETE FROM posts WHERE id = $1', [id])
  return result.rowCount > 0
}
