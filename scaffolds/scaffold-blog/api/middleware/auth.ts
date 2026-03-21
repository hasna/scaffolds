import { Context, Next } from 'hono'
import { jwtVerify } from 'jose'
import type { AuthUser, JWTPayload } from '../../shared/types'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production')

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const user: AuthUser = {
      id: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'admin' | 'editor' | 'author',
    }
    c.set('user', user)
    await next()
  } catch {
    return c.json({ success: false, error: 'Invalid token' }, 401)
  }
}

export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const token = authHeader.slice(7)
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      const user: AuthUser = {
        id: payload.userId as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as 'admin' | 'editor' | 'author',
      }
      c.set('user', user)
    } catch {
      return c.json({ success: false, error: 'Invalid token' }, 401)
    }
  }

  await next()
}

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined

    if (!user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    if (!roles.includes(user.role)) {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    await next()
  }
}

export async function createToken(user: { id: string; email: string; name: string; role: string }): Promise<string> {
  const { SignJWT } = await import('jose')

  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}
