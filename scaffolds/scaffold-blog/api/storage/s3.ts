import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    : undefined, // Use default credential chain (AWS config file)
})

const BUCKET_NAME = process.env.S3_BUCKET || 'beepmedia-lab-engine-blog'
const S3_BASE_URL = `https://${BUCKET_NAME}.s3.amazonaws.com`

export interface UploadResult {
  url: string
  key: string
  bucket: string
}

export async function uploadToS3(
  filePath: string,
  key: string,
  contentType: string
): Promise<UploadResult> {
  const fileContent = fs.readFileSync(filePath)

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  })

  await s3Client.send(command)

  return {
    url: `${S3_BASE_URL}/${key}`,
    key,
    bucket: BUCKET_NAME,
  }
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await s3Client.send(command)

  return {
    url: `${S3_BASE_URL}/${key}`,
    key,
    bucket: BUCKET_NAME,
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

export function getS3Url(key: string): string {
  return `${S3_BASE_URL}/${key}`
}

// Utility to extract S3 key from URL
export function getKeyFromUrl(url: string): string | null {
  if (url.startsWith(S3_BASE_URL)) {
    return url.slice(S3_BASE_URL.length + 1)
  }
  return null
}

// Check if S3 is configured
export function isS3Configured(): boolean {
  return !!(process.env.S3_BUCKET || process.env.AWS_ACCESS_KEY_ID)
}
