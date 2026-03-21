import { describe, expect, test } from 'bun:test'
import { getPreviewUrl } from './linkPreview'

describe('linkPreview', () => {
  test('returns null for in-app routes and anchors', () => {
    expect(getPreviewUrl('/post/hello', 'https://blog.example')).toBe(null)
    expect(getPreviewUrl('#section', 'https://blog.example')).toBe(null)
  })

  test('returns null for same-origin absolute links', () => {
    expect(getPreviewUrl('https://blog.example/post/hello', 'https://blog.example')).toBe(null)
  })

  test('returns absolute URL for external links', () => {
    expect(getPreviewUrl('https://openai.com', 'https://blog.example')).toBe('https://openai.com/')
  })
})

