import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { loginSchema } from '../../shared/validators'
import { verifyPassword } from '../services/user'
import { authMiddleware, createToken } from '../middleware/auth'
import {
  findOrCreateOAuthUser,
  createMagicLinkToken,
  consumeMagicLinkToken,
  findOrCreateUserByEmail,
} from '../services/oauth'
import type { AppEnv } from '../types'

const auth = new Hono<AppEnv>()

// ---------------------------------------------------------------------------
// Existing: email + password
// ---------------------------------------------------------------------------

// POST /login - authenticate and return JWT
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid('json')

    const user = await verifyPassword(email, password)
    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401)
    }

    const token = await createToken(user)

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ success: false, error: 'Login failed' }, 500)
  }
})

// POST /logout - invalidate session (client-side token removal)
auth.post('/logout', async (c) => {
  // Since we're using JWTs, logout is handled client-side by removing the token
  // This endpoint is here for completeness and future session management
  return c.json({ success: true, data: { message: 'Logged out successfully' } })
})

// GET /me - get current user (protected)
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user')

    return c.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ success: false, error: 'Failed to get user' }, 500)
  }
})

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

type OAuthProvider = 'google' | 'github'

function buildOAuthRedirectUrl(provider: OAuthProvider, callbackBase: string, state: string): string {
  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID || '',
      redirect_uri: `${callbackBase}/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  if (provider === 'github') {
    const params = new URLSearchParams({
      client_id: process.env.AUTH_GITHUB_ID || '',
      redirect_uri: `${callbackBase}/github/callback`,
      scope: 'user:email',
      state,
    })
    return `https://github.com/login/oauth/authorize?${params}`
  }

  throw new Error(`Unknown provider: ${provider}`)
}

async function exchangeGoogleCode(
  code: string,
  callbackBase: string
): Promise<{ accessToken: string; refreshToken?: string; profile: { id: string; email: string; name: string; avatar?: string } }> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.AUTH_GOOGLE_ID || '',
      client_secret: process.env.AUTH_GOOGLE_SECRET || '',
      redirect_uri: `${callbackBase}/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${await tokenRes.text()}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; refresh_token?: string }

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!userRes.ok) {
    throw new Error(`Google userinfo fetch failed: ${await userRes.text()}`)
  }

  const userInfo = (await userRes.json()) as { sub: string; email: string; name: string; picture?: string }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    profile: {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.picture,
    },
  }
}

async function exchangeGithubCode(
  code: string
): Promise<{ accessToken: string; profile: { id: string; email: string; name: string; avatar?: string } }> {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH_GITHUB_ID,
      client_secret: process.env.AUTH_GITHUB_SECRET,
      code,
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`GitHub token exchange failed: ${await tokenRes.text()}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token: string; error?: string }
  if (tokenData.error) {
    throw new Error(`GitHub token exchange error: ${tokenData.error}`)
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'scaffold-blog' },
  })

  if (!userRes.ok) {
    throw new Error(`GitHub user fetch failed: ${await userRes.text()}`)
  }

  const userInfo = (await userRes.json()) as { id: number; login: string; name?: string; avatar_url?: string; email?: string }

  // GitHub may not return a public email; fetch the primary verified email
  let email = userInfo.email
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'scaffold-blog' },
    })
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[]
      const primary = emails.find((e) => e.primary && e.verified)
      email = primary?.email ?? emails[0]?.email
    }
  }

  if (!email) {
    throw new Error('Could not retrieve email from GitHub account')
  }

  return {
    accessToken: tokenData.access_token,
    profile: {
      id: String(userInfo.id),
      email,
      name: userInfo.name || userInfo.login,
      avatar: userInfo.avatar_url,
    },
  }
}

// ---------------------------------------------------------------------------
// OAuth routes
// ---------------------------------------------------------------------------

// GET /oauth/:provider — redirect to provider's OAuth consent page
auth.get('/oauth/:provider', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider
  if (provider !== 'google' && provider !== 'github') {
    return c.json({ success: false, error: 'Unknown OAuth provider' }, 400)
  }

  const callbackBase = process.env.AUTH_CALLBACK_URL || `${process.env.API_URL || 'http://localhost:3000'}/api/auth/oauth`
  // Use a random state value for CSRF protection; in production consider storing it in a short-lived cookie/session
  const state = crypto.randomUUID()

  const redirectUrl = buildOAuthRedirectUrl(provider, callbackBase, state)
  return c.redirect(redirectUrl)
})

// GET /oauth/:provider/callback — handle provider callback, issue JWT
auth.get('/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider
  if (provider !== 'google' && provider !== 'github') {
    return c.json({ success: false, error: 'Unknown OAuth provider' }, 400)
  }

  const code = c.req.query('code')
  const error = c.req.query('error')

  if (error) {
    return c.json({ success: false, error: `OAuth error: ${error}` }, 400)
  }

  if (!code) {
    return c.json({ success: false, error: 'Missing authorization code' }, 400)
  }

  try {
    const callbackBase = process.env.AUTH_CALLBACK_URL || `${process.env.API_URL || 'http://localhost:3000'}/api/auth/oauth`

    let providerUserId: string
    let profile: { email: string; name: string; avatar?: string }
    let accessToken: string
    let refreshToken: string | undefined

    if (provider === 'google') {
      const result = await exchangeGoogleCode(code, callbackBase)
      providerUserId = result.profile.id
      profile = result.profile
      accessToken = result.accessToken
      refreshToken = result.refreshToken
    } else {
      const result = await exchangeGithubCode(code)
      providerUserId = result.profile.id
      profile = result.profile
      accessToken = result.accessToken
    }

    const user = await findOrCreateOAuthUser(provider, providerUserId, profile, { accessToken, refreshToken })
    const token = await createToken(user)

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    })
  } catch (err) {
    console.error(`OAuth callback error (${provider}):`, err)
    return c.json({ success: false, error: 'OAuth authentication failed' }, 500)
  }
})

// ---------------------------------------------------------------------------
// Magic link routes
// ---------------------------------------------------------------------------

const magicLinkRequestSchema = z.object({
  email: z.string().email(),
})

// POST /magic-link — generate token and send email
auth.post('/magic-link', zValidator('json', magicLinkRequestSchema), async (c) => {
  const { email } = c.req.valid('json')

  try {
    const token = await createMagicLinkToken(email)
    const baseUrl = process.env.API_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/auth/magic-link/verify?token=${token}`

    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.AUTH_EMAIL_FROM || 'noreply@example.com'

    if (!resendApiKey) {
      // In development without Resend configured, log the link instead of failing
      console.log(`[Magic Link] Verify URL for ${email}: ${verifyUrl}`)
    } else {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: 'Your magic sign-in link',
          html: `
            <p>Click the link below to sign in. This link expires in 15 minutes.</p>
            <p><a href="${verifyUrl}">${verifyUrl}</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `,
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Resend email error:', errText)
        return c.json({ success: false, error: 'Failed to send magic link email' }, 500)
      }
    }

    return c.json({ success: true, data: { message: 'Check your email for your sign-in link' } })
  } catch (err) {
    console.error('Magic link error:', err)
    return c.json({ success: false, error: 'Failed to generate magic link' }, 500)
  }
})

// GET /magic-link/verify?token=xxx — verify token and issue JWT
auth.get('/magic-link/verify', async (c) => {
  const token = c.req.query('token')
  if (!token) {
    return c.json({ success: false, error: 'Missing token' }, 400)
  }

  try {
    const email = await consumeMagicLinkToken(token)
    if (!email) {
      return c.json({ success: false, error: 'Invalid or expired magic link' }, 401)
    }

    const user = await findOrCreateUserByEmail(email)
    const jwt = await createToken(user)

    return c.json({
      success: true,
      data: {
        token: jwt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    })
  } catch (err) {
    console.error('Magic link verify error:', err)
    return c.json({ success: false, error: 'Magic link verification failed' }, 500)
  }
})

export default auth
