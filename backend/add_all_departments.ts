import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Migrating Full Department Data...')

  const departments = [
    'Accounts',
    'Admin',
    'Cleaning',
    'Dispatch',
    'Driver',
    'Finance',
    'HR & Admin',
    'Lab',
    'Maintenance',
    'Molding',
    'Packing',
    'Printing',
    'Production',
    'Purchase',
    'Q.C.',
    'R&D',
    'Sales',
    'Stores',
    'Tape',
    'Design',
    'Process and Compliance',
    'Logistics',
    'Order Management'
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
