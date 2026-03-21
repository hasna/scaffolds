import { findOne, findMany, run, generateId, now } from '../db'
import type { Media } from '../../shared/types'

interface MediaRow {
  id: string
  filename: string
  path: string
  mime_type: string | null
  size: number | null
  alt_text: string | null
  uploaded_by: string | null
  created_at: string
}

function rowToMedia(row: MediaRow): Media {
  return {
    id: row.id,
    filename: row.filename,
    path: row.path,
    mimeType: row.mime_type,
    size: row.size,
    altText: row.alt_text,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  }
}

export async function getAllMedia(): Promise<Media[]> {
  const rows = await findMany<MediaRow>('SELECT * FROM media ORDER BY created_at DESC')
  return rows.map(rowToMedia)
}

export async function getMediaById(id: string): Promise<Media | null> {
  const row = await findOne<MediaRow>('SELECT * FROM media WHERE id = $1', [id])
  if (!row) return null
  return rowToMedia(row)
}

export async function createMedia(data: {
  filename: string
  path: string
  mimeType?: string
  size?: number
  altText?: string
  uploadedBy?: string
}): Promise<Media> {
  const id = generateId()
  const timestamp = now()

  await run(
    'INSERT INTO media (id, filename, path, mime_type, size, alt_text, uploaded_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      id,
      data.filename,
      data.path,
      data.mimeType || null,
      data.size || null,
      data.altText || null,
      data.uploadedBy || null,
      timestamp,
    ]
  )

  const media = await getMediaById(id)
  if (!media) throw new Error('Failed to create media')
  return media
}

export async function deleteMedia(id: string): Promise<boolean> {
  const result = await run('DELETE FROM media WHERE id = $1', [id])
  return result.rowCount > 0
}
