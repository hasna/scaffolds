/**
 * Posts route unit tests — no real DB required.
 *
 * Service layer is mocked so the tests run without a PostgreSQL instance.
 */

import { describe, expect, test, mock, beforeEach } from 'bun:test'
import { Hono } from 'hono'

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the route
// ---------------------------------------------------------------------------

const mockGetAllPosts = mock(async (_filters: any) => ({
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
}))

const mockGetPostBySlug = mock(async (_slug: string) => null)
const mockGetPostById = mock(async (_id: string) => null)
const mockGetTopPosts = mock(async (_limit: number) => [])
const mockCreatePost = mock(async (_data: any, _authorId: string) => { throw new Error('not implemented') })
const mockUpdatePost = mock(async (_id: string, _data: any) => null)
const mockDeletePost = mock(async (_id: string) => false)

mock.module('../services/post', () => ({
  getAllPosts: mockGetAllPosts,
  getTopPosts: mockGetTopPosts,
  getPostBySlug: mockGetPostBySlug,
  getPostById: mockGetPostById,
  createPost: mockCreatePost,
  updatePost: mockUpdatePost,
  deletePost: mockDeletePost,
}))

mock.module('../services/user', () => ({
  verifyPassword: mock(async () => null),
  getUserById: mock(async () => null),
  getAllUsers: mock(async () => []),
  createUser: mock(async () => { throw new Error('not implemented') }),
  updateUser: mock(async () => null),
  deleteUser: mock(async () => false),
}))

mock.module('../services/like', () => ({
  getLikeStatus: mock(async () => ({ liked: false, count: 0 })),
  likePost: mock(async () => ({ liked: true, count: 1 })),
  unlikePost: mock(async () => ({ liked: false, count: 0 })),
}))

// ---------------------------------------------------------------------------
// Build a minimal Hono app
// ---------------------------------------------------------------------------

import postsRoutes from '../routes/posts'
import { createToken } from '../middleware/auth'

function buildApp() {
  const app = new Hono()
  app.route('/api/posts', postsRoutes)
  return app
}

async function adminToken() {
  return createToken({ id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'admin' })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/posts', () => {
  beforeEach(() => {
    mockGetAllPosts.mockReset()
    mockGetAllPosts.mockImplementation(async () => ({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    }))
  })

  test('returns 200 with an array (paginated)', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/posts')

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.data)).toBe(true)
  })

  test('returns posts from the service', async () => {
    const app = buildApp()

    mockGetAllPosts.mockImplementation(async () => ({
      data: [
        { id: 'p1', title: 'Hello', slug: 'hello', status: 'published' },
        { id: 'p2', title: 'World', slug: 'world', status: 'published' },
      ],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    }))

    const res = await app.request('http://test/api/posts')
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data.data.length).toBe(2)
  })
})

describe('GET /api/posts/:slug', () => {
  beforeEach(() => {
    mockGetPostBySlug.mockReset()
  })

  test('unknown slug returns 404', async () => {
    const app = buildApp()
    mockGetPostBySlug.mockImplementation(async () => null)

    const res = await app.request('http://test/api/posts/does-not-exist')

    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  test('known published slug returns 200', async () => {
    const app = buildApp()
    mockGetPostBySlug.mockImplementation(async (slug) => ({
      id: 'p1',
      title: 'Hello',
      slug,
      status: 'published',
      authorId: 'author-1',
    }))

    const res = await app.request('http://test/api/posts/hello')

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe('hello')
  })

  test('draft slug returns 404 for unauthenticated request', async () => {
    const app = buildApp()
    mockGetPostBySlug.mockImplementation(async (slug) => ({
      id: 'p1',
      title: 'Draft',
      slug,
      status: 'draft',
      authorId: 'author-1',
    }))

    const res = await app.request('http://test/api/posts/draft-post')

    expect(res.status).toBe(404)
  })
})

describe('POST /api/posts', () => {
  test('without auth returns 401', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Post', content: 'Body text' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  test('with admin auth creates post and returns 200', async () => {
    const app = buildApp()
    const token = await adminToken()

    mockCreatePost.mockImplementation(async (data, authorId) => ({
      id: 'new-post-id',
      title: data.title,
      slug: 'new-post',
      content: data.content ?? null,
      status: data.status ?? 'draft',
      authorId,
      author: null,
      categories: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const res = await app.request('http://test/api/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'New Post', content: 'Body text' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.data.title).toBe('New Post')
  })
})
