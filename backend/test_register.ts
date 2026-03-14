import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    const roleRecord = await prisma.roles.findFirst({ where: { Name: 'Employee' } }) || await prisma.roles.findFirst()
    const companyRecord = await prisma.companies.findFirst({ where: { Name: 'Skymat' } }) || await prisma.companies.findFirst()
    const deptRecord = await prisma.departments.findFirst({ where: { Name: 'Operations' } }) || await prisma.departments.findFirst()

    console.log('Roles:', roleRecord)
    console.log('Company:', companyRecord)
    console.log('Dept:', deptRecord)

    const hashedPassword = await bcrypt.hash('2767@Jinu', 10)
    
    let user = await prisma.users.create({
      data: {
        Email: 'jinumathew767@gmail.com',
        FullName: `Jinu Mathew`.trim(),
        PasswordHash: hashedPassword,
        RoleId: roleRecord?.Id || 1,
        CompanyId: companyRecord?.Id || 1,
        DepartmentId: deptRecord?.Id || 1,
        Status: 'Active',
      }
    })
    console.log('Successfully created:', user)
  } catch (err) {
    console.error('Prisma Error creating user:', err)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
