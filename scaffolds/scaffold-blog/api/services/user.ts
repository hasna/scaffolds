import { findOne, findMany, run, generateId, now } from '../db'
import type { User } from '../../shared/types'
import type { CreateUserInput } from '../../shared/validators'
import bcrypt from 'bcrypt'

interface UserRow {
  id: string
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'editor' | 'author'
  avatar: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

function rowToUser(row: UserRow): User {
  return {
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

export async function getAllUsers(): Promise<User[]> {
  const rows = await findMany<UserRow>('SELECT * FROM users ORDER BY created_at DESC')
  return rows.map(rowToUser)
}

export async function getUserById(id: string): Promise<User | null> {
  const row = await findOne<UserRow>('SELECT * FROM users WHERE id = $1', [id])
  if (!row) return null
  return rowToUser(row)
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const row = await findOne<UserRow>('SELECT * FROM users WHERE email = $1', [email])
  if (!row) return null
  return rowToUser(row)
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const id = generateId()
  const timestamp = now()
  const passwordHash = await bcrypt.hash(data.password, 10)

  await run(
    'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, data.email, passwordHash, data.name, data.role || 'author', timestamp, timestamp]
  )

  const user = await getUserById(id)
  if (!user) throw new Error('Failed to create user')
  return user
}

export async function updateUser(
  id: string,
  data: Partial<{ email: string; name: string; role: 'admin' | 'editor' | 'author'; bio: string; avatar: string }>
): Promise<User | null> {
  const existing = await getUserById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`)
    params.push(data.email)
  }

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`)
    params.push(data.name)
  }

  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`)
    params.push(data.role)
  }

  if (data.bio !== undefined) {
    updates.push(`bio = $${paramIndex++}`)
    params.push(data.bio)
  }

  if (data.avatar !== undefined) {
    updates.push(`avatar = $${paramIndex++}`)
    params.push(data.avatar)
  }

  updates.push(`updated_at = $${paramIndex++}`)
  params.push(now())

  if (updates.length > 0) {
    params.push(id)
    await run(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params)
  }

  return getUserById(id)
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await run('DELETE FROM users WHERE id = $1', [id])
  return result.rowCount > 0
}

export async function verifyPassword(email: string, password: string): Promise<User | null> {
  const row = await findOne<UserRow>('SELECT * FROM users WHERE email = $1', [email])
  if (!row) return null

  const isValid = await bcrypt.compare(password, row.password_hash)
  if (!isValid) return null

  return rowToUser(row)
}
