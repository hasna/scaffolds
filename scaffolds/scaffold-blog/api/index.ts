import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { initializeDb } from './db'
import { seedDatabase } from './db/seed'
import authRoutes from './routes/auth'
import postsRoutes from './routes/posts'
import categoriesRoutes from './routes/categories'
import tagsRoutes from './routes/tags'
import commentsRoutes from './routes/comments'
import mediaRoutes from './routes/media'
import imagesRoutes from './routes/images'
import usersRoutes from './routes/users'
import settingsRoutes from './routes/settings'
import aiRoutes from './routes/ai'
import pagesRoutes from './routes/pages'
import newsletterRoutes from './routes/newsletter'
import adminRoutes from './routes/admin'
import seoRoutes from './routes/seo'
import { initScheduler } from './ai/scheduler'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3030'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// SEO routes (sitemap.xml, robots.txt) at root level
app.route('/', seoRoutes)

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }))

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  // Serve static assets from web/dist
  app.use('/assets/*', serveStatic({ root: './web/dist' }))
  app.use('/vite.svg', serveStatic({ root: './web/dist', path: '/vite.svg' }))
}

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/posts', postsRoutes)
app.route('/api/categories', categoriesRoutes)
app.route('/api/tags', tagsRoutes)
app.route('/api/comments', commentsRoutes)
app.route('/api/media', mediaRoutes)
app.route('/api/images', imagesRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/pages', pagesRoutes)
app.route('/api/newsletter', newsletterRoutes)
app.route('/api/admin', adminRoutes)

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ success: false, error: err.message }, 500)
})

// 404 handler - In production, serve index.html for client-side routing
app.notFound(async (c) => {
  // If it's an API request, return JSON error
  if (c.req.path.startsWith('/api/')) {
    return c.json({ success: false, error: 'Not found' }, 404)
  }

  // In production, serve the frontend for all other routes (SPA routing)
  if (process.env.NODE_ENV === 'production') {
    try {
      const indexHtml = await Bun.file('./web/dist/index.html').text()
      return c.html(indexHtml)
    } catch {
      return c.json({ success: false, error: 'Not found' }, 404)
    }
  }

  return c.json({ success: false, error: 'Not found' }, 404)
})

// Initialize database
async function init() {
  try {
    await initializeDb()
    console.log('Database initialized')

    // Seed default data
    await seedDatabase()
  } catch (error) {
    console.error('Database initialization failed:', error)
    // Fail fast so the app doesn't run with a broken DB connection (causes confusing 500s)
    process.exit(1)
  }

  // Initialize AI scheduler
  await initScheduler()
}

init()

const port = parseInt(process.env.PORT || '8030')
console.log(`Server running on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
