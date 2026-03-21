import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { updateSettingsSchema } from '../../shared/validators'
import { getAllSettings, updateSettings, getPublicSettings } from '../services/settings'
import { authMiddleware, requireRole } from '../middleware/auth'

const settings = new Hono()

// Public endpoint for theme settings (no auth required)
settings.get('/public', async (c) => {
  try {
    const result = await getPublicSettings()
    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Get public settings error:', error)
    return c.json({ success: false, error: 'Failed to get settings' }, 500)
  }
})

// All other settings routes are protected
settings.use('*', authMiddleware)

// GET / - get all settings
settings.get('/', async (c) => {
  try {
    const result = await getAllSettings()

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return c.json({ success: false, error: 'Failed to get settings' }, 500)
  }
})

// PUT / - update settings (admin only)
settings.put('/', requireRole('admin'), zValidator('json', updateSettingsSchema), async (c) => {
  try {
    const data = c.req.valid('json')

    const result = await updateSettings(data)

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return c.json({ success: false, error: 'Failed to update settings' }, 500)
  }
})

export default settings
