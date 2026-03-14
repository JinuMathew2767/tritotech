import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Migrating Department Data...')

  const departments = [
    'IT Infrastructure',
    'Operations',
    'Finance',
    'Human Resources',
    'Accounts',
    'Sales',
    'Marketing'
  ]

  for (const dept of departments) {
    const existing = await prisma.departments.findFirst({ where: { Name: dept } })
    if (!existing) {
       await prisma.departments.create({ data: { Name: dept, IsActive: true } })
       console.log(`+ Created: ${dept}`)
    }
  }

  console.log('Departments migrated successfully!')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
