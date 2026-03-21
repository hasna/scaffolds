type ImageFormat = 'webp' | 'jpeg' | 'png'

function getBaseOrigin(explicit?: string): string | null {
  if (explicit) return explicit
  if (typeof window === 'undefined') return null
  return window.location.origin
}

function getSameOriginUploadsPath(src: string, baseOrigin: string): string | null {
  if (!src) return null
  let url: URL
  try {
    url = new URL(src, baseOrigin)
  } catch {
    return null
  }

  if (url.origin !== baseOrigin) return null
  if (!url.pathname.startsWith('/uploads/')) return null
  if (url.pathname.includes('..') || url.pathname.includes('\\')) return null

  return url.pathname
}

export function getResizedUploadsImageUrl(
  src: string,
  opts?: { width?: number; quality?: number; format?: ImageFormat; baseOrigin?: string }
): string {
  const baseOrigin = getBaseOrigin(opts?.baseOrigin)
  if (!baseOrigin) return src

  const uploadsPath = getSameOriginUploadsPath(src, baseOrigin)
  if (!uploadsPath) return src

  const width = opts?.width ?? 1200
  const quality = opts?.quality ?? 82
  const format = opts?.format ?? 'webp'

  const params = new URLSearchParams()
  params.set('path', uploadsPath)
  params.set('w', String(width))
  params.set('q', String(quality))
  params.set('format', format)

  return `/api/images/resize?${params.toString()}`
}

export function getResizedUploadsImageSrcSet(
  src: string,
  widths: number[],
  opts?: { quality?: number; format?: ImageFormat; baseOrigin?: string }
): string | undefined {
  const baseOrigin = getBaseOrigin(opts?.baseOrigin)
  if (!baseOrigin) return undefined

  const uploadsPath = getSameOriginUploadsPath(src, baseOrigin)
  if (!uploadsPath) return undefined

  const quality = opts?.quality ?? 82
  const format = opts?.format ?? 'webp'

  const entries = widths
    .filter((w) => Number.isFinite(w) && w > 0)
    .map((w) => {
      const params = new URLSearchParams()
      params.set('path', uploadsPath)
      params.set('w', String(w))
      params.set('q', String(quality))
      params.set('format', format)
      return `/api/images/resize?${params.toString()} ${w}w`
    })

  return entries.length > 0 ? entries.join(', ') : undefined
}

