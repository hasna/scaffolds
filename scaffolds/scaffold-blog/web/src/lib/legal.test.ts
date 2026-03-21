import { describe, expect, test } from 'bun:test'
import { getLegalDocs } from './legal'

describe('legal', () => {
  test('getLegalDocs returns all documents', () => {
    const docs = getLegalDocs({ siteName: 'Test Blog', siteUrl: 'https://example.com' })
    expect(Object.keys(docs).sort()).toEqual([
      'acceptable-use',
      'accessibility',
      'cookies',
      'disclaimer',
      'dmca',
      'privacy',
      'terms',
    ])
    expect(docs.privacy.title).toBe('Privacy Policy')
    expect(docs.terms.title).toBe('Terms of Service')
  })
})

