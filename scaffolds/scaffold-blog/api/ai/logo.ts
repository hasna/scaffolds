import { Buffer } from 'node:buffer'

const DEFAULT_MODEL = 'gemini-2.5-flash-image'

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('Missing GOOGLE_API_KEY (or GEMINI_API_KEY)')
  }
  return key
}

function buildLogoPrompt(input: { prompt: string; style?: string; siteName?: string }): string {
  const siteName = input.siteName?.trim() || 'Engine Blog'

  const system = [
    'You are a senior brand designer creating a simple, modern logo mark for a web blog.',
    'Output: ONE square PNG image with a fully transparent background (alpha).',
    'Composition: centered, minimal, high-contrast, flat (no photo realism).',
    'No text, no watermark, no signatures, no mockups.',
    'Avoid thin strokes that won’t scale. Use clean geometry and balanced negative space.',
    'The design must read well at small sizes (favicon).',
    '',
    `Brand/site name (for context only, do NOT render text): ${siteName}`,
  ].join('\n')

  const style = input.style?.trim()
  const user = [
    'Brief:',
    input.prompt.trim(),
    style ? '' : '',
    style ? `Style notes: ${style}` : '',
    '',
    'Return only the image.',
  ]
    .filter(Boolean)
    .join('\n')

  return `${system}\n\n${user}`
}

export async function generateLogoPng(input: {
  prompt: string
  style?: string
  siteName?: string
}): Promise<Uint8Array> {
  const apiKey = getGeminiApiKey()
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildLogoPrompt(input) }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  )

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      (json && (json.error?.message || json.error?.status)) ||
      `Gemini request failed (${res.status})`
    throw new Error(message)
  }

  const parts: Array<any> = json?.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p) => p?.inlineData?.data && p?.inlineData?.mimeType)
  const base64 = imagePart?.inlineData?.data
  const mimeType = imagePart?.inlineData?.mimeType

  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Gemini did not return an image')
  }
  if (mimeType !== 'image/png') {
    // The model typically returns PNG; we require it for transparency.
    throw new Error(`Unexpected mime type: ${mimeType || 'unknown'}`)
  }

  const buf = Buffer.from(base64, 'base64')
  return new Uint8Array(buf)
}
