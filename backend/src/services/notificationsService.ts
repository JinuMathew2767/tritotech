import { prisma } from '../db'

export interface PortalNotification {
  id: number
  title: string
  body: string
  read: boolean
  created_at: string
  ticket_id?: number
}

export const formatPortalNotification = (notification: {
  Id: number
  Title: string
  Message: string
  IsRead: boolean
  CreatedAt: Date
  TicketId: number | null
}): PortalNotification => ({
  id: notification.Id,
  title: notification.Title,
  body: notification.Message,
  read: notification.IsRead,
  created_at: notification.CreatedAt.toISOString(),
  ticket_id: notification.TicketId ?? undefined,
})

export const listNotificationsForUser = async (userId: number, take = 20) => {
  const [notifications, unread_count] = await Promise.all([
    prisma.notifications.findMany({
      where: { UserId: userId },
      orderBy: { CreatedAt: 'desc' },
      take,
    }),
    prisma.notifications.count({
      where: {
        UserId: userId,
        IsRead: false,
      },
    }),
  ])

  return {
    items: notifications.map(formatPortalNotification),
    unread_count,
  }
}

export const markNotificationRead = async (userId: number, notificationId: number) => {
  const result = await prisma.notifications.updateMany({
    where: {
      Id: notificationId,
      UserId: userId,
    },
    data: { IsRead: true },
  })

  return result.count > 0
}

export const markAllNotificationsRead = async (userId: number) =>
  prisma.notifications.updateMany({
    where: {
      UserId: userId,
      IsRead: false,
    },
    data: { IsRead: true },
  })

export const createNotifications = async ({
  userIds,
  title,
  message,
  ticketId,
}: {
  userIds: number[]
  title: string
  message: string
  ticketId?: number | null
}) => {
  const uniqueUserIds = Array.from(new Set(userIds.filter((value) => Number.isInteger(value) && value > 0)))

  if (!uniqueUserIds.length) {
    return
  }

  await prisma.notifications.createMany({
    data: uniqueUserIds.map((userId) => ({
      UserId: userId,
      TicketId: ticketId ?? null,
      Title: title,
      Message: message,
    })),
  })
}

export const getActiveAdminIds = async (excludeUserId?: number) => {
  const admins = await prisma.users.findMany({
    where: {
      Status: 'Active',
      Roles: { Name: 'Admin' },
      ...(excludeUserId ? { Id: { not: excludeUserId } } : {}),
    },
    select: { Id: true },
  })

  return admins.map((admin) => admin.Id)
}
