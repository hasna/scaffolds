import { describe, expect, test } from 'bun:test'
import { getExcerptParagraphs, stripMarkdown } from './excerpt'

describe('excerpt', () => {
  test('stripMarkdown removes basic markdown constructs', () => {
    const md = [
      '# Title',
      '',
      'Hello **world**. This is a [link](https://example.com).',
      '',
      '```ts',
      'console.log("code")',
      '```',
      '',
      '- List item one',
      '- List item two',
    ].join('\n')

    const stripped = stripMarkdown(md)
    expect(stripped).toContain('Title')
    expect(stripped).toContain('Hello world.')
    expect(stripped).toContain('This is a link.')
    expect(stripped).not.toContain('```')
    expect(stripped).not.toContain('console.log')
  })

  test('getExcerptParagraphs returns multiple paragraphs when possible', () => {
    const content = [
      'First paragraph. It has two sentences.',
      '',
      'Second paragraph. Another sentence.',
      '',
      'Third paragraph.',
      '',
      'Fourth paragraph.',
    ].join('\n')

    const paras = getExcerptParagraphs({ content }, { maxParagraphs: 4, maxChars: 1000 })
    expect(paras.length).toBeGreaterThanOrEqual(3)
    expect(paras.length).toBeLessThanOrEqual(4)
  })
})

