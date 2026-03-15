import { Router, Response } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { createNotifications } from '../services/notificationsService'

const router = Router({ mergeParams: true }) // inherit :ticketId from parent

// Helper to format comment to React expected shape
const formatReactComment = (c: any) => ({
  id: c.Id,
  ticket_id: c.TicketId,
  body: c.CommentText,
  created_at: c.CreatedAt.toISOString(),
  author: {
    id: c.Users.Id,
    name: c.Users.FullName,
    avatar: null,
    role: c.Users.Roles?.Name?.toLowerCase().replace(' ', '_') || 'employee'
  }
})

const getActorName = (req: AuthRequest) => `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim() || 'Someone'

// GET /api/tickets/:ticketId/comments
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket_id = parseInt(req.params.ticketId as string)
    const comments = await prisma.ticketComments.findMany({
      where: { TicketId: ticket_id },
      include: { Users: { include: { Roles: true } } },
      orderBy: { CreatedAt: 'asc' }
    })

    res.json(comments.map(formatReactComment))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to load comments' })
  }
})

// POST /api/tickets/:ticketId/comments
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket_id = parseInt(req.params.ticketId as string)
    const { body, is_internal } = req.body

    const ticket = await prisma.tickets.findUnique({
      where: { Id: ticket_id },
      select: { Status: true, CreatedById: true, AssignedToId: true, TicketNumber: true }
    })

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    if ((ticket.Status || '').toLowerCase() === 'resolved') {
      res.status(409).json({ error: 'Resolved tickets are locked until they are reopened' })
      return
    }
    
    const comment = await prisma.ticketComments.create({
      data: { 
        CommentText: body, 
        TicketId: ticket_id, 
        UserId: req.user.id,
        IsInternal: is_internal === true || is_internal === 'true'
      },
      include: { Users: { include: { Roles: true } } }
    })

    await prisma.ticketActivityLogs.create({
      data: {
        TicketId: ticket_id,
        UserId: req.user.id,
        Action: 'comment_added',
        NewValue: body,
      }
    })

    const recipients = new Set<number>()
    const internalComment = is_internal === true || is_internal === 'true'

    if (!internalComment && ticket.CreatedById !== req.user.id) {
      recipients.add(ticket.CreatedById)
    }

    if (ticket.AssignedToId && ticket.AssignedToId !== req.user.id) {
      recipients.add(ticket.AssignedToId)
    }

    if (recipients.size > 0) {
      try {
        await createNotifications({
          userIds: Array.from(recipients),
          title: internalComment ? 'Internal update on a ticket' : 'New comment on a ticket',
          message: `${getActorName(req)} commented on ${ticket.TicketNumber}.`,
          ticketId: ticket_id,
        })
      } catch (error) {
        console.error('Failed to create comment notifications', error)
      }
    }

    res.status(201).json(formatReactComment(comment))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create comment' })
  }
})

export default router
