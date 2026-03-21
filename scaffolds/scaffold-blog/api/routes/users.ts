import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createUserSchema, updateUserSchema } from '../../shared/validators'
import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from '../services/user'
import { authMiddleware, requireRole } from '../middleware/auth'

const users = new Hono()

// All user routes are protected and require admin role
users.use('*', authMiddleware, requireRole('admin'))

// GET / - list users
users.get('/', async (c) => {
  try {
    const result = await getAllUsers()

    return c.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ success: false, error: 'Failed to get users' }, 500)
  }
})

// POST / - create user
users.post('/', zValidator('json', createUserSchema), async (c) => {
  try {
    const data = c.req.valid('json')

    const user = await createUser(data)

    return c.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Create user error:', error)
    return c.json({ success: false, error: 'Failed to create user' }, 500)
  }
})

// PUT /:id - update user
users.put('/:id', zValidator('json', updateUserSchema), async (c) => {
  try {
    const id = c.req.param('id')
    const data = c.req.valid('json')

    const user = await updateUser(id, data)
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Update user error:', error)
    return c.json({ success: false, error: 'Failed to update user' }, 500)
  }
})

// DELETE /:id - delete user
users.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const success = await deleteUser(id)
    if (!success) {
      return c.json({ success: false, error: 'User not found' }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'User deleted successfully' },
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ success: false, error: 'Failed to delete user' }, 500)
  }
})

export default users
