import { Prisma } from '@prisma/client'
import { Router, Response } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { ensureAssetTables } from '../services/assetService'

const router = Router()

interface DepartmentRow {
  Id: number
  Name: string
  Location: string | null
  IsActive: boolean | number
  UserCount: number
  EmployeeCount: number
  TicketCount: number
}

const ensureAdmin = async (req: AuthRequest, res: Response): Promise<boolean> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required.' })
    return false
  }

  return true
}

const formatDepartment = (row: DepartmentRow) => ({
  id: row.Id,
  name: row.Name,
  location: row.Location || '',
  is_active: Boolean(row.IsActive),
  user_count: Number(row.UserCount || 0),
  employee_count: Number(row.EmployeeCount || 0),
  ticket_count: Number(row.TicketCount || 0),
})

const validateDepartmentPayload = (payload: unknown) => {
  const record = (payload ?? {}) as Record<string, unknown>
  const name = String(record.name ?? '').trim()
  const location = String(record.location ?? '').trim() || null
  const isActive = record.is_active === undefined ? true : Boolean(record.is_active)

  if (!name) {
    throw new Error('Department name is required')
  }

  return { name, location, isActive }
}

const getDepartmentRowById = async (departmentId: number) => {
  const rows = await prisma.$queryRaw<DepartmentRow[]>(Prisma.sql`
    SELECT
      department."Id",
      department."Name",
      department."Location",
      department."IsActive",
      (SELECT COUNT(*) FROM "Users" userRecord WHERE userRecord."DepartmentId" = department."Id") AS "UserCount",
      (SELECT COUNT(*) FROM "AssetEmployees" employeeRecord WHERE employeeRecord."DepartmentId" = department."Id" AND employeeRecord."IsActive" = TRUE) AS "EmployeeCount",
      (SELECT COUNT(*) FROM "Tickets" ticketRecord WHERE ticketRecord."DepartmentId" = department."Id") AS "TicketCount"
    FROM "Departments" AS department
    WHERE department."Id" = ${departmentId}
  `)

  return rows[0] ?? null
}

router.use(authenticate)
router.use(async (_req, _res, next) => {
  try {
    await ensureAssetTables()
    next()
  } catch (error) {
    next(error)
  }
})

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const includeInactive = String(req.query.include_inactive || '').toLowerCase() === 'true'
    const activeClause = includeInactive ? Prisma.empty : Prisma.sql`WHERE department."IsActive" = TRUE`

    const rows = await prisma.$queryRaw<DepartmentRow[]>(Prisma.sql`
      SELECT
        department."Id",
        department."Name",
        department."Location",
        department."IsActive",
        (SELECT COUNT(*) FROM "Users" userRecord WHERE userRecord."DepartmentId" = department."Id") AS "UserCount",
        (SELECT COUNT(*) FROM "AssetEmployees" employeeRecord WHERE employeeRecord."DepartmentId" = department."Id" AND employeeRecord."IsActive" = TRUE) AS "EmployeeCount",
        (SELECT COUNT(*) FROM "Tickets" ticketRecord WHERE ticketRecord."DepartmentId" = department."Id") AS "TicketCount"
      FROM "Departments" AS department
      ${activeClause}
      ORDER BY department."Name" ASC
    `)

    res.json(rows.map(formatDepartment))
  } catch (error: any) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load departments', details: error.message })
  }
})

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const payload = validateDepartmentPayload(req.body)
    const duplicate = await prisma.departments.findFirst({
      where: { Name: payload.name },
      select: { Id: true },
    })

    if (duplicate) {
      res.status(400).json({ error: 'Department already exists' })
      return
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "Departments" ("Name", "Location", "IsActive")
      VALUES (${payload.name}, ${payload.location}, ${payload.isActive})
    `)

    const created = await prisma.departments.findFirst({
      where: { Name: payload.name },
      orderBy: { Id: 'desc' },
      select: { Id: true },
    })

    if (!created) {
      res.status(500).json({ error: 'Failed to load created department' })
      return
    }

    const department = await getDepartmentRowById(created.Id)
    if (!department) {
      res.status(500).json({ error: 'Failed to load created department' })
      return
    }

    res.status(201).json(formatDepartment(department))
  } catch (error: any) {
    console.error(error)
    res.status(400).json({ error: error.message || 'Failed to create department' })
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const departmentId = Number(req.params.id)
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      res.status(400).json({ error: 'Department id is invalid' })
      return
    }

    const payload = validateDepartmentPayload(req.body)
    const existing = await prisma.departments.findUnique({
      where: { Id: departmentId },
      select: { Id: true },
    })

    if (!existing) {
      res.status(404).json({ error: 'Department not found' })
      return
    }

    const duplicate = await prisma.departments.findFirst({
      where: {
        Name: payload.name,
        Id: { not: departmentId },
      },
      select: { Id: true },
    })

    if (duplicate) {
      res.status(400).json({ error: 'Department already exists' })
      return
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Departments"
      SET
        "Name" = ${payload.name},
        "Location" = ${payload.location},
        "IsActive" = ${payload.isActive}
      WHERE "Id" = ${departmentId}
    `)

    const updated = await getDepartmentRowById(departmentId)
    if (!updated) {
      res.status(404).json({ error: 'Department not found' })
      return
    }

    res.json(formatDepartment(updated))
  } catch (error: any) {
    console.error(error)
    res.status(400).json({ error: error.message || 'Failed to update department' })
  }
})

router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const departmentId = Number(req.params.id)
    if (!Number.isInteger(departmentId) || departmentId < 1) {
      res.status(400).json({ error: 'Department id is invalid' })
      return
    }

    const existing = await prisma.departments.findUnique({
      where: { Id: departmentId },
      select: { Id: true },
    })

    if (!existing) {
      res.status(404).json({ error: 'Department not found' })
      return
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Departments"
      SET "IsActive" = ${false}
      WHERE "Id" = ${departmentId}
    `)

    res.status(204).send()
  } catch (error: any) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete department', details: error.message })
  }
})

export default router
