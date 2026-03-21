/**
 * Auth route unit tests — no real DB required.
 *
 * We mock the service modules so that every test is self-contained and runs
 * without a running PostgreSQL instance.
 */

import { describe, expect, test, mock, beforeEach } from 'bun:test'
import { Hono } from 'hono'

// ---------------------------------------------------------------------------
// Mocks — declared before any route imports so the module loader picks them up
// ---------------------------------------------------------------------------

// Mock verifyPassword (services/user)
const mockVerifyPassword = mock(async (_email: string, _password: string) => null)

mock.module('../services/user', () => ({
  verifyPassword: mockVerifyPassword,
  getUserById: mock(async () => null),
  getAllUsers: mock(async () => []),
  createUser: mock(async () => { throw new Error('not implemented') }),
  updateUser: mock(async () => null),
  deleteUser: mock(async () => false),
}))

// Mock oauth services
const mockCreateMagicLinkToken = mock(async (_email: string) => 'mock-magic-token-abc')
const mockConsumeMagicLinkToken = mock(async (_token: string): Promise<string | null> => null)
const mockFindOrCreateOAuthUser = mock(async () => { throw new Error('not implemented') })
const mockFindOrCreateUserByEmail = mock(async (email: string) => ({
  id: 'user-1',
  email,
  name: email.split('@')[0],
  role: 'author' as const,
  avatar: null,
  bio: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}))

mock.module('../services/oauth', () => ({
  createMagicLinkToken: mockCreateMagicLinkToken,
  consumeMagicLinkToken: mockConsumeMagicLinkToken,
  findOrCreateOAuthUser: mockFindOrCreateOAuthUser,
  findOrCreateUserByEmail: mockFindOrCreateUserByEmail,
}))

// ---------------------------------------------------------------------------
// Build a minimal Hono app with auth routes mounted
// ---------------------------------------------------------------------------

import authRoutes from '../routes/auth'
import { createToken } from '../middleware/auth'

function buildApp() {
  const app = new Hono()
  app.route('/api/auth', authRoutes)
  return app
}

// ---------------------------------------------------------------------------
// Helper: generate a valid JWT for a test user
// ---------------------------------------------------------------------------

async function validToken(role: 'admin' | 'editor' | 'author' = 'author') {
  return createToken({ id: 'user-1', email: 'test@example.com', name: 'Test', role })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    mockVerifyPassword.mockReset()
  })

  test('valid credentials returns 200 with JWT', async () => {
    const app = buildApp()

    mockVerifyPassword.mockImplementation(async (email, _password) => ({
      id: 'user-1',
      email,
      name: 'Test User',
      role: 'author' as const,
      avatar: null,
      bio: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const res = await app.request('http://test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'correct-password' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(typeof body.data.token).toBe('string')
    expect(body.data.user.email).toBe('test@example.com')
  })

  test('wrong password returns 401', async () => {
    const app = buildApp()

    mockVerifyPassword.mockImplementation(async () => null)

    const res = await app.request('http://test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  test('unknown email returns 401', async () => {
    const app = buildApp()

    mockVerifyPassword.mockImplementation(async () => null)

    const res = await app.request('http://test/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'any-password' }),
    })

    expect(res.status).toBe(401)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })
})

describe('GET /api/auth/me', () => {
  test('without token returns 401', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/auth/me')

    expect(res.status).toBe(401)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  test('with valid token returns 200 and user data', async () => {
    const app = buildApp()
    const token = await validToken('admin')

    const res = await app.request('http://test/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.data.email).toBe('test@example.com')
  })
})

describe('POST /api/auth/magic-link', () => {
  beforeEach(() => {
    mockCreateMagicLinkToken.mockReset()
    mockCreateMagicLinkToken.mockImplementation(async () => 'mock-magic-token-abc')
  })

  test('with valid email returns 200 with message', async () => {
    const app = buildApp()
    // Ensure RESEND_API_KEY is absent so the code just logs the link instead of
    // calling the Resend API (which would fail in a unit-test environment).
    delete process.env.RESEND_API_KEY

    const res = await app.request('http://test/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(typeof body.data.message).toBe('string')
  })

  test('invalid email returns 400', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/magic-link/verify', () => {
  beforeEach(() => {
    mockConsumeMagicLinkToken.mockReset()
    mockFindOrCreateUserByEmail.mockReset()
    mockFindOrCreateUserByEmail.mockImplementation(async (email: string) => ({
      id: 'user-1',
      email,
      name: 'user',
      role: 'author' as const,
      avatar: null,
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  })

  test('invalid / missing token returns 400', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/auth/magic-link/verify')

    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  test('expired / already-used token returns 401', async () => {
    const app = buildApp()
    mockConsumeMagicLinkToken.mockImplementation(async () => null)

    const res = await app.request('http://test/api/auth/magic-link/verify?token=bad-token')

    expect(res.status).toBe(401)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  test('valid token returns 200 with JWT', async () => {
    const app = buildApp()
    mockConsumeMagicLinkToken.mockImplementation(async () => 'user@example.com')

    const res = await app.request('http://test/api/auth/magic-link/verify?token=valid-token')

    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(typeof body.data.token).toBe('string')
  })
})

describe('GET /api/auth/oauth/:provider — redirect to OAuth provider', () => {
  test('GET /api/auth/oauth/google redirects (302) to Google', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/auth/oauth/google')

    // Hono c.redirect() returns 302 by default
    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('accounts.google.com')
  })

  test('GET /api/auth/oauth/github redirects (302) to GitHub', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/auth/oauth/github')

    expect(res.status).toBe(302)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('github.com')
  })

  test('GET /api/auth/oauth/unknown returns 400', async () => {
    const app = buildApp()

    const res = await app.request('http://test/api/auth/oauth/twitter')

    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })
})
