import { Prisma } from '@prisma/client'
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

const normalizeCategoryId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const normalizePayload = (body: any) => {
  const categoryId = normalizeCategoryId(body?.category_id)
  const name = String(body?.name || '').trim()

  if (!categoryId) throw new Error('Parent category is required')
  if (!name) throw new Error('Module name is required')

  return {
    category_id: categoryId,
    name,
    is_active: body?.is_active !== false,
  }
}

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categoryId = normalizeCategoryId(req.query.category_id)
    const includeInactive = req.query.include_inactive === 'true' && req.user?.role === 'admin'

    const subcategories = await prisma.subcategories.findMany({
      where: {
        ...(categoryId ? { CategoryId: categoryId } : {}),
        ...(includeInactive ? {} : { IsActive: true }),
      },
      include: {
        Categories: true,
        _count: {
          select: {
            Tickets: true,
          },
        },
      },
      orderBy: [{ IsActive: 'desc' }, { Name: 'asc' }],
    })

    res.json(
      subcategories.map((subcategory) => ({
        id: subcategory.Id,
        category_id: subcategory.CategoryId,
        category_name: subcategory.Categories.Name,
        name: subcategory.Name,
        is_active: subcategory.IsActive,
        ticket_count: subcategory._count.Tickets,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load modules' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const payload = normalizePayload(req.body)
    const parentCategory = await prisma.categories.findUnique({ where: { Id: payload.category_id } })
    if (!parentCategory) {
      res.status(400).json({ error: 'Parent category not found' })
      return
    }

    const duplicate = await prisma.subcategories.findFirst({
      where: {
        CategoryId: payload.category_id,
        Name: payload.name,
      },
    })
    if (duplicate) {
      res.status(400).json({ error: 'A module with this name already exists under the selected category' })
      return
    }

    const subcategory = await prisma.subcategories.create({
      data: {
        CategoryId: payload.category_id,
        Name: payload.name,
        IsActive: payload.is_active,
      },
      include: {
        Categories: true,
        _count: {
          select: {
            Tickets: true,
          },
        },
      },
    })

    res.status(201).json({
      id: subcategory.Id,
      category_id: subcategory.CategoryId,
      category_name: subcategory.Categories.Name,
      name: subcategory.Name,
      is_active: subcategory.IsActive,
      ticket_count: subcategory._count.Tickets,
    })
  } catch (err: any) {
    console.error(err)
    const statusCode = ['Parent category is required', 'Module name is required'].includes(err.message) ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to create module' })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const subcategoryId = Number(req.params.id)
    if (!Number.isInteger(subcategoryId) || subcategoryId < 1) {
      res.status(400).json({ error: 'Invalid module id' })
      return
    }

    const existing = await prisma.subcategories.findUnique({ where: { Id: subcategoryId } })
    if (!existing) {
      res.status(404).json({ error: 'Module not found' })
      return
    }

    const payload = normalizePayload({
      ...req.body,
      category_id: req.body?.category_id ?? existing.CategoryId,
    })
    const parentCategory = await prisma.categories.findUnique({ where: { Id: payload.category_id } })
    if (!parentCategory) {
      res.status(400).json({ error: 'Parent category not found' })
      return
    }

    const duplicate = await prisma.subcategories.findFirst({
      where: {
        CategoryId: payload.category_id,
        Name: payload.name,
        NOT: { Id: subcategoryId },
      },
    })
    if (duplicate) {
      res.status(400).json({ error: 'A module with this name already exists under the selected category' })
      return
    }

    const subcategory = await prisma.subcategories.update({
      where: { Id: subcategoryId },
      data: {
        CategoryId: payload.category_id,
        Name: payload.name,
        IsActive: payload.is_active,
      },
      include: {
        Categories: true,
        _count: {
          select: {
            Tickets: true,
          },
        },
      },
    })

    res.json({
      id: subcategory.Id,
      category_id: subcategory.CategoryId,
      category_name: subcategory.Categories.Name,
      name: subcategory.Name,
      is_active: subcategory.IsActive,
      ticket_count: subcategory._count.Tickets,
    })
  } catch (err: any) {
    console.error(err)
    const statusCode = ['Parent category is required', 'Module name is required'].includes(err.message) ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to update module' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!ensureAdmin(req, res)) return

    const subcategoryId = Number(req.params.id)
    if (!Number.isInteger(subcategoryId) || subcategoryId < 1) {
      res.status(400).json({ error: 'Invalid module id' })
      return
    }

    const existing = await prisma.subcategories.findUnique({ where: { Id: subcategoryId } })
    if (!existing) {
      res.status(404).json({ error: 'Module not found' })
      return
    }

    await prisma.subcategories.update({
      where: { Id: subcategoryId },
      data: { IsActive: false },
    })

    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete module' })
  }
})

export default router
