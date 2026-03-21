import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import path from 'node:path'
import { mkdir, stat } from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'
import type { AppEnv } from '../types'

const images = new Hono<AppEnv>()

const resizeQuerySchema = z.object({
  path: z.string().min(1),
  w: z.coerce.number().int().min(200).max(2400).default(1200),
  q: z.coerce.number().int().min(40).max(95).default(82),
  format: z.enum(['webp', 'jpeg', 'png']).default('webp'),
})

function isSafeUploadsPath(p: string): boolean {
  if (!p.startsWith('/uploads/')) return false
  if (p.includes('..')) return false
  if (p.includes('\\')) return false
  return true
}

function getCacheKey(input: { path: string; w: number; q: number; format: string }): string {
  const raw = JSON.stringify(input)
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

// GET /api/images/resize?path=/uploads/foo.png&w=1200&q=82&format=webp
images.get('/resize', zValidator('query', resizeQuerySchema), async (c) => {
  try {
    const q = c.req.valid('query')
    if (!isSafeUploadsPath(q.path)) {
      return c.json({ success: false, error: 'Invalid image path' }, 400)
    }

    const absolute = path.resolve('.', q.path.replace(/^\//, ''))
    // Ensure the resolved path is still under uploads
    const uploadsRoot = path.resolve('.', 'uploads')
    if (!absolute.startsWith(uploadsRoot + path.sep)) {
      return c.json({ success: false, error: 'Invalid image path' }, 400)
    }

    // Ensure source exists
    await stat(absolute)

    const cacheDir = path.resolve('.', 'uploads', 'cache')
    await mkdir(cacheDir, { recursive: true })

    const key = getCacheKey({ path: q.path, w: q.w, q: q.q, format: q.format })
    const cached = path.join(cacheDir, `${key}.${q.format}`)

    try {
      await stat(cached)
      const file = Bun.file(cached)
      c.header('Content-Type', `image/${q.format === 'jpeg' ? 'jpeg' : q.format}`)
      c.header('Cache-Control', 'public, max-age=31536000, immutable')
      return c.body(file)
    } catch {
      // cache miss, continue
    }

    const buffer = await Bun.file(absolute).arrayBuffer()

    let pipeline = sharp(Buffer.from(buffer))
      .rotate()
      .resize({
        width: q.w,
        withoutEnlargement: true,
      })

    if (q.format === 'webp') {
      pipeline = pipeline.webp({ quality: q.q })
    } else if (q.format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality: q.q, mozjpeg: true })
    } else {
      pipeline = pipeline.png({ quality: q.q })
    }

    const out = await pipeline.toBuffer()
    await Bun.write(cached, out)

    c.header('Content-Type', `image/${q.format === 'jpeg' ? 'jpeg' : q.format}`)
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return c.body(out)
  } catch (error) {
    console.error('Image resize error:', error)
    return c.json({ success: false, error: 'Failed to resize image' }, 500)
  }
})

export default images

