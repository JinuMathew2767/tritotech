import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    const roleRecord = await prisma.roles.findFirst({ where: { Name: 'Admin' } })
    const companyRecord = await prisma.companies.findFirst({ where: { Name: 'Triton ME' } })
    const deptRecord = await prisma.departments.findFirst({ where: { Name: 'IT Infrastructure' } })

    if (!roleRecord) {
      console.log('Admin role not found!')
      return
    }

    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    let user = await prisma.users.upsert({
      where: { Email: 'admin@tritongroup.com' },
      update: {
        PasswordHash: hashedPassword,
        RoleId: roleRecord.Id,
        CompanyId: companyRecord?.Id || 1,
        DepartmentId: deptRecord?.Id || 1,
      },
      create: {
        Email: 'admin@tritongroup.com',
        FullName: 'Super Admin',
        PasswordHash: hashedPassword,
        RoleId: roleRecord.Id,
        CompanyId: companyRecord?.Id || 1,
        DepartmentId: deptRecord?.Id || 1,
        Status: 'Active',
      }
    })
    console.log('Successfully created Admin Account:')
    console.log(`Email: ${user.Email}`)
    console.log(`Password: admin123`)
  } catch (err) {
    console.error('Prisma Error creating admin:', err)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
