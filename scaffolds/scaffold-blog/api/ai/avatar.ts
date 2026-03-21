import { Buffer } from 'node:buffer'

const DEFAULT_MODEL = 'gemini-2.5-flash-image'

function getGeminiApiKey(): string {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('Missing GOOGLE_API_KEY (or GEMINI_API_KEY)')
  }
  return key
}

function buildAvatarPrompt(input: { prompt?: string; userName?: string }): string {
  const userName = input.userName?.trim() || 'Author'
  const userPrompt = (input.prompt || '').trim()

  const system = [
    'You create hyperrealistic portraits for UI avatars.',
    'Output: ONE square PNG image.',
    'Subject: a fictional ADULT human (age 25+).',
    'Safety: the face must NOT resemble any real person or celebrity.',
    'No text, no watermark, no signatures.',
    'Style: studio headshot, pleasant expression, realistic skin, natural lighting, sharp focus.',
    'Background: simple neutral background (not busy).',
    'Framing: head and shoulders, centered, good for circular crop.',
    '',
    `Name context (do not render as text): ${userName}`,
  ].join('\n')

  const brief = userPrompt.length > 0
    ? userPrompt
    : 'Generate a random, distinctive fictional person suitable for an author avatar.'

  return `${system}\n\nBrief:\n${brief}\n\nReturn only the image.`
}

export async function generateAvatarPng(input: { prompt?: string; userName?: string }): Promise<Uint8Array> {
  const apiKey = getGeminiApiKey()
  const model = process.env.GEMINI_AVATAR_MODEL || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL

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
            parts: [{ text: buildAvatarPrompt(input) }],
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
    throw new Error(`Unexpected mime type: ${mimeType || 'unknown'}`)
  }

  const buf = Buffer.from(base64, 'base64')
  return new Uint8Array(buf)
}

