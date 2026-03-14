import { Router, Response } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const ensureAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required.' })
    return false
  }
  return true
}

const normalizePayload = (body: any) => {
  const name = String(body?.name || '').trim()
  if (!name) throw new Error('Company name is required')

  return {
    name,
    is_active: body?.is_active !== false,
  }
}

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.include_inactive === 'true' && req.user?.role === 'admin'
    const companies = await prisma.companies.findMany({
      where: includeInactive ? undefined : { IsActive: true },
      include: {
        _count: {
          select: {
            Tickets: true,
            Users: true,
          },
        },
      },
      orderBy: [{ IsActive: 'desc' }, { Name: 'asc' }],
    })

    res.json(
      companies.map((company) => ({
        id: company.Id,
        name: company.Name,
        is_active: company.IsActive,
        ticket_count: company._count.Tickets,
        user_count: company._count.Users,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load companies' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const payload = normalizePayload(req.body)
    const company = await prisma.companies.create({
      data: {
        Name: payload.name,
        IsActive: payload.is_active,
      },
      include: {
        _count: {
          select: {
            Tickets: true,
            Users: true,
          },
        },
      },
    })

    res.status(201).json({
      id: company.Id,
      name: company.Name,
      is_active: company.IsActive,
      ticket_count: company._count.Tickets,
      user_count: company._count.Users,
    })
  } catch (err: any) {
    console.error(err)
    const isDuplicate = err?.code === 'P2002'
    const statusCode = isDuplicate || err.message === 'Company name is required' ? 400 : 500
    res.status(statusCode).json({
      error: isDuplicate ? 'A company with this name already exists' : err.message || 'Failed to create company',
    })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const companyId = Number(req.params.id)
    if (!Number.isInteger(companyId) || companyId < 1) {
      res.status(400).json({ error: 'Invalid company id' })
      return
    }

    const existing = await prisma.companies.findUnique({ where: { Id: companyId } })
    if (!existing) {
      res.status(404).json({ error: 'Company not found' })
      return
    }

    const payload = normalizePayload(req.body)
    const company = await prisma.companies.update({
      where: { Id: companyId },
      data: {
        Name: payload.name,
        IsActive: payload.is_active,
      },
      include: {
        _count: {
          select: {
            Tickets: true,
            Users: true,
          },
        },
      },
    })

    res.json({
      id: company.Id,
      name: company.Name,
      is_active: company.IsActive,
      ticket_count: company._count.Tickets,
      user_count: company._count.Users,
    })
  } catch (err: any) {
    console.error(err)
    const isDuplicate = err?.code === 'P2002'
    const statusCode = isDuplicate || err.message === 'Company name is required' ? 400 : 500
    res.status(statusCode).json({
      error: isDuplicate ? 'A company with this name already exists' : err.message || 'Failed to update company',
    })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const companyId = Number(req.params.id)
    if (!Number.isInteger(companyId) || companyId < 1) {
      res.status(400).json({ error: 'Invalid company id' })
      return
    }

    const existing = await prisma.companies.findUnique({ where: { Id: companyId } })
    if (!existing) {
      res.status(404).json({ error: 'Company not found' })
      return
    }

    await prisma.companies.update({
      where: { Id: companyId },
      data: { IsActive: false },
    })

    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete company' })
  }
})

export default router
