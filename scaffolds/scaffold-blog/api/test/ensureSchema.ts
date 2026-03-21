import { getPool } from '../db'
import { schema } from '../db/schema'

let ensured: Promise<void> | null = null

export async function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const pool = getPool()
      await pool.query(schema)
    })()
  }
  await ensured
}

