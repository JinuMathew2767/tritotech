import { Prisma } from '@prisma/client'
import { Router, Response } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { ensureRoutingRulesTable } from '../services/routingRulesService'

const router = Router()

interface RoutingRuleCategoryCountRow {
  category_id: number | null
  count: number
}

const ensureAdmin = (req: AuthRequest, res: Response): boolean => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required.' })
    return false
  }
  return true
}

const normalizePayload = (body: any) => {
  const name = String(body?.name || '').trim()
  const description = String(body?.description || '').trim()

  if (!name) {
    throw new Error('Category name is required')
  }

  return {
    name,
    description: description || null,
    is_active: body?.is_active !== false,
  }
}

const getRoutingRuleCountMap = async () => {
  await ensureRoutingRulesTable()

  const rows = await prisma.$queryRaw<RoutingRuleCategoryCountRow[]>(Prisma.sql`
    SELECT
      "CategoryId" AS category_id,
      COUNT(*) AS count
    FROM "RoutingRules"
    WHERE "CategoryId" IS NOT NULL
    GROUP BY "CategoryId"
  `)

  return new Map(rows.map((row) => [row.category_id, Number(row.count)]))
}

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.include_inactive === 'true' && req.user?.role === 'admin'
    const [categories, routingRuleCountMap] = await Promise.all([
      prisma.categories.findMany({
        where: includeInactive ? undefined : { IsActive: true },
        include: {
          Users: true,
          _count: {
            select: {
              Tickets: true,
              Subcategories: true,
            },
          },
        },
        orderBy: [{ IsActive: 'desc' }, { Name: 'asc' }],
      }),
      getRoutingRuleCountMap(),
    ])

    res.json(
      categories.map((category) => ({
        id: category.Id,
        name: category.Name,
        description: category.Description,
        is_active: category.IsActive,
        default_assignee_id: category.DefaultAssigneeId ?? null,
        default_assignee_name: category.Users?.FullName ?? null,
        ticket_count: category._count.Tickets,
        subcategory_count: category._count.Subcategories,
        routing_rule_count: routingRuleCountMap.get(category.Id) ?? 0,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load categories' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const payload = normalizePayload(req.body)
    const category = await prisma.categories.create({
      data: {
        Name: payload.name,
        Description: payload.description,
        IsActive: payload.is_active,
      },
    })

    res.status(201).json({
      id: category.Id,
      name: category.Name,
      description: category.Description,
      is_active: category.IsActive,
      default_assignee_id: category.DefaultAssigneeId ?? null,
      default_assignee_name: null,
      ticket_count: 0,
      subcategory_count: 0,
      routing_rule_count: 0,
    })
  } catch (err: any) {
    console.error(err)
    const isDuplicate = err?.code === 'P2002'
    const statusCode = isDuplicate || err.message === 'Category name is required' ? 400 : 500
    res.status(statusCode).json({
      error: isDuplicate ? 'A category with this name already exists' : err.message || 'Failed to create category',
    })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const categoryId = Number(req.params.id)
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      res.status(400).json({ error: 'Invalid category id' })
      return
    }

    const existing = await prisma.categories.findUnique({
      where: { Id: categoryId },
      include: {
        Users: true,
        _count: {
          select: {
            Tickets: true,
            Subcategories: true,
          },
        },
      },
    })

    if (!existing) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    const payload = normalizePayload(req.body)
    const category = await prisma.categories.update({
      where: { Id: categoryId },
      data: {
        Name: payload.name,
        Description: payload.description,
        IsActive: payload.is_active,
      },
      include: {
        Users: true,
        _count: {
          select: {
            Tickets: true,
            Subcategories: true,
          },
        },
      },
    })

    const routingRuleCountMap = await getRoutingRuleCountMap()

    res.json({
      id: category.Id,
      name: category.Name,
      description: category.Description,
      is_active: category.IsActive,
      default_assignee_id: category.DefaultAssigneeId ?? null,
      default_assignee_name: category.Users?.FullName ?? null,
      ticket_count: category._count.Tickets,
      subcategory_count: category._count.Subcategories,
      routing_rule_count: routingRuleCountMap.get(category.Id) ?? 0,
    })
  } catch (err: any) {
    console.error(err)
    const isDuplicate = err?.code === 'P2002'
    const statusCode = isDuplicate || ['Category name is required', 'Invalid category id'].includes(err.message) ? 400 : 500
    res.status(statusCode).json({
      error: isDuplicate ? 'A category with this name already exists' : err.message || 'Failed to update category',
    })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const categoryId = Number(req.params.id)
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      res.status(400).json({ error: 'Invalid category id' })
      return
    }

    const existing = await prisma.categories.findUnique({ where: { Id: categoryId } })
    if (!existing) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    await prisma.categories.update({
      where: { Id: categoryId },
      data: { IsActive: false },
    })

    res.status(204).send()
  } catch (err: any) {
    console.error(err)
    const statusCode = ['Category not found', 'Invalid category id'].includes(err.message) ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to delete category' })
  }
})

export default router
