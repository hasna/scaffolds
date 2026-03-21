import cron from 'node-cron'
import { generateArticle } from './agent'
import { findMany, findOne, run, now, generateId } from '../db'
import type { AISchedule, AITopic } from '../../shared/types'

interface ScheduleRow {
  id: string
  name: string
  cron: string
  topic_pool: string
  settings: string
  enabled: boolean
  last_run: string | null
  next_run: string | null
  created_at: string
}

const activeJobs: Map<string, cron.ScheduledTask> = new Map()

export async function initScheduler(): Promise<void> {
  console.log('Initializing AI scheduler...')

  // Load all enabled schedules from database
  const schedules = await findMany<ScheduleRow>(
    'SELECT * FROM ai_schedules WHERE enabled = true',
    []
  )

  for (const schedule of schedules) {
    startSchedule(schedule)
  }

  console.log(`Started ${schedules.length} scheduled jobs`)
}

export function startSchedule(schedule: ScheduleRow): void {
  // Stop existing job if any
  stopSchedule(schedule.id)

  if (!cron.validate(schedule.cron)) {
    console.error(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`)
    return
  }

  const job = cron.schedule(schedule.cron, async () => {
    console.log(`Running scheduled generation: ${schedule.name}`)

    try {
      const topicPool: AITopic[] = JSON.parse(schedule.topic_pool || '[]')
      const settings = JSON.parse(schedule.settings || '{}')

      // Pick a random topic from the pool
      const topic = topicPool.length > 0
        ? topicPool[Math.floor(Math.random() * topicPool.length)]
        : undefined

      await generateArticle({
        topic: topic?.name,
        keywords: topic?.keywords,
        tone: settings.tone || 'professional',
        length: settings.length || 'medium',
        autoPublish: settings.autoPublish || false,
      })

      // Update last run time
      await run(
        'UPDATE ai_schedules SET last_run = $1 WHERE id = $2',
        [now(), schedule.id]
      )

      console.log(`Scheduled generation completed: ${schedule.name}`)
    } catch (error) {
      console.error(`Scheduled generation failed: ${schedule.name}`, error)
    }
  })

  activeJobs.set(schedule.id, job)
  console.log(`Scheduled job started: ${schedule.name} (${schedule.cron})`)
}

export function stopSchedule(scheduleId: string): void {
  const job = activeJobs.get(scheduleId)
  if (job) {
    job.stop()
    activeJobs.delete(scheduleId)
    console.log(`Scheduled job stopped: ${scheduleId}`)
  }
}

export async function restartSchedule(scheduleId: string): Promise<void> {
  const schedule = await findOne<ScheduleRow>(
    'SELECT * FROM ai_schedules WHERE id = $1',
    [scheduleId]
  )

  if (schedule && schedule.enabled) {
    startSchedule(schedule)
  } else {
    stopSchedule(scheduleId)
  }
}

// Schedule management functions
export async function createSchedule(data: {
  name: string
  cron: string
  topicPool: AITopic[]
  settings: { tone: string; length: string; autoPublish: boolean }
  enabled?: boolean
}): Promise<string> {
  const id = generateId()
  const timestamp = now()

  await run(
    `INSERT INTO ai_schedules (id, name, cron, topic_pool, settings, enabled, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      data.name,
      data.cron,
      JSON.stringify(data.topicPool),
      JSON.stringify(data.settings),
      data.enabled !== false,
      timestamp,
    ]
  )

  if (data.enabled !== false) {
    const schedule = await findOne<ScheduleRow>('SELECT * FROM ai_schedules WHERE id = $1', [id])
    if (schedule) {
      startSchedule(schedule)
    }
  }

  return id
}

export async function updateSchedule(
  id: string,
  data: Partial<{
    name: string
    cron: string
    topicPool: AITopic[]
    settings: { tone: string; length: string; autoPublish: boolean }
    enabled: boolean
  }>
): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`)
    values.push(data.name)
  }
  if (data.cron !== undefined) {
    updates.push(`cron = $${paramIndex++}`)
    values.push(data.cron)
  }
  if (data.topicPool !== undefined) {
    updates.push(`topic_pool = $${paramIndex++}`)
    values.push(JSON.stringify(data.topicPool))
  }
  if (data.settings !== undefined) {
    updates.push(`settings = $${paramIndex++}`)
    values.push(JSON.stringify(data.settings))
  }
  if (data.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`)
    values.push(data.enabled)
  }

  if (updates.length > 0) {
    values.push(id)
    await run(`UPDATE ai_schedules SET ${updates.join(', ')} WHERE id = $${paramIndex}`, values)
    await restartSchedule(id)
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  stopSchedule(id)
  await run('DELETE FROM ai_schedules WHERE id = $1', [id])
}

export async function getAllSchedules(): Promise<AISchedule[]> {
  const rows = await findMany<ScheduleRow>('SELECT * FROM ai_schedules ORDER BY created_at DESC', [])

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cron: row.cron,
    topicPool: JSON.parse(row.topic_pool || '[]'),
    settings: JSON.parse(row.settings || '{}'),
    enabled: row.enabled,
    lastRun: row.last_run,
    nextRun: row.next_run,
    createdAt: row.created_at,
  }))
}

export async function getScheduleById(id: string): Promise<AISchedule | null> {
  const row = await findOne<ScheduleRow>('SELECT * FROM ai_schedules WHERE id = $1', [id])

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    cron: row.cron,
    topicPool: JSON.parse(row.topic_pool || '[]'),
    settings: JSON.parse(row.settings || '{}'),
    enabled: row.enabled,
    lastRun: row.last_run,
    nextRun: row.next_run,
    createdAt: row.created_at,
  }
}
