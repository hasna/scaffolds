import { findOne, findMany, run, generateId, now } from './index'
import bcrypt from 'bcrypt'

const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@engine-blog.local',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  name: 'Admin',
  role: 'admin' as const,
}

const DEFAULT_AI_AUTHOR = {
  email: process.env.AI_AUTHOR_EMAIL || 'ai@engine-blog.local',
  password: process.env.AI_AUTHOR_PASSWORD || generateId(),
  name: process.env.AI_AUTHOR_NAME || 'Engine AI',
  role: 'author' as const,
}

export async function seedDatabase(): Promise<void> {
  await seedAdminUser()
  await seedDefaultCategories()
  await seedAiAuthorUser()
  await backfillPostAuthors()
  await seedDefaultSettings()
}

async function seedDefaultCategories(): Promise<void> {
  const categories = [
    { name: 'Technology', slug: 'technology', description: 'Posts about technology and software' },
    { name: 'Business', slug: 'business', description: 'Business and entrepreneurship topics' },
    { name: 'Lifestyle', slug: 'lifestyle', description: 'Lifestyle and personal development' },
    { name: 'Design', slug: 'design', description: 'Design systems, UI, UX, and visual craft' },
    { name: 'Marketing', slug: 'marketing', description: 'Growth, content, and distribution strategies' },
    { name: 'Product', slug: 'product', description: 'Product building, strategy, and shipping' },
    { name: 'AI & Automation', slug: 'ai-automation', description: 'AI workflows, automation, and tooling' },
    { name: 'Engineering', slug: 'engineering', description: 'Architecture, performance, and engineering practice' },
    { name: 'Security', slug: 'security', description: 'Security, privacy, and best practices' },
    { name: 'Tutorials', slug: 'tutorials', description: 'Step-by-step guides and how-tos' },
    { name: 'News', slug: 'news', description: 'Announcements and updates' },
  ]

  for (const category of categories) {
    await run(
      'INSERT INTO categories (id, name, slug, description, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING',
      [generateId(), category.name, category.slug, category.description, now()]
    )
  }
}

async function seedAdminUser(): Promise<void> {
  console.log('Checking for admin user...')

  // Check if any admin user exists
  const existingAdmins = await findMany<{ id: string }>(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  )

  if (existingAdmins.length > 0) {
    console.log('Admin user already exists')
    return
  }

  console.log('Creating default admin user...')

  const id = generateId()
  const timestamp = now()
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10)

  await run(
    'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, DEFAULT_ADMIN.email, passwordHash, DEFAULT_ADMIN.name, DEFAULT_ADMIN.role, timestamp, timestamp]
  )

  console.log('Default admin user created:')
  console.log(`  Email: ${DEFAULT_ADMIN.email}`)
  console.log(`  Password: ${DEFAULT_ADMIN.password}`)
  console.log('  (Change the password in production!)')
}

async function seedAiAuthorUser(): Promise<void> {
  const existing = await findOne<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [DEFAULT_AI_AUTHOR.email])
  if (existing) return

  const id = generateId()
  const timestamp = now()
  const passwordHash = await bcrypt.hash(DEFAULT_AI_AUTHOR.password, 10)

  await run(
    'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, DEFAULT_AI_AUTHOR.email, passwordHash, DEFAULT_AI_AUTHOR.name, DEFAULT_AI_AUTHOR.role, timestamp, timestamp]
  )
}

async function backfillPostAuthors(): Promise<void> {
  const admin = await findOne<{ id: string }>("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
  const aiAuthor = await findOne<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [DEFAULT_AI_AUTHOR.email])
  if (!admin) return

  if (aiAuthor) {
    await run(
      "UPDATE posts SET author_id = $1 WHERE author_id IS NULL AND ai_generated = TRUE",
      [aiAuthor.id]
    )
  }

  await run(
    'UPDATE posts SET author_id = $1 WHERE author_id IS NULL',
    [admin.id]
  )
}

async function seedDefaultSettings(): Promise<void> {
  console.log('Checking settings...')

  // Get site name and description from environment or defaults
  const siteName = process.env.SITE_NAME || 'Engine Blog'
  const siteDescription = process.env.SITE_DESCRIPTION || 'A modern blog powered by AI'
  const siteUrl = process.env.SITE_URL || ''

  const settings = [
    { key: 'siteName', value: JSON.stringify(siteName) },
    { key: 'siteDescription', value: JSON.stringify(siteDescription) },
    { key: 'siteUrl', value: JSON.stringify(siteUrl) },
    { key: 'postsPerPage', value: '10' },
    { key: 'allowComments', value: 'true' },
    { key: 'moderateComments', value: 'true' },
  ]

  for (const setting of settings) {
    const existing = await findOne<{ key: string }>(
      'SELECT key FROM settings WHERE key = $1',
      [setting.key]
    )

    if (!existing) {
      const timestamp = now()
      await run(
        'INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)',
        [setting.key, setting.value, timestamp]
      )
      console.log(`  Setting '${setting.key}' initialized`)
    }
  }

  console.log('Settings checked')
}
