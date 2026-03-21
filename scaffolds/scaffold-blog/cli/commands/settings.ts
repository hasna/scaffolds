import {
  apiRequest,
  log,
  error,
  success,
  loadConfigFile,
  saveConfigFile,
  upsertProfile,
  setApiKey,
  getConfigFilePath,
  listProfiles,
  setCurrentProfile,
  deleteProfile,
} from '../lib/api'
import type { Setting } from '../../shared/types'

export async function getSettings(key?: string, options: { json?: boolean } = {}): Promise<void> {
  const result = await apiRequest<Setting[]>('/api/settings')

  if (!result.success) {
    error(result.error || 'Failed to fetch settings')
    return
  }

  const settingsList = result.data || []
  const settings: Record<string, unknown> = {}
  for (const s of settingsList) {
    try {
      settings[s.key] = JSON.parse(s.value)
    } catch {
      settings[s.key] = s.value
    }
  }

  if (key) {
    const value = settings[key]
    if (value === undefined) {
      error(`Setting '${key}' not found`)
      return
    }
    log(options.json ? JSON.stringify(value, null, 2) : String(value))
    return
  }

  if (options.json) {
    log(JSON.stringify(settings, null, 2))
    return
  }

  for (const [k, v] of Object.entries(settings)) {
    log(`${k}: ${JSON.stringify(v)}`)
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  // Try to parse value as JSON
  let parsedValue: unknown = value
  try {
    parsedValue = JSON.parse(value)
  } catch {
    // Keep as string
  }

  const result = await apiRequest('/api/settings', {
    method: 'PUT',
    body: { [key]: parsedValue },
  })

  if (!result.success) {
    error(result.error || 'Failed to update setting')
    return
  }

  success(`Setting '${key}' updated`)
}

// CLI config commands (local, not API)
export function configShow(): void {
  const config = loadConfigFile()
  log(JSON.stringify(config, null, 2))
}

export function configSetUrl(url: string, profile?: string): void {
  const cfg = loadConfigFile()
  const target = (profile || '').trim() || cfg.currentProfile || 'default'
  upsertProfile(target, { apiUrl: url })
  success(`API URL set for profile '${target}'`)
}

export function configSetKey(key: string, profile?: string): void {
  const cfg = loadConfigFile()
  const target = (profile || '').trim() || cfg.currentProfile || 'default'
  setApiKey(key, target)
  success(`API key saved for profile '${target}'`)
}

export function configInit(): void {
  const cfg = loadConfigFile()
  if (!cfg.profiles.default) {
    cfg.profiles.default = { apiUrl: 'http://localhost:8030' }
  }
  if (!cfg.currentProfile) cfg.currentProfile = 'default'
  saveConfigFile(cfg)
  success('Config initialized')
  log(`Config file: ${getConfigFilePath()}`)
}

export async function login(email: string, password: string): Promise<void> {
  const result = await apiRequest<{ token: string; user: { name: string } }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    requireAuth: false,
  })

  if (!result.success) {
    error(result.error || 'Login failed')
    return
  }

  if (result.data?.token) {
    setApiKey(result.data.token)
    success(`Logged in as ${result.data.user.name}`)
  }
}

export function profileList(): void {
  const profiles = listProfiles().sort((a, b) => a.name.localeCompare(b.name))
  if (profiles.length === 0) {
    log('No profiles configured. Run: engine-blog config profile add <name> --url <url>')
    return
  }
  for (const p of profiles) {
    const currentMark = p.isCurrent ? '*' : ' '
    const keyMark = p.hasKey ? 'key' : 'no-key'
    log(`${currentMark} ${p.name}  ${p.apiUrl}  (${keyMark})`)
  }
}

export function profileAdd(name: string, url: string, key?: string): void {
  if (!name.trim()) throw new Error('Profile name is required')
  if (!url.trim()) throw new Error('Profile url is required')
  upsertProfile(name.trim(), { apiUrl: url.trim(), apiKey: key?.trim() || undefined })
  success(`Profile added: ${name}`)
}

export function profileUse(name: string): void {
  setCurrentProfile(name.trim())
  success(`Current profile set to: ${name}`)
}

export function profileDelete(name: string): void {
  deleteProfile(name.trim())
  success(`Profile deleted: ${name}`)
}
