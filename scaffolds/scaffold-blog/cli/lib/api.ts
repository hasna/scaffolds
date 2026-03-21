import fs from 'fs'
import path from 'path'
import os from 'os'

interface CLIProfile {
  apiUrl: string
  apiKey?: string
}

interface CLIConfigFileV1 {
  version: 1
  currentProfile: string
  profiles: Record<string, CLIProfile>
}

interface LegacyCLIConfig {
  apiUrl: string
  apiKey?: string
}

function getConfigDir(): string {
  const overrideDir = process.env.ENGINE_BLOG_CONFIG_DIR
  if (overrideDir) return path.resolve(overrideDir)
  return path.join(os.homedir(), '.engine-blog')
}

export function getConfigFilePath(): string {
  const overrideFile = process.env.ENGINE_BLOG_CONFIG_FILE
  if (overrideFile) return path.resolve(overrideFile)
  return path.join(getConfigDir(), 'config.json')
}

let runtimeProfile: string | undefined

export function setRuntimeProfile(profileName?: string): void {
  runtimeProfile = profileName?.trim() ? profileName.trim() : undefined
}

function normalizeApiUrl(url: string): string {
  let normalized = url.trim()
  normalized = normalized.replace(/\/+$/, '')
  if (normalized.endsWith('/api')) {
    normalized = normalized.slice(0, -4)
  }
  return normalized
}

function migrateLegacyConfig(legacy: LegacyCLIConfig): CLIConfigFileV1 {
  return {
    version: 1,
    currentProfile: 'default',
    profiles: {
      default: {
        apiUrl: normalizeApiUrl(legacy.apiUrl || 'http://localhost:8030'),
        apiKey: legacy.apiKey,
      },
    },
  }
}

export function loadConfigFile(): CLIConfigFileV1 {
  const configFile = getConfigFilePath()
  try {
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, 'utf-8')
      const parsed = JSON.parse(content) as unknown

      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed as any).version === 1 &&
        typeof (parsed as any).currentProfile === 'string' &&
        typeof (parsed as any).profiles === 'object'
      ) {
        return parsed as CLIConfigFileV1
      }

      if (parsed && typeof parsed === 'object' && typeof (parsed as any).apiUrl === 'string') {
        const migrated = migrateLegacyConfig(parsed as LegacyCLIConfig)
        saveConfigFile(migrated)
        return migrated
      }
    }
  } catch {
    // Ignore errors
  }

  return {
    version: 1,
    currentProfile: 'default',
    profiles: {
      default: {
        apiUrl: normalizeApiUrl(process.env.BLOG_API_URL || 'http://localhost:8030'),
        apiKey: process.env.BLOG_API_KEY,
      },
    },
  }
}

export function saveConfigFile(config: CLIConfigFileV1): void {
  const configDir = path.dirname(getConfigFilePath())
  const configFile = getConfigFilePath()

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
}

export function listProfiles(): Array<{ name: string; apiUrl: string; hasKey: boolean; isCurrent: boolean }> {
  const cfg = loadConfigFile()
  const current = cfg.currentProfile
  return Object.entries(cfg.profiles).map(([name, profile]) => ({
    name,
    apiUrl: profile.apiUrl,
    hasKey: Boolean(profile.apiKey),
    isCurrent: name === current,
  }))
}

export function setCurrentProfile(profileName: string): void {
  const cfg = loadConfigFile()
  if (!cfg.profiles[profileName]) {
    throw new Error(`Profile not found: ${profileName}`)
  }
  cfg.currentProfile = profileName
  saveConfigFile(cfg)
}

export function upsertProfile(profileName: string, profile: Partial<CLIProfile>): void {
  const cfg = loadConfigFile()
  const existing = cfg.profiles[profileName] || { apiUrl: 'http://localhost:8030' }
  const apiUrl = profile.apiUrl ? normalizeApiUrl(profile.apiUrl) : existing.apiUrl
  const apiKey = profile.apiKey !== undefined ? profile.apiKey : existing.apiKey
  cfg.profiles[profileName] = { apiUrl, apiKey }

  if (!cfg.currentProfile) {
    cfg.currentProfile = profileName
  }

  saveConfigFile(cfg)
}

export function deleteProfile(profileName: string): void {
  const cfg = loadConfigFile()
  if (!cfg.profiles[profileName]) return

  delete cfg.profiles[profileName]

  if (cfg.currentProfile === profileName) {
    const next = Object.keys(cfg.profiles)[0] || 'default'
    cfg.currentProfile = next
    if (!cfg.profiles[next]) {
      cfg.profiles[next] = { apiUrl: normalizeApiUrl(process.env.BLOG_API_URL || 'http://localhost:8030') }
    }
  }

  saveConfigFile(cfg)
}

function getActiveProfileName(): string {
  const fromRuntime = runtimeProfile?.trim()
  if (fromRuntime) return fromRuntime

  const fromEnv = (process.env.ENGINE_BLOG_PROFILE || '').trim()
  if (fromEnv) return fromEnv

  const cfg = loadConfigFile()
  return cfg.currentProfile || 'default'
}

export function loadProfile(profileName?: string): CLIProfile {
  const cfg = loadConfigFile()
  const name = (profileName || getActiveProfileName()).trim() || 'default'

  // Environment variables take precedence (single-site override)
  if (process.env.BLOG_API_URL) {
    return {
      apiUrl: normalizeApiUrl(process.env.BLOG_API_URL),
      apiKey: process.env.BLOG_API_KEY || undefined,
    }
  }

  const profile = cfg.profiles[name]
  if (!profile) {
    throw new Error(`Profile not found: ${name}. Run: engine-blog config profile add ${name} --url <url>`)
  }

  return profile
}

export function loadConfig(): CLIProfile {
  return loadProfile()
}

export function saveConfig(config: CLIProfile): void {
  upsertProfile(getActiveProfileName(), config)
}

export function getApiKey(profileName?: string): string | undefined {
  const profile = loadProfile(profileName)
  return profile.apiKey || process.env.BLOG_API_KEY
}

export function setApiKey(key: string, profileName?: string): void {
  upsertProfile((profileName || getActiveProfileName()).trim() || 'default', { apiKey: key })
}

export function clearApiKey(profileName?: string): void {
  const cfg = loadConfigFile()
  const name = (profileName || getActiveProfileName()).trim() || 'default'
  const profile = cfg.profiles[name]
  if (!profile) {
    throw new Error(`Profile not found: ${name}`)
  }
  delete profile.apiKey
  cfg.profiles[name] = profile
  saveConfigFile(cfg)
}

export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string
    body?: unknown
    requireAuth?: boolean
    auth?: 'required' | 'optional' | 'none'
    headers?: Record<string, string>
    profile?: string
  } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const profile = loadProfile(options.profile)
  const { method = 'GET', body, requireAuth = true, headers: extraHeaders } = options
  const authMode: 'required' | 'optional' | 'none' =
    options.auth ??
    (requireAuth ? 'required' : 'none')

  const headers: Record<string, string> = {
    ...(extraHeaders || {}),
  }

  if (authMode !== 'none') {
    const apiKey = getApiKey(options.profile)
    if (!apiKey) {
      if (authMode === 'required') {
        return { success: false, error: 'Not authenticated. Run: engine-blog config set-key <api-key>' }
      }
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
  }

  try {
    const isFormData =
      typeof FormData !== 'undefined' && body instanceof FormData

    const requestBody =
      body === undefined
        ? undefined
        : isFormData
          ? (body as unknown as BodyInit)
          : JSON.stringify(body)

    if (!isFormData && requestBody !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${profile.apiUrl}${endpoint}`, { method, headers, body: requestBody })

    const result = await response.json()
    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }
  }
}

export function formatTable(
  data: Record<string, unknown>[],
  columns: { key: string; label: string; width?: number }[]
): string {
  if (data.length === 0) {
    return 'No data found.'
  }

  const widths = columns.map((col) => {
    const maxData = Math.max(
      ...data.map((row) => String(row[col.key] || '').length)
    )
    return Math.max(col.width || 10, col.label.length, maxData)
  })

  const header = columns
    .map((col, i) => col.label.padEnd(widths[i]))
    .join(' | ')

  const separator = widths.map((w) => '-'.repeat(w)).join('-+-')

  const rows = data.map((row) =>
    columns
      .map((col, i) => String(row[col.key] || '').slice(0, widths[i]).padEnd(widths[i]))
      .join(' | ')
  )

  return [header, separator, ...rows].join('\n')
}

export function formatJSON(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

export function log(message: string): void {
  console.log(message)
}

export function error(message: string): void {
  console.error(`Error: ${message}`)
}

export function success(message: string): void {
  console.log(`✓ ${message}`)
}
