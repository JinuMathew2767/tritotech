import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationsService'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = await listNotificationsForUser(req.user.id)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load notifications', details: err.message })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = parseInt(req.params.id as string)
    if (!Number.isInteger(notificationId) || notificationId < 1) {
      res.status(400).json({ error: 'Invalid notification id' })
      return
    }

    const updated = await markNotificationRead(req.user.id, notificationId)
    if (!updated) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }

    res.status(204).send()
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification', details: err.message })
  }
})

router.post('/mark-all-read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await markAllNotificationsRead(req.user.id)
    res.status(204).send()
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notifications', details: err.message })
  }
})

export default router
