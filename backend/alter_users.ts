import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Altering Users table to make CompanyId and DepartmentId nullable...')

  // Force SQL Server to drop the NOT NULL constraint by altering the columns to INT NULL
  await prisma.$executeRawUnsafe(`ALTER TABLE Users ALTER COLUMN CompanyId INT NULL;`)
  await prisma.$executeRawUnsafe(`ALTER TABLE Users ALTER COLUMN DepartmentId INT NULL;`)

  console.log('Successfully made CompanyId and DepartmentId optional in the Database!')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
