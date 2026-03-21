import { apiRequest, formatTable, log, error, success } from '../lib/api'
import type { AISchedule, AIGeneration } from '../../shared/types'

interface GenerationResult {
  postId: string
  title: string
  slug: string
  status: string
  generationId: string
}

export async function generate(options: {
  topic?: string
  keywords?: string
  tone?: string
  length?: string
  publish?: boolean
}): Promise<void> {
  log('Generating article...')

  const result = await apiRequest<GenerationResult>('/api/ai/generate', {
    method: 'POST',
    body: {
      topic: options.topic,
      keywords: options.keywords?.split(',').map((k) => k.trim()),
      tone: options.tone || 'professional',
      length: options.length || 'medium',
      autoPublish: options.publish || false,
    },
  })

  if (!result.success) {
    error(result.error || 'Generation failed')
    return
  }

  success('Article generated!')
  log(`Title: ${result.data?.title}`)
  log(`Slug: ${result.data?.slug}`)
  log(`Status: ${result.data?.status}`)
  log(`Post ID: ${result.data?.postId}`)
}

export async function siteDescription(options: {
  prompt: string
  tone?: string
  maxChars?: number
  json?: boolean
}): Promise<void> {
  const result = await apiRequest<{ siteDescription: string }>('/api/ai/site-description', {
    method: 'POST',
    body: {
      prompt: options.prompt,
      tone: options.tone || 'professional',
      maxChars: options.maxChars || 200,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to generate site description')
    return
  }

  if (options.json) {
    log(JSON.stringify(result.data, null, 2))
    return
  }

  success('Site description updated!')
  log(result.data?.siteDescription || '')
}

export async function categories(options: {
  prompt: string
  tone?: string
  count?: number
  apply?: boolean
  json?: boolean
}): Promise<void> {
  const result = await apiRequest<{
    applied: boolean
    created: number
    updated: number
    categories: Array<{
      id?: string
      name: string
      slug: string
      description?: string | null
    }>
  }>('/api/ai/categories', {
    method: 'POST',
    body: {
      prompt: options.prompt,
      tone: options.tone || 'professional',
      count: options.count || 10,
      apply: options.apply !== false,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to generate categories')
    return
  }

  if (options.json) {
    log(JSON.stringify(result.data, null, 2))
    return
  }

  const data = result.data
  if (!data) {
    error('No data returned')
    return
  }

  if (data.applied) {
    success(`Categories updated (created ${data.created}, updated ${data.updated})`)
  } else {
    success(`Generated ${data.categories.length} categories (preview)`)
  }

  log(
    formatTable(
      (data.categories || []).map((c) => ({
        name: c.name.slice(0, 24),
        slug: c.slug,
        description: (c.description || '').slice(0, 40),
      })),
      [
        { key: 'name', label: 'Name', width: 24 },
        { key: 'slug', label: 'Slug', width: 18 },
        { key: 'description', label: 'Description', width: 40 },
      ]
    )
  )
}

export async function logo(options: {
  prompt: string
  style?: string
  json?: boolean
}): Promise<void> {
  const result = await apiRequest<{ logoUrl: string; faviconUrl: string }>('/api/ai/logo', {
    method: 'POST',
    body: {
      prompt: options.prompt,
      style: options.style,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to generate logo')
    return
  }

  if (options.json) {
    log(JSON.stringify(result.data, null, 2))
    return
  }

  success('Logo updated!')
  log(`Logo: ${result.data?.logoUrl}`)
  log(`Favicon: ${result.data?.faviconUrl}`)
}

export async function authorAvatar(options: {
  userId: string
  prompt?: string
  json?: boolean
}): Promise<void> {
  const result = await apiRequest<{ user?: any; avatarUrl: string }>(`/api/ai/users/${options.userId}/avatar`, {
    method: 'POST',
    body: {
      prompt: options.prompt,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to generate author avatar')
    return
  }

  if (options.json) {
    log(JSON.stringify(result.data, null, 2))
    return
  }

  success('Author avatar updated!')
  log(`Avatar: ${result.data?.avatarUrl}`)
}

export async function history(options: {
  limit?: number
  json?: boolean
}): Promise<void> {
  const limit = options.limit || 20
  const result = await apiRequest<AIGeneration[]>(`/api/ai/history?limit=${limit}`)

  if (!result.success) {
    error(result.error || 'Failed to fetch history')
    return
  }

  const generations = result.data || []

  if (options.json) {
    log(JSON.stringify(generations, null, 2))
    return
  }

  log(
    formatTable(
      generations.map((g) => ({
        id: g.id.slice(0, 8),
        type: g.type,
        status: g.status,
        title: (g.prompt || '').slice(0, 30),
        created: g.createdAt.slice(0, 10),
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'type', label: 'Type', width: 8 },
        { key: 'status', label: 'Status', width: 10 },
        { key: 'title', label: 'Title/Prompt', width: 30 },
        { key: 'created', label: 'Created', width: 10 },
      ]
    )
  )

  log(`\nTotal: ${generations.length} generations`)
}

export async function listSchedules(options: { json?: boolean }): Promise<void> {
  const result = await apiRequest<AISchedule[]>('/api/ai/schedules')

  if (!result.success) {
    error(result.error || 'Failed to fetch schedules')
    return
  }

  const schedules = result.data || []

  if (options.json) {
    log(JSON.stringify(schedules, null, 2))
    return
  }

  log(
    formatTable(
      schedules.map((s) => ({
        id: s.id.slice(0, 8),
        name: s.name.slice(0, 20),
        cron: s.cron,
        enabled: s.enabled ? 'Yes' : 'No',
        lastRun: s.lastRun?.slice(0, 10) || 'Never',
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'name', label: 'Name', width: 20 },
        { key: 'cron', label: 'Cron', width: 15 },
        { key: 'enabled', label: 'Enabled', width: 8 },
        { key: 'lastRun', label: 'Last Run', width: 10 },
      ]
    )
  )

  log(`\nTotal: ${schedules.length} schedules`)
}

export async function createSchedule(options: {
  name: string
  cron: string
  topic?: string
  keywords?: string
  tone?: string
  length?: string
  publish?: boolean
}): Promise<void> {
  const topicPool = options.topic
    ? [
        {
          name: options.topic,
          keywords: options.keywords?.split(',').map((k) => k.trim()) || [],
        },
      ]
    : []

  const result = await apiRequest<AISchedule>('/api/ai/schedules', {
    method: 'POST',
    body: {
      name: options.name,
      cron: options.cron,
      topicPool,
      settings: {
        tone: options.tone || 'professional',
        length: options.length || 'medium',
        autoPublish: options.publish || false,
      },
      enabled: true,
    },
  })

  if (!result.success) {
    error(result.error || 'Failed to create schedule')
    return
  }

  success(`Schedule created: ${result.data?.name}`)
  log(`ID: ${result.data?.id}`)
  log(`Cron: ${result.data?.cron}`)
}

export async function deleteSchedule(id: string): Promise<void> {
  const result = await apiRequest(`/api/ai/schedules/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete schedule')
    return
  }

  success('Schedule deleted')
}

export async function toggleSchedule(id: string): Promise<void> {
  const result = await apiRequest<AISchedule>(`/api/ai/schedules/${id}/toggle`, {
    method: 'POST',
  })

  if (!result.success) {
    error(result.error || 'Failed to toggle schedule')
    return
  }

  success(`Schedule ${result.data?.enabled ? 'enabled' : 'disabled'}`)
}

export async function runSchedule(id: string): Promise<void> {
  log('Running scheduled generation...')

  const result = await apiRequest<GenerationResult>(`/api/ai/schedules/${id}/run`, {
    method: 'POST',
  })

  if (!result.success) {
    error(result.error || 'Failed to run schedule')
    return
  }

  success('Article generated!')
  log(`Title: ${result.data?.title}`)
  log(`Slug: ${result.data?.slug}`)
  log(`Status: ${result.data?.status}`)
}
