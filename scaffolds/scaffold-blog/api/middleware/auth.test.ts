import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createToken, optionalAuth } from './auth'

describe('auth middleware', () => {
  test('optionalAuth allows requests without Authorization header', async () => {
    const app = new Hono()
    app.get('/', optionalAuth, (c) => c.json({ success: true, user: c.get('user') ?? null }))

    const res = await app.request('http://test/')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user).toBeNull()
  })

  test('optionalAuth rejects malformed Authorization header', async () => {
    const app = new Hono()
    app.get('/', optionalAuth, (c) => c.json({ success: true }))

    const res = await app.request('http://test/', {
      headers: { Authorization: 'Token abc' },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('optionalAuth rejects invalid bearer token', async () => {
    const app = new Hono()
    app.get('/', optionalAuth, (c) => c.json({ success: true }))

    const res = await app.request('http://test/', {
      headers: { Authorization: 'Bearer not-a-real-token' },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('optionalAuth accepts a valid token and sets user', async () => {
    const app = new Hono()
    app.get('/', optionalAuth, (c) => c.json({ success: true, user: c.get('user') ?? null }))

    const token = await createToken({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'author',
    })

    const res = await app.request('http://test/', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user?.id).toBe('user-1')
    expect(body.user?.email).toBe('user@example.com')
    expect(body.user?.role).toBe('author')
  })
})

