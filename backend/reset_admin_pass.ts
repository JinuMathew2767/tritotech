import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.users.update({
    where: { Email: 'admin@tritongroup.com' },
    data: { PasswordHash: hashedPassword }
  })
  console.log('Password for admin@tritongroup.com reset to admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
