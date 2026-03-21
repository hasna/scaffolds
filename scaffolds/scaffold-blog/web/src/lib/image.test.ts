import { describe, expect, test } from 'bun:test'
import { getResizedUploadsImageUrl, getResizedUploadsImageSrcSet } from './image'

describe('image', () => {
  test('keeps external URLs unchanged', () => {
    const src = 'https://cdn.example.com/uploads/a.jpg'
    expect(getResizedUploadsImageUrl(src, { baseOrigin: 'https://blog.example' })).toBe(src)
    expect(getResizedUploadsImageSrcSet(src, [600, 1200], { baseOrigin: 'https://blog.example' })).toBe(undefined)
  })

  test('transforms same-origin uploads URLs', () => {
    const src = 'https://blog.example/uploads/a.jpg?x=1'
    const out = getResizedUploadsImageUrl(src, { baseOrigin: 'https://blog.example', width: 900, quality: 80 })
    expect(out).toContain('/api/images/resize?')
    expect(out).toContain('path=%2Fuploads%2Fa.jpg')
    expect(out).toContain('w=900')
    expect(out).toContain('q=80')
  })

  test('transforms relative uploads paths', () => {
    const src = '/uploads/a.jpg'
    const out = getResizedUploadsImageUrl(src, { baseOrigin: 'https://blog.example', width: 1200 })
    expect(out).toContain('path=%2Fuploads%2Fa.jpg')
    expect(out).toContain('w=1200')
  })

  test('returns a responsive srcSet for uploads images', () => {
    const src = '/uploads/a.jpg'
    const out = getResizedUploadsImageSrcSet(src, [600, 900, 1200], { baseOrigin: 'https://blog.example' })
    expect(out).toContain('600w')
    expect(out).toContain('900w')
    expect(out).toContain('1200w')
  })
})

