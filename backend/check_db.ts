import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.users.findMany({ take: 3 })
  console.log(`Users in DB: ${users.length}`)
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
