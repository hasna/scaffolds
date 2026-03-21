import { findOne, findMany, run, now } from '../db'
import type { Setting } from '../../shared/types'

interface SettingRow {
  key: string
  value: string
  updated_at: string
}

function rowToSetting(row: SettingRow): Setting {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  }
}

export async function getAllSettings(): Promise<Setting[]> {
  const rows = await findMany<SettingRow>('SELECT * FROM settings ORDER BY key ASC')
  return rows.map(rowToSetting)
}

export async function getSetting(key: string): Promise<Setting | null> {
  const row = await findOne<SettingRow>('SELECT * FROM settings WHERE key = $1', [key])
  if (!row) return null
  return rowToSetting(row)
}

export async function setSetting(key: string, value: string): Promise<Setting> {
  const timestamp = now()
  const existing = await getSetting(key)

  if (existing) {
    await run('UPDATE settings SET value = $1, updated_at = $2 WHERE key = $3', [value, timestamp, key])
  } else {
    await run('INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)', [key, value, timestamp])
  }

  const setting = await getSetting(key)
  if (!setting) throw new Error('Failed to set setting')
  return setting
}

// Public settings keys that can be exposed without authentication
const PUBLIC_SETTINGS_KEYS = [
  'siteName',
  'siteDescription',
  'siteUrl',
  'logoUrl',
  'faviconUrl',
  'primaryColor',
  'accentColor',
  'headingFont',
  'bodyFont',
  'headerBgColor',
  'headerTextColor',
  'footerBgColor',
  'footerTextColor',
  'headerCategorySlugs',
  'allowComments',
  'moderateComments',
]

export async function getPublicSettings(): Promise<Record<string, unknown>> {
  const rows = await findMany<SettingRow>(
    `SELECT * FROM settings WHERE key = ANY($1)`,
    [PUBLIC_SETTINGS_KEYS]
  )

  const result: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value)
    } catch {
      result[row.key] = row.value
    }
  }
  return result
}

export async function getSettingValue<T = unknown>(key: string): Promise<T | null> {
  const row = await findOne<SettingRow>('SELECT * FROM settings WHERE key = $1', [key])
  if (!row) return null

  try {
    return JSON.parse(row.value) as T
  } catch {
    return row.value as unknown as T
  }
}

export async function updateSettings(settings: Record<string, unknown>): Promise<Setting[]> {
  const timestamp = now()
  const updatedSettings: Setting[] = []

  for (const [key, value] of Object.entries(settings)) {
    const stringValue = JSON.stringify(value)
    const existing = await getSetting(key)

    if (existing) {
      await run('UPDATE settings SET value = $1, updated_at = $2 WHERE key = $3', [
        stringValue,
        timestamp,
        key,
      ])
    } else {
      await run('INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)', [
        key,
        stringValue,
        timestamp,
      ])
    }

    const setting = await getSetting(key)
    if (setting) {
      updatedSettings.push(setting)
    }
  }

  return updatedSettings
}
