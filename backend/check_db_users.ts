import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.users.findMany({
    include: { Roles: true, Companies: true, Departments: true }
  })
  console.log('--- USER DATA (WITH BRACKETS) ---')
  users.forEach(u => {
    console.log(`ID: ${u.Id} | Email: [${u.Email}] | Status: ${u.Status}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
