import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)
  await prisma.users.update({
    where: { Email: 'jay@gmail.com' },
    data: { PasswordHash: hashedPassword }
  })
  console.log('Password for jay@gmail.com reset to password123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
