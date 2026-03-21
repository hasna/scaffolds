import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { generateId } from '../db'
import { uploadBufferToS3, isS3Configured } from '../storage/s3'

let openaiClient: OpenAI | null = null

function isImageGenerationDisabled(): boolean {
  return process.env.ENGINE_BLOG_DISABLE_IMAGE_GENERATION === '1' || process.env.ENGINE_BLOG_DISABLE_IMAGE_GENERATION === 'true'
}

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Image generation is disabled.')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

export interface ImageGenerationInput {
  prompt: string
  style?: 'realistic' | 'artistic' | 'minimalist'
}

export interface GeneratedImage {
  path: string
  filename: string
  mimeType: string
}

export async function generateImage(input: ImageGenerationInput): Promise<GeneratedImage> {
  const { prompt, style = 'realistic' } = input

  const id = generateId()
  const uploadDir = process.env.UPLOAD_PATH || './uploads'

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  if (isImageGenerationDisabled()) {
    const filename = `generated-${id}.svg`
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="28" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}
      </text>
    </svg>`

    if (isS3Configured()) {
      const s3Key = `images/${filename}`
      const result = await uploadBufferToS3(Buffer.from(svgContent), s3Key, 'image/svg+xml')
      return {
        path: result.url,
        filename,
        mimeType: 'image/svg+xml',
      }
    }

    const filePath = path.join(uploadDir, filename)
    fs.writeFileSync(filePath, svgContent)
    return {
      path: `/uploads/${filename}`,
      filename,
      mimeType: 'image/svg+xml',
    }
  }

  const stylePrompts = {
    realistic: 'hyper-realistic, ultra high definition, 8K resolution, professional DSLR photography, natural lighting, sharp focus, depth of field, cinematic composition, award-winning photograph',
    artistic: 'artistic, creative, vibrant colors, digital art, trending on artstation',
    minimalist: 'minimalist, clean, simple, modern design, professional',
  }

  const fullPrompt = `${prompt}. Style: ${stylePrompts[style]}. Photo-realistic quality, no text or watermarks, suitable for a professional blog featured image, 16:9 aspect ratio.`

  try {
    // Use DALL-E to generate the image
    const response = await getOpenAI().images.generate({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1792x1024', // Closest to 16:9
      quality: 'standard',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) {
      throw new Error('No image URL returned')
    }

    // Download the image
    const imageResponse = await fetch(imageUrl)
    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filename = `generated-${id}.png`

    // Upload to S3 if configured, otherwise save locally
    if (isS3Configured()) {
      const s3Key = `images/${filename}`
      const result = await uploadBufferToS3(buffer, s3Key, 'image/png')
      console.log('Image uploaded to S3:', result.url)

      return {
        path: result.url,
        filename,
        mimeType: 'image/png',
      }
    } else {
      // Save locally
      const filePath = path.join(uploadDir, filename)
      fs.writeFileSync(filePath, buffer)
      console.log('Image saved locally:', filename)

      return {
        path: `/uploads/${filename}`,
        filename,
        mimeType: 'image/png',
      }
    }
  } catch (error) {
    console.error('DALL-E image generation failed, using placeholder:', error)

    // Fallback to SVG placeholder
    const filename = `generated-${id}.svg`
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="28" fill="white" text-anchor="middle" dominant-baseline="middle">
        ${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}
      </text>
    </svg>`

    // Upload placeholder to S3 or save locally
    if (isS3Configured()) {
      const s3Key = `images/${filename}`
      const result = await uploadBufferToS3(Buffer.from(svgContent), s3Key, 'image/svg+xml')
      return {
        path: result.url,
        filename,
        mimeType: 'image/svg+xml',
      }
    } else {
      const filePath = path.join(uploadDir, filename)
      fs.writeFileSync(filePath, svgContent)
      return {
        path: `/uploads/${filename}`,
        filename,
        mimeType: 'image/svg+xml',
      }
    }
  }
}

export async function generateImagePrompt(title: string, excerpt: string): Promise<string> {
  if (isImageGenerationDisabled()) return title

  // Use OpenAI to generate an image prompt
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Create a hyper-realistic image generation prompt for a blog post featured image.

Blog title: ${title}
Blog excerpt: ${excerpt}

Generate a single, detailed prompt (max 250 characters) describing a HYPER-REALISTIC photograph that would work as the featured image. Focus on:
- Real-world scenes, objects, or people (no illustrations)
- Natural lighting and professional photography composition
- Specific visual details that make it look like a real photograph
- Avoid abstract concepts - describe concrete, photographable subjects

Just output the prompt, nothing else.`,
      },
    ],
    max_tokens: 150,
  })

  return response.choices[0]?.message?.content?.slice(0, 250) || title
}
