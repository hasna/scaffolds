import path from 'node:path'
import { readdir, mkdir, stat } from 'node:fs/promises'
import crypto from 'node:crypto'
import sharp from 'sharp'

const DEFAULT_WIDTHS = [600, 900, 1200, 1600]
const DEFAULT_QUALITY = 82
const DEFAULT_FORMAT: 'webp' = 'webp'

async function* walkUploads(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === 'cache') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkUploads(full)
    } else {
      yield full
    }
  }
}

function isImageFile(file: string): boolean {
  const ext = path.extname(file).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.avif'].includes(ext)
}

function getCacheKey(input: { path: string; w: number; q: number; format: string }): string {
  const raw = JSON.stringify(input)
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32)
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const uploadsRoot = path.resolve('.', 'uploads')
  const cacheDir = path.resolve('.', 'uploads', 'cache')
  await mkdir(cacheDir, { recursive: true })

  const widths = DEFAULT_WIDTHS
  const quality = DEFAULT_QUALITY
  const format = DEFAULT_FORMAT

  let processed = 0
  let generated = 0

  for await (const file of walkUploads(uploadsRoot)) {
    if (!isImageFile(file)) continue

    const rel = path.relative(uploadsRoot, file).split(path.sep).join('/')
    const uploadsPath = `/uploads/${rel}`

    const buffer = await Bun.file(file).arrayBuffer()
    const input = Buffer.from(buffer)

    for (const w of widths) {
      const key = getCacheKey({ path: uploadsPath, w, q: quality, format })
      const outPath = path.join(cacheDir, `${key}.${format}`)
      processed++
      if (await fileExists(outPath)) continue

      const out = await sharp(input)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()

      await Bun.write(outPath, out)
      generated++
    }
  }

  console.log(`Image cache warm complete: checked ${processed}, generated ${generated}`)
}

await main()

