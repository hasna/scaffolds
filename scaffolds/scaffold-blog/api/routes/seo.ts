import { Hono } from 'hono'
import { getAllPosts } from '../services/post'
import { getPublishedPages } from '../services/page'
import { getAllCategories } from '../services/category'
import { getAllTags } from '../services/tag'
import { getPublicSettings } from '../services/settings'

const seo = new Hono()

// GET /sitemap.xml - dynamic sitemap
seo.get('/sitemap.xml', async (c) => {
  try {
    const settings = await getPublicSettings()
    const siteUrl = (settings.siteUrl as string) || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}`

    // Fetch all content
    const [postsResult, pages, categories, tags] = await Promise.all([
      getAllPosts({ status: 'published', pageSize: 1000 }),
      getPublishedPages(),
      getAllCategories(),
      getAllTags(),
    ])

    const posts = postsResult.data || []
    const today = new Date().toISOString().split('T')[0]

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Homepage -->
  <url>
    <loc>${siteUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`

    // Add posts
    for (const post of posts) {
      const lastmod = post.updatedAt || post.publishedAt || today
      const dateStr = formatDate(lastmod)
      xml += `  <url>
    <loc>${siteUrl}/post/${post.slug}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`

      // Add featured image if available
      if (post.featuredImage) {
        xml += `
    <image:image>
      <image:loc>${post.featuredImage.startsWith('http') ? post.featuredImage : `${siteUrl}${post.featuredImage}`}</image:loc>
      <image:title>${escapeXml(post.title)}</image:title>
    </image:image>`
      }

      xml += `
  </url>
`
    }

    // Add pages
    for (const page of pages) {
      const lastmod = page.updatedAt || page.createdAt || today
      const dateStr = formatDate(lastmod)
      xml += `  <url>
    <loc>${siteUrl}/page/${page.slug}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`
    }

    // Add categories
    for (const category of categories) {
      xml += `  <url>
    <loc>${siteUrl}/category/${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
`
    }

    // Add tags
    for (const tag of tags) {
      xml += `  <url>
    <loc>${siteUrl}/tag/${tag.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.4</priority>
  </url>
`
    }

    xml += `</urlset>`

    return c.text(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return c.text('Error generating sitemap', 500)
  }
})

// GET /robots.txt - robots.txt file
seo.get('/robots.txt', async (c) => {
  try {
    const settings = await getPublicSettings()
    const siteUrl = (settings.siteUrl as string) || `${c.req.header('x-forwarded-proto') || 'https'}://${c.req.header('host')}`

    const robotsTxt = `# robots.txt for ${settings.siteName || 'Blog'}
User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /login

# Sitemap location
Sitemap: ${siteUrl}/sitemap.xml

# Crawl delay (optional, be nice to the server)
Crawl-delay: 1
`

    return c.text(robotsTxt, 200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    })
  } catch (error) {
    console.error('Robots.txt generation error:', error)
    return c.text('User-agent: *\nAllow: /', 200, {
      'Content-Type': 'text/plain; charset=utf-8',
    })
  }
})

// Helper function to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Helper function to format date to YYYY-MM-DD
function formatDate(date: string | Date | undefined | null): string {
  if (!date) {
    return new Date().toISOString().split('T')[0]
  }
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]
  }
  if (typeof date === 'string') {
    // Handle ISO string format
    if (date.includes('T')) {
      return date.split('T')[0]
    }
    // Already in YYYY-MM-DD format
    return date
  }
  return new Date().toISOString().split('T')[0]
}

export default seo
