import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { emailService } from '../services/emailService'
import {
  getDepartmentAccessMode,
  getDepartmentAccessNames,
  getUserDepartmentAccess,
} from '../services/userDepartmentAccessService'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const IS_LOCAL_FALLBACK_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  /localhost|127\.0\.0\.1/i.test(FRONTEND_URL)

const buildPasswordResetToken = (user: any) =>
  jwt.sign(
    {
      type: 'password_reset',
      userId: user.Id,
      passwordFingerprint: (user.PasswordHash || '').slice(-12),
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  )

const buildAccessToken = (user: { id: number; role: string }) =>
  jwt.sign({ userId: user.id, role: user.role, type: 'access' }, JWT_SECRET, { expiresIn: '8h' })

const buildRefreshToken = (user: { id: number; role: string }) =>
  jwt.sign({ userId: user.id, role: user.role, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '30d' })

const formatReactUser = async (user: any) => {
  const departmentAccess = await getUserDepartmentAccess(user.Id)

  return {
    id: user.Id,
    first_name: user.FullName.split(' ')[0],
    last_name: user.FullName.split(' ').slice(1).join(' ') || '',
    email: user.Email,
    mobile_number: user.MobileNumber || '',
    role: user.Roles?.Name?.toLowerCase().replace(' ', '_') || 'employee',
    company: user.Companies?.Name || '',
    department: user.Departments?.Name || '',
    department_access: getDepartmentAccessNames({
      primaryDepartmentName: user.Departments?.Name,
      departmentAccessNames: departmentAccess.names,
    }),
    department_access_mode: getDepartmentAccessMode({
      primaryDepartmentName: user.Departments?.Name,
      departmentAccessNames: departmentAccess.names,
    }),
    avatar: null, // Avatar support can be added later
    employee_id: null,
  }
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, first_name, last_name, company, department, role } = req.body
    
    const existing = await prisma.users.findUnique({ where: { Email: email } })
    if (existing) {
      res.status(400).json({ error: 'Email already registered' })
      return
    }

    // Lookup Foreign Keys or Default to 1 if not string perfectly matches
    const roleRecord = await prisma.roles.findFirst({ where: { Name: role || 'Employee' } })
    const companyRecord = company ? await prisma.companies.findFirst({ where: { Name: company } }) : null
    const deptRecord = department ? await prisma.departments.findFirst({ where: { Name: department } }) : null

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.users.create({
      data: {
        Email: email,
        FullName: `${first_name} ${last_name}`.trim(),
        PasswordHash: hashedPassword,
        RoleId: roleRecord?.Id || 1,
        CompanyId: companyRecord?.Id || null,
        DepartmentId: deptRecord?.Id || null,
        Status: 'Pending',
      },
      include: { Roles: true, Companies: true, Departments: true }
    })

    await emailService.sendApprovalRequestEmail({
      fullName: user.FullName,
      email: user.Email,
      role: roleRecord?.Name || role || 'Employee',
      company: companyRecord?.Name,
      department: deptRecord?.Name,
    })

    res.json({ message: 'Registration successful! Your account is pending admin approval.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error during registration' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    console.log(`[LOGIN ATTEMPT] Email: "${email}", Password Length: ${password?.length}`)
    
    const user = await prisma.users.findUnique({ 
      where: { Email: email },
      include: { Roles: true, Companies: true, Departments: true }
    })
    
    if (!user || !user.PasswordHash || !(await bcrypt.compare(password, user.PasswordHash))) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    if (user.Status !== 'Active') {
      res.status(401).json({ error: 'Account pending admin approval' })
      return
    }

    const reactUser = await formatReactUser(user)
    res.json({
      access: buildAccessToken({ id: reactUser.id, role: reactUser.role }),
      refresh: buildRefreshToken({ id: reactUser.id, role: reactUser.role }),
      user: reactUser
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error during login' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refresh } = req.body
  if (!refresh) {
    res.status(400).json({ error: 'Refresh token required' })
    return
  }
  try {
    const decoded = jwt.verify(refresh, REFRESH_SECRET) as any
    if (decoded.type !== 'refresh') {
      res.status(401).json({ error: 'Invalid refresh token' })
      return
    }

    const user = await prisma.users.findUnique({
      where: { Id: decoded.userId },
      include: { Roles: true, Companies: true, Departments: true }
    })

    if (!user || user.Status !== 'Active') {
      res.status(401).json({ error: 'Refresh token is no longer valid' })
      return
    }

    const reactUser = await formatReactUser(user)
    res.json({ access: buildAccessToken({ id: reactUser.id, role: reactUser.role }) })
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
})

router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.status(204).send()
})

// POST /api/auth/password-reset
router.post('/password-reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body?.email || '').trim()

    if (!email) {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    const user = await prisma.users.findUnique({ where: { Email: email } })
    const genericMessage = 'If an account exists for that email, a reset link has been generated.'

    if (!user?.PasswordHash) {
      res.json({ message: genericMessage })
      return
    }

    const resetToken = buildPasswordResetToken(user)
    const resetUrl = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`

    const emailSent = await emailService.sendPasswordResetEmail({
      to: user.Email,
      fullName: user.FullName,
      resetUrl,
    })

    if (emailService.isConfigured() && !emailSent) {
      if (!IS_LOCAL_FALLBACK_ENABLED) {
        res.status(502).json({ error: 'Unable to send reset email right now. Please try again later.' })
        return
      }

      console.warn(`[PASSWORD RESET] Email delivery failed, returning local reset link for ${email}`)
      res.json({
        message: 'Email delivery is unavailable right now. Use the local reset link below.',
        resetToken,
        resetUrl,
        deliveryMethod: 'local_fallback',
      })
      return
    }

    if (!emailSent) {
      console.log(`\n\n[PASSWORD RESET] Reset link for ${email}: ${resetUrl}\n\n`)
    }

    res.json({
      message: genericMessage,
      ...(emailService.isConfigured()
        ? { deliveryMethod: 'email' }
        : { resetToken, resetUrl, deliveryMethod: 'local_fallback' }),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create password reset link' })
  }
})

// POST /api/auth/password-reset/confirm
router.post('/password-reset/confirm', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = String(req.body?.token || '')
    const password = String(req.body?.password || '')

    if (!token || !password) {
      res.status(400).json({ error: 'Reset token and new password are required' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' })
      return
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (decoded.type !== 'password_reset') {
      res.status(400).json({ error: 'Invalid reset token' })
      return
    }

    const user = await prisma.users.findUnique({ where: { Id: decoded.userId } })
    if (!user?.PasswordHash) {
      res.status(400).json({ error: 'Invalid reset token' })
      return
    }

    if ((user.PasswordHash || '').slice(-12) !== decoded.passwordFingerprint) {
      res.status(400).json({ error: 'This reset link has already been used or is no longer valid' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.users.update({
      where: { Id: user.Id },
      data: { PasswordHash: hashedPassword },
    })

    res.json({ message: 'Password reset successful. You can now sign in.' })
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(400).json({ error: 'This reset link has expired. Please request a new one.' })
      return
    }

    console.error(err)
    res.status(400).json({ error: 'Invalid reset token' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(req.user)
})

export default router
