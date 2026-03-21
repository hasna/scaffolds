import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'node:child_process'
import fs from 'node:fs'

// https://vitejs.dev/config/
function getAppVersion(): string {
  const root = path.resolve(__dirname, '..')
  let pkgVersion = '0.0.0'
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    if (pkg?.version) pkgVersion = String(pkg.version)
  } catch {
    // ignore
  }

  try {
    const described = execSync('git describe --tags --dirty --always', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (described) return described
  } catch {
    // ignore (e.g. no git in build environment)
  }

  return `v${pkgVersion}`
}

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3030,
    proxy: {
      '/api': {
        target: 'http://localhost:8030',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8030',
        changeOrigin: true,
      },
    },
  },
});
