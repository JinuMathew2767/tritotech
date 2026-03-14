import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db'
import {
  getDepartmentAccessMode,
  getDepartmentAccessNames,
  getUserDepartmentAccess,
} from '../services/userDepartmentAccessService'

export interface AuthRequest extends Request {
  user?: any
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing active token' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any
    const user = await prisma.users.findUnique({ 
      where: { Id: decoded.userId },
      include: { Roles: true, Companies: true, Departments: true }
    })
    
    if (!user) {
      res.status(401).json({ error: 'User no longer exists' })
      return
    }

    const departmentAccess = await getUserDepartmentAccess(user.Id)
    
    req.user = {
      id: user.Id,
      first_name: user.FullName.split(' ')[0],
      last_name: user.FullName.split(' ').slice(1).join(' ') || '',
      email: user.Email,
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
      avatar: null,
      employee_id: null
    }
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
