import { Pool, PoolClient } from 'pg'
import { schema, seedData } from './schema'

let pool: Pool | null = null

function getConnectionConfig() {
  // Prefer DATABASE_URL when present (allows easy local override even if DB_HOST is set)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  }

  // Check for AWS Secrets Manager credentials first
  if (process.env.DB_HOST) {
    return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'engine_blog',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  }

  throw new Error('Database configuration not found. Set DB_HOST or DATABASE_URL environment variables.')
}

export function getPool(): Pool {
  if (!pool) {
    const config = getConnectionConfig()
    pool = new Pool({
      ...config,
      max: 20,
      min: 5,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
    })

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err)
    })
  }
  return pool
}

export async function getDb(): Promise<PoolClient> {
  const p = getPool()
  return p.connect()
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export async function initializeDb(): Promise<void> {
  const p = getPool()

  // Pre-warm connections
  console.log('Warming up database connections...')
  const warmupQueries = Array(5).fill(null).map(() => p.query('SELECT 1'))
  await Promise.all(warmupQueries)
  console.log('Database connections warmed up')

  // Initialize schema
  await p.query(schema)
  console.log('Database schema initialized')
}

export async function seedDb(): Promise<void> {
  const p = getPool()
  await p.query(seedData)
  console.log('Database seeded successfully')
}

// Helper functions for common operations
export function generateId(): string {
  return crypto.randomUUID()
}

export function now(): string {
  return new Date().toISOString()
}

// Generic query helpers - use pool.query() directly for efficiency
export async function findOne<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const p = getPool()
  const result = await p.query(sql, params)
  return result.rows[0] as T | undefined
}

export async function findMany<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const p = getPool()
  const result = await p.query(sql, params)
  return result.rows as T[]
}

export interface RunResult {
  rowCount: number
}

export async function run(sql: string, params: unknown[] = []): Promise<RunResult> {
  const p = getPool()
  const result = await p.query(sql, params)
  return { rowCount: result.rowCount || 0 }
}

export async function count(sql: string, params: unknown[] = []): Promise<number> {
  const p = getPool()
  const result = await p.query(sql, params)
  return parseInt(result.rows[0]?.count || '0')
}

// Transaction helper - needs dedicated client
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDb()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
