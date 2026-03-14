import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  getBrandingSettings,
  updateBrandingSettings,
} from '../services/brandingService'

const router = Router()

const ensureAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required.' })
    return false
  }
  return true
}

router.get('/', async (_req, res: Response): Promise<void> => {
  try {
    const settings = await getBrandingSettings()
    res.json(settings)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load branding settings' })
  }
})

router.patch('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const settings = await updateBrandingSettings({
      appName: req.body?.appName,
      timezone: req.body?.timezone,
      logoDataUrl: req.body?.logoDataUrl,
    })

    res.json(settings)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save branding settings' })
  }
})

export default router
