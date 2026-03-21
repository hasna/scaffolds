export function getPreviewUrl(href: string, baseUrl: string): string | null {
  const raw = (href || '').trim()
  if (!raw) return null

  // Allow same-page anchors
  if (raw.startsWith('#')) return null

  // Allow in-app routes
  if (raw.startsWith('/')) return null

  // Allow mail/phone links
  const lower = raw.toLowerCase()
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return null

  let url: URL
  try {
    url = new URL(raw, baseUrl)
  } catch {
    return null
  }

  // Only preview external links
  try {
    const base = new URL(baseUrl)
    if (url.origin === base.origin) return null
  } catch {
    // ignore
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  return url.toString()
}

