import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Migrating Company Data...')

  // Rename existing companies so we don't break foreign keys for the Super Admin
  await prisma.companies.updateMany({
    where: { Name: 'Triton ME' },
    data: { Name: 'Triton Middle East LLC' }
  })
  
  await prisma.companies.updateMany({
    where: { Name: 'Skymat' },
    data: { Name: 'Skymat Building Materials Trading LLC' }
  })

  // Seed the remaining official companies
  const companies = [
    'Smart Insulation Finishing Systems LLC',
    'Innotech Polimers Manufacturing LLC',
    'Triton-UVC Division',
    'Panagia'
  ]

  for (const company of companies) {
    const existing = await prisma.companies.findFirst({ where: { Name: company } })
    if (!existing) {
       await prisma.companies.create({ data: { Name: company, IsActive: true } })
       console.log(`+ Created: ${company}`)
    }
  }

  console.log('Companies migrated successfully!')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
