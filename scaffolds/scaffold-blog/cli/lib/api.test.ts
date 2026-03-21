import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  apiRequest,
  clearApiKey,
  getApiKey,
  getConfigFilePath,
  loadConfig,
  saveConfigFile,
  setApiKey,
} from './api'

async function withTempConfigDir<T>(
  fn: (configDir: string) => Promise<T> | T
): Promise<T> {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-blog-config-'))
  const prevDir = process.env.ENGINE_BLOG_CONFIG_DIR
  const prevFile = process.env.ENGINE_BLOG_CONFIG_FILE
  process.env.ENGINE_BLOG_CONFIG_DIR = configDir
  delete process.env.ENGINE_BLOG_CONFIG_FILE

  try {
    return await fn(configDir)
  } finally {
    if (prevDir === undefined) delete process.env.ENGINE_BLOG_CONFIG_DIR
    else process.env.ENGINE_BLOG_CONFIG_DIR = prevDir
    if (prevFile === undefined) delete process.env.ENGINE_BLOG_CONFIG_FILE
    else process.env.ENGINE_BLOG_CONFIG_FILE = prevFile
  }
}

describe('cli/lib/api config', () => {
  test('saveConfig/loadConfig roundtrip', async () => {
    await withTempConfigDir((configDir) => {
      saveConfigFile({
        version: 1,
        currentProfile: 'default',
        profiles: { default: { apiUrl: 'http://localhost:1234', apiKey: 'k1' } },
      })
      expect(getConfigFilePath()).toBe(path.join(configDir, 'config.json'))

      const loaded = loadConfig()
      expect(loaded.apiUrl).toBe('http://localhost:1234')
      expect(getApiKey()).toBe('k1')

      clearApiKey()
      expect(getApiKey()).toBeUndefined()
    })
  })

})

describe('cli/lib/api apiRequest', () => {
  test('returns auth error without calling fetch when auth required and missing key', async () => {
    await withTempConfigDir(async () => {
      saveConfigFile({
        version: 1,
        currentProfile: 'default',
        profiles: { default: { apiUrl: 'http://example.invalid' } },
      })
      clearApiKey()

      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        throw new Error('fetch should not be called')
      }

      try {
        const result = await apiRequest('/api/posts')
        expect(result.success).toBe(false)
        expect(result.error).toContain('Not authenticated')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  test('adds Authorization header when api key is set', async () => {
    await withTempConfigDir(async () => {
      saveConfigFile({
        version: 1,
        currentProfile: 'default',
        profiles: { default: { apiUrl: 'http://localhost:8030' } },
      })
      setApiKey('secret-token')

      const originalFetch = globalThis.fetch
      let capturedAuth: string | undefined

      globalThis.fetch = async (_url, init) => {
        const headers = (init?.headers || {}) as Record<string, string>
        capturedAuth = headers.Authorization
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      try {
        const result = await apiRequest<{ ok: boolean }>('/api/ping')
        expect(result.success).toBe(true)
        expect(capturedAuth).toBe('Bearer secret-token')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  test('does not add Authorization header when auth is none', async () => {
    await withTempConfigDir(async () => {
      saveConfigFile({
        version: 1,
        currentProfile: 'default',
        profiles: { default: { apiUrl: 'http://localhost:8030', apiKey: 'k2' } },
      })

      const originalFetch = globalThis.fetch
      let capturedAuth: string | undefined

      globalThis.fetch = async (_url, init) => {
        const headers = (init?.headers || {}) as Record<string, string>
        capturedAuth = headers.Authorization
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      try {
        const result = await apiRequest<{ ok: boolean }>('/api/public', { auth: 'none' })
        expect(result.success).toBe(true)
        expect(capturedAuth).toBeUndefined()
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })
})
