import { findOne, findMany, run, generateId, now } from '../db'
import type { User } from '../../shared/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OAuthAccountRow {
  id: string
  user_id: string
  provider: string
  provider_user_id: string
  access_token: string | null
  refresh_token: string | null
  created_at: string
}

interface MagicLinkTokenRow {
  id: string
  email: string
  token: string
  expires_at: string
  used_at: string | null
  created_at: string
}

interface UserRow {
  id: string
  email: string
  password_hash: string | null
  name: string
  role: 'admin' | 'editor' | 'author'
  avatar: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Find or create a user from an OAuth callback. Matches by email first so
 * that an existing email+password account can link to OAuth without duplication.
 */
export async function findOrCreateOAuthUser(
  provider: 'google' | 'github',
  providerUserId: string,
  profile: { email: string; name: string; avatar?: string },
  tokens: { accessToken?: string; refreshToken?: string }
): Promise<UserRow> {
  // 1. Try to find an existing oauth_account for this provider + provider_user_id
  const existingAccount = await findOne<OAuthAccountRow>(
    'SELECT * FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2',
    [provider, providerUserId]
  )

  if (existingAccount) {
    // Update access/refresh tokens
    await run(
      'UPDATE oauth_accounts SET access_token = $1, refresh_token = $2 WHERE id = $3',
      [tokens.accessToken ?? null, tokens.refreshToken ?? null, existingAccount.id]
    )
    const user = await findOne<UserRow>('SELECT * FROM users WHERE id = $1', [existingAccount.user_id])
    if (!user) throw new Error('OAuth user not found after account lookup')
    return user
  }

  // 2. Try to find an existing user by email (link the OAuth account to it)
  let user = await findOne<UserRow>('SELECT * FROM users WHERE email = $1', [profile.email])

  if (!user) {
    // 3. Create a new user (no password — OAuth-only)
    const userId = generateId()
    const timestamp = now()
    await run(
      'INSERT INTO users (id, email, password_hash, name, role, avatar, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [userId, profile.email, null, profile.name, 'author', profile.avatar ?? null, timestamp, timestamp]
    )
    user = await findOne<UserRow>('SELECT * FROM users WHERE id = $1', [userId])
    if (!user) throw new Error('Failed to create OAuth user')
  }

  // 4. Link the OAuth account
  await run(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, access_token, refresh_token) VALUES ($1, $2, $3, $4, $5, $6)',
    [generateId(), user.id, provider, providerUserId, tokens.accessToken ?? null, tokens.refreshToken ?? null]
  )

  return user
}

// ---------------------------------------------------------------------------
// Magic link helpers
// ---------------------------------------------------------------------------

/** Store a new magic link token (15-minute expiry). */
export async function createMagicLinkToken(email: string): Promise<string> {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  const id = generateId()

  await run(
    'INSERT INTO magic_link_tokens (id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
    [id, email, token, expiresAt]
  )

  return token
}

/**
 * Consume a magic link token. Returns the email address if valid and unused,
 * otherwise returns null.
 */
export async function consumeMagicLinkToken(token: string): Promise<string | null> {
  const row = await findOne<MagicLinkTokenRow>(
    'SELECT * FROM magic_link_tokens WHERE token = $1',
    [token]
  )

  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at) < new Date()) return null

  // Mark the token as used
  await run('UPDATE magic_link_tokens SET used_at = $1 WHERE id = $2', [now(), row.id])

  return row.email
}

/**
 * Find or create a user by email (used after magic link verification).
 * Users who sign up via magic link get an 'author' role and no password.
 */
export async function findOrCreateUserByEmail(email: string, name?: string): Promise<UserRow> {
  const existing = await findOne<UserRow>('SELECT * FROM users WHERE email = $1', [email])
  if (existing) return existing

  const userId = generateId()
  const timestamp = now()
  await run(
    'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [userId, email, null, name ?? email.split('@')[0], 'author', timestamp, timestamp]
  )

  const user = await findOne<UserRow>('SELECT * FROM users WHERE id = $1', [userId])
  if (!user) throw new Error('Failed to create user via magic link')
  return user
}
