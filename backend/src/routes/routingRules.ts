import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  createRoutingRule,
  deleteRoutingRule,
  getRoutingRuleMeta,
  listRoutingRules,
  updateRoutingRule,
} from '../services/routingRulesService'

const router = Router()

const ensureAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required.' })
    return false
  }
  return true
}

const normalizeNullableId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const parsePayload = (body: any) => {
  const name = String(body?.name || '').trim()
  const priority = Number(body?.priority)
  const assigneeUserId = Number(body?.assignee_user_id)

  if (!name) throw new Error('Rule name is required')
  if (!Number.isInteger(priority) || priority < 1) throw new Error('Priority must be a positive integer')
  if (!Number.isInteger(assigneeUserId) || assigneeUserId < 1) throw new Error('Assignee is required')

  return {
    name,
    priority,
    is_active: body?.is_active !== false,
    company_id: normalizeNullableId(body?.company_id),
    department_id: normalizeNullableId(body?.department_id),
    category_id: normalizeNullableId(body?.category_id),
    assignee_user_id: assigneeUserId,
  }
}

router.get('/meta', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return
    res.json(await getRoutingRuleMeta())
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load routing metadata', details: err.message })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return
    res.json(await listRoutingRules())
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load routing rules', details: err.message })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return
    const rule = await createRoutingRule(parsePayload(req.body), req.user.id)
    res.status(201).json(rule)
  } catch (err: any) {
    console.error(err)
    const statusCode = [
      'Rule name is required',
      'Priority must be a positive integer',
      'Assignee is required',
      'Invalid company',
      'Invalid department',
      'Invalid category',
      'Assignee must be an active IT staff or admin user',
    ].includes(err.message) ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to create routing rule' })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const ruleId = Number(req.params.id)
    if (!Number.isInteger(ruleId) || ruleId < 1) {
      res.status(400).json({ error: 'Invalid routing rule id' })
      return
    }

    const rule = await updateRoutingRule(ruleId, parsePayload(req.body), req.user.id)
    res.json(rule)
  } catch (err: any) {
    console.error(err)
    const statusCode = [
      'Routing rule not found',
      'Rule name is required',
      'Priority must be a positive integer',
      'Assignee is required',
      'Invalid company',
      'Invalid department',
      'Invalid category',
      'Assignee must be an active IT staff or admin user',
    ].includes(err.message) ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to update routing rule' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const ruleId = Number(req.params.id)
    if (!Number.isInteger(ruleId) || ruleId < 1) {
      res.status(400).json({ error: 'Invalid routing rule id' })
      return
    }

    await deleteRoutingRule(ruleId)
    res.status(204).send()
  } catch (err: any) {
    console.error(err)
    const statusCode = err.message === 'Routing rule not found' ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to delete routing rule' })
  }
})

export default router
