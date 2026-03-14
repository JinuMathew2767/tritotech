import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Master Data...')

  // 1. Seed Roles
  const roles = ['Admin', 'IT Staff', 'Employee']
  for (const role of roles) {
    await prisma.roles.upsert({
      where: { Name: role },
      update: {},
      create: { Name: role }
    })
  }

  // 2. Seed Companies
  const companies = ['Triton ME', 'Skymat']
  for (const company of companies) {
    await prisma.companies.upsert({
      where: { Name: company },
      update: {},
      create: { Name: company, IsActive: true }
    })
  }

  // 3. Seed Departments
  const departments = ['IT Infrastructure', 'Operations', 'Finance', 'Human Resources']
  for (const dept of departments) {
    await prisma.departments.upsert({
      where: { Name: dept },
      update: {},
      create: { Name: dept, IsActive: true }
    })
  }

  // 4. Seed Categories
  const categories = ['Hardware', 'Software', 'Network', 'ERP & Business Systems', 'Email & Communication', 'Access & Security']
  for (const cat of categories) {
    await prisma.categories.upsert({
      where: { Name: cat },
      update: {},
      create: { Name: cat, IsActive: true }
    })
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
