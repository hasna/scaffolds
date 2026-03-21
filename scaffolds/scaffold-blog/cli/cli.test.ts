import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'

async function runCmd(
  cmd: string[],
  options: { cwd: string; env?: Record<string, string | undefined> }
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(cmd, {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...(options.env || {}),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  return { exitCode, stdout, stderr }
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

describe('CLI', () => {
  test('shows help via wrapper script', async () => {
    const cwd = process.cwd()
    const result = await runCmd(['./engine-blog', 'help'], { cwd })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Engine Blog CLI')
    expect(result.stdout).toContain('Usage: engine-blog')
    expect(result.stdout).toContain('page list')
    expect(result.stdout).toContain('ai site-description')
    expect(result.stdout).toContain('ai categories')
    expect(result.stdout).toContain('ai logo')
    expect(result.stdout).toContain('ai author-avatar')
  })

  test('`post --help` prints global help (not unknown command)', async () => {
    const cwd = process.cwd()
    const result = await runCmd(['bun', 'cli/index.ts', 'post', '--help'], { cwd })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Engine Blog CLI')
    expect(result.stdout).toContain('Usage: engine-blog')
    expect(result.stderr).not.toContain('Unknown')
  })

  test('config init/write/read works in isolated config dir', async () => {
    const cwd = process.cwd()
    const configDir = makeTempDir('engine-blog-cli-')
    const env = { ENGINE_BLOG_CONFIG_DIR: configDir }

    const init = await runCmd(['bun', 'cli/index.ts', 'config', 'init'], { cwd, env })
    expect(init.exitCode).toBe(0)
    expect(init.stdout).toContain('Config initialized')

    const configFile = path.join(configDir, 'config.json')
    expect(fs.existsSync(configFile)).toBe(true)

    const setUrl = await runCmd(['bun', 'cli/index.ts', 'config', 'set-url', 'http://localhost:9999'], { cwd, env })
    expect(setUrl.exitCode).toBe(0)

    const setKey = await runCmd(['bun', 'cli/index.ts', 'config', 'set-key', 'test-key'], { cwd, env })
    expect(setKey.exitCode).toBe(0)

    const show = await runCmd(['bun', 'cli/index.ts', 'config', 'show'], { cwd, env })
    expect(show.exitCode).toBe(0)

    const jsonMatch = show.stdout.match(/\{[\s\S]*\}/)
    expect(jsonMatch).not.toBeNull()

    const parsed = JSON.parse(jsonMatch![0])
    expect(parsed.version).toBe(1)
    expect(parsed.currentProfile).toBe('default')
    expect(parsed.profiles.default.apiUrl).toBe('http://localhost:9999')
    expect(parsed.profiles.default.apiKey).toBe('test-key')
  })

  test('supports multiple profiles and selecting via --profile', async () => {
    const cwd = process.cwd()
    const configDir = makeTempDir('engine-blog-cli-')
    const env = { ENGINE_BLOG_CONFIG_DIR: configDir }

    const init = await runCmd(['bun', 'cli/index.ts', 'config', 'init'], { cwd, env })
    expect(init.exitCode).toBe(0)

    const add = await runCmd(['bun', 'cli/index.ts', 'config', 'profile', 'add', 'acme', '--url', 'https://acme.com', '--key', 'acme-key'], { cwd, env })
    expect(add.exitCode).toBe(0)

    const use = await runCmd(['bun', 'cli/index.ts', 'config', 'profile', 'use', 'acme'], { cwd, env })
    expect(use.exitCode).toBe(0)

    const show = await runCmd(['bun', 'cli/index.ts', '--profile', 'acme', 'config', 'show'], { cwd, env })
    expect(show.exitCode).toBe(0)

    const jsonMatch = show.stdout.match(/\{[\s\S]*\}/)
    expect(jsonMatch).not.toBeNull()
    const parsed = JSON.parse(jsonMatch![0])
    expect(parsed.currentProfile).toBe('acme')
    expect(parsed.profiles.acme.apiUrl).toBe('https://acme.com')
    expect(parsed.profiles.acme.apiKey).toBe('acme-key')
  })

  test('normalizes profile URLs (strips trailing slashes and /api)', async () => {
    const cwd = process.cwd()
    const configDir = makeTempDir('engine-blog-cli-')
    const env = { ENGINE_BLOG_CONFIG_DIR: configDir }

    const init = await runCmd(['bun', 'cli/index.ts', 'config', 'init'], { cwd, env })
    expect(init.exitCode).toBe(0)

    const add = await runCmd(
      ['bun', 'cli/index.ts', 'config', 'profile', 'add', 'site1', '--url', 'https://example.com/api/'],
      { cwd, env }
    )
    expect(add.exitCode).toBe(0)

    const show = await runCmd(['bun', 'cli/index.ts', '--profile', 'site1', 'config', 'show'], { cwd, env })
    expect(show.exitCode).toBe(0)

    const jsonMatch = show.stdout.match(/\{[\s\S]*\}/)
    expect(jsonMatch).not.toBeNull()
    const parsed = JSON.parse(jsonMatch![0])
    expect(parsed.profiles.site1.apiUrl).toBe('https://example.com')
  })
})
