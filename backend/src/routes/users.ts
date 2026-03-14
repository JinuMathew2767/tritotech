import { Router, Response } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { emailService } from '../services/emailService'

const router = Router()

const formatUser = (u: any) => ({
  id: u.Id,
  first_name: u.FullName.split(' ')[0],
  last_name: u.FullName.split(' ').slice(1).join(' ') || '',
  email: u.Email,
  role: u.Roles?.Name?.toLowerCase().replace(' ', '_') || 'employee',
  company: u.Companies?.Name || '',
  department: u.Departments?.Name || '',
  status: u.Status?.toLowerCase() || 'pending',
  requested_at: (u.UpdatedAt || u.CreatedAt).toISOString(),
})

const toRoleLabel = (role: string) =>
  role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const resolveLookupIds = async ({
  role,
  company,
  department,
}: {
  role?: string
  company?: string
  department?: string
}) => {
  const data: Record<string, number | null> = {}

  if (role !== undefined) {
    const roleRecord = await prisma.roles.findFirst({ where: { Name: toRoleLabel(role) } })
    if (!roleRecord) throw new Error('Invalid role')
    data.RoleId = roleRecord.Id
  }

  if (company !== undefined) {
    if (!company) data.CompanyId = null
    else {
      const companyRecord = await prisma.companies.findFirst({ where: { Name: company } })
      if (!companyRecord) throw new Error('Invalid company')
      data.CompanyId = companyRecord.Id
    }
  }

  if (department !== undefined) {
    if (!department) data.DepartmentId = null
    else {
      const departmentRecord = await prisma.departments.findFirst({ where: { Name: department } })
      if (!departmentRecord) throw new Error('Invalid department')
      data.DepartmentId = departmentRecord.Id
    }
  }

  return data
}

const ensureAdmin = async (req: AuthRequest, res: Response): Promise<boolean> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required.' })
    return false
  }
  return true
}

const ensureNotLastAdmin = async ({
  targetUserId,
  nextRole,
  nextStatus,
}: {
  targetUserId: number
  nextRole?: string
  nextStatus?: string
}) => {
  const currentUser = await prisma.users.findUnique({
    where: { Id: targetUserId },
    include: { Roles: true },
  })

  if (!currentUser) throw new Error('User not found')

  const currentRole = currentUser.Roles?.Name?.toLowerCase().replace(' ', '_') || 'employee'
  const currentStatus = currentUser.Status?.toLowerCase() || 'pending'
  const finalRole = nextRole ?? currentRole
  const finalStatus = nextStatus ?? currentStatus
  const remainsActiveAdmin = finalRole === 'admin' && finalStatus === 'active'

  if (!remainsActiveAdmin && currentRole === 'admin' && currentStatus === 'active') {
    const activeAdmins = await prisma.users.count({
      where: {
        Status: 'Active',
        Roles: { Name: 'Admin' },
      },
    })

    if (activeAdmins <= 1) {
      throw new Error('You cannot remove or disable the last active admin')
    }
  }
}

router.get('/meta', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const [roles, companies, departments] = await Promise.all([
      prisma.roles.findMany({ orderBy: { Name: 'asc' } }),
      prisma.companies.findMany({ where: { IsActive: true }, orderBy: { Name: 'asc' } }),
      prisma.departments.findMany({ where: { IsActive: true }, orderBy: { Name: 'asc' } }),
    ])

    res.json({
      roles: roles.map((role) => ({
        id: role.Id,
        label: role.Name,
        value: role.Name.toLowerCase().replace(' ', '_'),
      })),
      companies: companies.map((company) => company.Name),
      departments: departments.map((department) => department.Name),
      statuses: ['pending', 'active', 'denied'],
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load user metadata', details: err.message })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const status = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : undefined
    const where = status ? { Status: status.charAt(0).toUpperCase() + status.slice(1) } : {}

    const users = await prisma.users.findMany({
      where,
      include: { Companies: true, Departments: true, Roles: true },
      orderBy: { UpdatedAt: 'desc' },
    })

    res.json(users.map(formatUser))
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message })
  }
})

router.patch('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email } = req.body
    const fullName = `${String(first_name || '').trim()} ${String(last_name || '').trim()}`.trim()
    const normalizedEmail = String(email || '').trim()

    if (!fullName || !normalizedEmail) {
      res.status(400).json({ error: 'First name, last name, and email are required' })
      return
    }

    const existing = await prisma.users.findFirst({
      where: {
        Email: normalizedEmail,
        Id: { not: req.user.id },
      },
    })

    if (existing) {
      res.status(400).json({ error: 'Email already in use by another account' })
      return
    }

    const user = await prisma.users.update({
      where: { Id: req.user.id },
      data: {
        Email: normalizedEmail,
        FullName: fullName,
      },
      include: { Companies: true, Departments: true, Roles: true },
    })

    res.json(formatUser(user))
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile', details: err.message })
  }
})

// GET /api/users/pending
router.get('/pending', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const pendingUsers = await prisma.users.findMany({
      where: { Status: 'Pending' },
      include: { Companies: true, Departments: true, Roles: true },
      orderBy: { CreatedAt: 'desc' }
    })

    res.json(
      pendingUsers.map((u: any) => ({
        ...formatUser(u),
        company: u.Companies?.Name || 'Unknown',
        department: u.Departments?.Name || 'Unknown',
        requested_at: u.CreatedAt.toISOString(),
      }))
    )
  } catch (err: any) {
    console.error('Error fetching pending users:', err)
    res.status(500).json({ error: 'Failed to fetch pending users', details: err.message })
  }
})

// GET /api/users/active
router.get('/active', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const activeUsers = await prisma.users.findMany({
      where: { Status: 'Active' },
      include: { Companies: true, Departments: true, Roles: true },
      orderBy: { UpdatedAt: 'desc' }
    })

    res.json(
      activeUsers.map((u: any) => ({
        ...formatUser(u),
        company: u.Companies?.Name || 'Unknown',
        department: u.Departments?.Name || 'Unknown',
      }))
    )
  } catch (err: any) {
    console.error('Error fetching active users:', err)
    res.status(500).json({ error: 'Failed to fetch active users', details: err.message })
  }
})

// GET /api/users/denied
router.get('/denied', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const deniedUsers = await prisma.users.findMany({
      where: { Status: 'Denied' },
      include: { Companies: true, Departments: true, Roles: true },
      orderBy: { UpdatedAt: 'desc' }
    })

    res.json(
      deniedUsers.map((u: any) => ({
        ...formatUser(u),
        company: u.Companies?.Name || 'Unknown',
        department: u.Departments?.Name || 'Unknown',
      }))
    )
  } catch (err: any) {
    console.error('Error fetching denied users:', err)
    res.status(500).json({ error: 'Failed to fetch denied users', details: err.message })
  }
})

// PUT /api/users/:id/approve
router.put('/:id/approve', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const { company, department } = req.body
    const userId = parseInt(req.params.id as string)

    const updateData: any = { Status: 'Active' }

    if (company) {
      const companyRecord = await prisma.companies.findFirst({ where: { Name: company } })
      if (companyRecord) updateData.CompanyId = companyRecord.Id
    }
    if (department) {
      const deptRecord = await prisma.departments.findFirst({ where: { Name: department } })
      if (deptRecord) updateData.DepartmentId = deptRecord.Id
    }

    const user = await prisma.users.update({
      where: { Id: userId },
      data: updateData
    })

    await emailService.sendAccountApprovedEmail({
      to: user.Email,
      fullName: user.FullName,
    })

    res.json({ message: 'User approved' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user' })
  }
})

// PUT /api/users/:id/deny
router.put('/:id/deny', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const userId = parseInt(req.params.id as string)
    await ensureNotLastAdmin({ targetUserId: userId, nextStatus: 'denied' })
    const user = await prisma.users.update({
      where: { Id: userId },
      data: { Status: 'Denied' } // Or Deleted
    })

    await emailService.sendAccountDeniedEmail({
      to: user.Email,
      fullName: user.FullName,
    })

    res.json({ message: 'User denied' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to deny user' })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAdmin(req, res))) return

    const userId = parseInt(req.params.id as string)
    const {
      first_name,
      last_name,
      email,
      role,
      company,
      department,
      status,
    } = req.body

    const fullName = `${String(first_name || '').trim()} ${String(last_name || '').trim()}`.trim()
    const normalizedEmail = String(email || '').trim()
    const normalizedStatus = status ? String(status).toLowerCase() : undefined

    if (!fullName || !normalizedEmail) {
      res.status(400).json({ error: 'First name, last name, and email are required' })
      return
    }

    const existing = await prisma.users.findFirst({
      where: {
        Email: normalizedEmail,
        Id: { not: userId },
      },
    })

    if (existing) {
      res.status(400).json({ error: 'Email already in use by another account' })
      return
    }

    if (normalizedStatus && !['pending', 'active', 'denied'].includes(normalizedStatus)) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    await ensureNotLastAdmin({ targetUserId: userId, nextRole: role, nextStatus: normalizedStatus })
    const lookupIds = await resolveLookupIds({ role, company, department })

    const user = await prisma.users.update({
      where: { Id: userId },
      data: {
        Email: normalizedEmail,
        FullName: fullName,
        ...(normalizedStatus ? { Status: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) } : {}),
        ...lookupIds,
      },
      include: { Companies: true, Departments: true, Roles: true },
    })

    res.json(formatUser(user))
  } catch (err: any) {
    const statusCode = ['User not found', 'Invalid role', 'Invalid company', 'Invalid department', 'You cannot remove or disable the last active admin'].includes(err.message) ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to update user' })
  }
})

export default router
