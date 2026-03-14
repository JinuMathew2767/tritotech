import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database cleanup...')

  try {
    // 1. Delete all Tickets and their dependencies
    await prisma.ticketComments.deleteMany()
    await prisma.ticketAttachments.deleteMany()
    await prisma.ticketActivityLogs.deleteMany()
    await prisma.notifications.deleteMany()
    
    const deletedTickets = await prisma.tickets.deleteMany()
    console.log(`Deleted ${deletedTickets.count} tickets.`)

    // 2. Delete all Users EXCEPT the Admin
    const adminEmail = 'admin@tritongroup.com'
    const deletedUsers = await prisma.users.deleteMany({
      where: {
        Email: { not: adminEmail }
      }
    })
    console.log(`Deleted ${deletedUsers.count} mock users.`)

    console.log('Cleanup complete! Only the Super Admin remains.')
  } catch (err) {
    console.error('Error during cleanup:', err)
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
