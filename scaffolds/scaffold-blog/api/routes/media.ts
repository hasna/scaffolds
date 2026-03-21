import { Hono } from 'hono'
import { getAllMedia, getMediaById, createMedia, deleteMedia } from '../services/media'
import { authMiddleware, requireRole } from '../middleware/auth'
import type { AppEnv } from '../types'

const media = new Hono<AppEnv>()

// GET / - list media (protected)
media.get('/', authMiddleware, async (c) => {
  try {
    const result = await getAllMedia()

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get media error:', error)
    return c.json({ success: false, error: 'Failed to get media' }, 500)
  }
})

// POST / - upload media (protected)
media.post('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.parseBody()

    const file = body['file']
    if (!file || !(file instanceof File)) {
      return c.json({ success: false, error: 'No file provided' }, 400)
    }

    // In a real implementation, you would:
    // 1. Save the file to disk or cloud storage
    // 2. Generate a unique filename
    // 3. Get file metadata (size, mime type, etc)
    //
    // For now, we'll create a placeholder implementation
    const filename = file.name
    const path = `/uploads/${Date.now()}-${filename}`
    const mimeType = file.type
    const size = file.size

    const mediaItem = await createMedia({
      filename,
      path,
      mimeType,
      size,
      uploadedBy: user.id,
    })

    return c.json({
      success: true,
      data: mediaItem,
    })
  } catch (error) {
    console.error('Upload media error:', error)
    return c.json({ success: false, error: 'Failed to upload media' }, 500)
  }
})

// DELETE /:id - delete media (protected)
media.delete('/:id', authMiddleware, requireRole('admin', 'editor'), async (c) => {
  try {
    const id = c.req.param('id')

    // In a real implementation, you would also delete the file from disk/storage
    const mediaItem = await getMediaById(id)
    if (!mediaItem) {
      return c.json({ success: false, error: 'Media not found' }, 404)
    }

    const success = await deleteMedia(id)
    if (!success) {
      return c.json({ success: false, error: 'Failed to delete media' }, 500)
    }

    return c.json({
      success: true,
      data: { message: 'Media deleted successfully' },
    })
  } catch (error) {
    console.error('Delete media error:', error)
    return c.json({ success: false, error: 'Failed to delete media' }, 500)
  }
})

export default media
