import { Router, Response } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { findMatchingRoutingRule } from '../services/routingRulesService'
import { createNotifications, getActiveAdminIds } from '../services/notificationsService'
import { getTicketDepartmentAccessMap, syncTicketDepartmentAccess } from '../services/ticketDepartmentAccessService'
import { getUserDepartmentAccess } from '../services/userDepartmentAccessService'

const router = Router()
const ACTIVE_STATUSES = ['Open', 'Assigned Pending', 'In Progress'] as const
const STARTABLE_STATUSES = ['Open', 'Assigned Pending', 'In Progress'] as const

const isSupportUser = (role?: string) => role === 'admin' || role === 'it_staff'
const getActorName = (req: AuthRequest) => `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim() || 'System'

const ensureAssignableSupportUser = async (userId: number) => {
  const user = await prisma.users.findUnique({
    where: { Id: userId },
    include: { Roles: true },
  })

  const role = user?.Roles?.Name || ''
  if (!user || user.Status !== 'Active' || !['IT Staff', 'Admin'].includes(role)) {
    throw new Error('Assignee must be an active IT staff or admin user')
  }

  return user
}

const createActivityLog = async ({
  ticketId,
  userId,
  action,
  oldValue,
  newValue,
}: {
  ticketId: number
  userId: number
  action: string
  oldValue?: string | null
  newValue?: string | null
}) => {
  try {
    await prisma.ticketActivityLogs.create({
      data: {
        TicketId: ticketId,
        UserId: userId,
        Action: action,
        OldValue: oldValue ?? null,
        NewValue: newValue ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to write ticket activity log', error)
  }
}

const safeCreateNotifications = async ({
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
  try {
    await createNotifications({ userIds, title, message, ticketId })
  } catch (error) {
    console.error('Failed to create notifications', error)
  }
}

const getTicketDepartmentNames = (ticket: any, departmentNames: string[]) => {
  if (departmentNames.length > 0) return departmentNames
  if (ticket.Departments?.Name) return [ticket.Departments.Name]
  return []
}

const formatReactTicket = (t: any, departmentNames: string[] = []) => {
  const status = t.Status.toLowerCase().replace(/\s+/g, '_')
  const actualResolutionDate = t.ClosedAt || t.ResolvedAt || null
  const slaDueDate = t.SupportExpectedResolutionAt || t.CustomerExpectedResolutionAt || null
  const resolvedDepartmentNames = getTicketDepartmentNames(t, departmentNames)

  let slaStatus: 'none' | 'on_track' | 'overdue' | 'resolved_on_time' | 'resolved_late' = 'none'
  if (slaDueDate) {
    if (actualResolutionDate) {
      slaStatus = actualResolutionDate <= slaDueDate ? 'resolved_on_time' : 'resolved_late'
    } else {
      slaStatus = slaDueDate < new Date() ? 'overdue' : 'on_track'
    }
  }

  return {
    id: t.Id,
    ticket_number: t.TicketNumber,
    subject: t.Title,
    description: t.Description,
    status,
    priority: t.Priority.toLowerCase(),
    category: t.Categories?.Name || 'General',
    subcategory: t.Subcategories?.Name,
    company: t.Companies?.Name || 'Triton ME',
    department: resolvedDepartmentNames.join(', '),
    departments: resolvedDepartmentNames,
    created_at: t.CreatedAt.toISOString(),
    updated_at: t.UpdatedAt.toISOString(),
    customer_expected_resolution_at: t.CustomerExpectedResolutionAt ? t.CustomerExpectedResolutionAt.toISOString() : null,
    support_expected_resolution_at: t.SupportExpectedResolutionAt ? t.SupportExpectedResolutionAt.toISOString() : null,
    actual_resolution_at: actualResolutionDate ? actualResolutionDate.toISOString() : null,
    sla_due: slaDueDate ? slaDueDate.toISOString() : null,
    sla_status: slaStatus,
    created_by: {
      id: t.Users_Tickets_CreatedByIdToUsers?.Id,
      name: t.Users_Tickets_CreatedByIdToUsers ? t.Users_Tickets_CreatedByIdToUsers.FullName : 'Unknown',
      avatar: null,
    },
    assigned_to: t.Users_Tickets_AssignedToIdToUsers
      ? {
          id: t.Users_Tickets_AssignedToIdToUsers.Id,
          name: t.Users_Tickets_AssignedToIdToUsers.FullName,
          avatar: null,
        }
      : undefined,
    assignee_name: t.Users_Tickets_AssignedToIdToUsers ? t.Users_Tickets_AssignedToIdToUsers.FullName : undefined,
  }
}

const formatReactTickets = async (tickets: any[]) => {
  const departmentMap = await getTicketDepartmentAccessMap(tickets.map((ticket) => ticket.Id))
  return tickets.map((ticket) => formatReactTicket(ticket, departmentMap.get(ticket.Id)?.names || []))
}

const toDbStatus = (status: string) => {
  if (status === 'open') return 'Open'
  if (status === 'assigned_pending') return 'Assigned Pending'
  if (status === 'in_progress') return 'In Progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const ticketIncludes = {
  Categories: true,
  Subcategories: true,
  Companies: true,
  Departments: true,
  Users_Tickets_CreatedByIdToUsers: true,
  Users_Tickets_AssignedToIdToUsers: true,
}

const hoursBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / (1000 * 60 * 60)

const getRecentDays = (count: number) => {
  const dates: Date[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now)
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - i)
    dates.push(date)
  }
  return dates
}

const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate()

const getStatsPayload = async () => {
  const [tickets, activityLogs] = await Promise.all([
    prisma.tickets.findMany({
      include: {
        Companies: true,
        Departments: true,
        Users_Tickets_AssignedToIdToUsers: true,
      },
    }),
    prisma.ticketActivityLogs.findMany({
      take: 25,
      orderBy: { CreatedAt: 'desc' },
      include: {
        Users: true,
        Tickets: true,
      },
    }),
  ])
  const ticketDepartmentMap = await getTicketDepartmentAccessMap(tickets.map((ticket) => ticket.Id))

  const activeTickets = tickets.filter((ticket) =>
    ACTIVE_STATUSES.includes(ticket.Status as (typeof ACTIVE_STATUSES)[number])
  )
  const resolvedTickets = tickets.filter((ticket) => ticket.Status === 'Resolved')
  const unassignedTickets = tickets.filter((ticket) => !ticket.AssignedToId && ticket.Status !== 'Resolved')
  const overdueTickets = tickets.filter(
    (ticket) =>
      ticket.Status !== 'Resolved' &&
      !!ticket.SupportExpectedResolutionAt &&
      ticket.SupportExpectedResolutionAt < new Date()
  )

  const completedTickets = resolvedTickets.filter((ticket) => ticket.ResolvedAt || ticket.ClosedAt)

  const avg = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

  const customerHours = completedTickets
    .filter((ticket) => ticket.CustomerExpectedResolutionAt)
    .map((ticket) => hoursBetween(ticket.CreatedAt, ticket.CustomerExpectedResolutionAt as Date))
  const supportHours = completedTickets
    .filter((ticket) => ticket.SupportExpectedResolutionAt)
    .map((ticket) => hoursBetween(ticket.CreatedAt, ticket.SupportExpectedResolutionAt as Date))
  const actualHours = completedTickets.map((ticket) =>
    hoursBetween(ticket.CreatedAt, (ticket.ClosedAt || ticket.ResolvedAt) as Date)
  )

  const metCustomerExpectation = completedTickets.filter((ticket) => {
    const actual = ticket.ClosedAt || ticket.ResolvedAt
    return ticket.CustomerExpectedResolutionAt && actual && actual <= ticket.CustomerExpectedResolutionAt
  }).length

  const metSupportProposal = completedTickets.filter((ticket) => {
    const actual = ticket.ClosedAt || ticket.ResolvedAt
    return ticket.SupportExpectedResolutionAt && actual && actual <= ticket.SupportExpectedResolutionAt
  }).length

  const buildBreakdown = (key: 'Companies' | 'Departments') => {
    const bucket = new Map<
      string,
      { total: number; open: number; resolved: number; overdue: number; slaMet: number; completed: number }
    >()

    tickets.forEach((ticket) => {
      const names =
        key === 'Companies'
          ? [ticket[key]?.Name || 'Unassigned']
          : (() => {
              const departmentNames = getTicketDepartmentNames(ticket, ticketDepartmentMap.get(ticket.Id)?.names || [])
              return departmentNames.length ? departmentNames : ['Unassigned']
            })()

      names.forEach((name) => {
        const item = bucket.get(name) || { total: 0, open: 0, resolved: 0, overdue: 0, slaMet: 0, completed: 0 }
        item.total += 1
        if (ticket.Status !== 'Resolved') item.open += 1
        if (ticket.Status === 'Resolved') item.resolved += 1
        if (ticket.Status !== 'Resolved' && ticket.SupportExpectedResolutionAt && ticket.SupportExpectedResolutionAt < new Date()) {
          item.overdue += 1
        }
        const actual = ticket.ClosedAt || ticket.ResolvedAt
        if (actual && ticket.SupportExpectedResolutionAt) {
          item.completed += 1
          if (actual <= ticket.SupportExpectedResolutionAt) item.slaMet += 1
        }
        bucket.set(name, item)
      })
    })

    return Array.from(bucket.entries())
      .map(([name, item]) => ({
        name,
        total: item.total,
        open: item.open,
        resolved: item.resolved,
        overdue: item.overdue,
        sla_met_pct: item.completed ? (item.slaMet / item.completed) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }

  const recentDays = getRecentDays(7)
  const daily_trend = recentDays.map((date) => {
    const created = tickets.filter((ticket) => sameDay(ticket.CreatedAt, date)).length
    const resolved = tickets.filter((ticket) => {
      const actual = ticket.ClosedAt || ticket.ResolvedAt
      return actual ? sameDay(actual, date) : false
    }).length

    return {
      date: date.toISOString(),
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      created,
      resolved,
    }
  })

  const assigneeMap = new Map<number, { id: number; name: string; resolved: number; resolutionHours: number[] }>()
  completedTickets.forEach((ticket) => {
    const assignee = ticket.Users_Tickets_AssignedToIdToUsers
    const actual = ticket.ClosedAt || ticket.ResolvedAt
    if (!assignee || !actual) return
    const item = assigneeMap.get(assignee.Id) || {
      id: assignee.Id,
      name: assignee.FullName,
      resolved: 0,
      resolutionHours: [],
    }
    item.resolved += 1
    item.resolutionHours.push(hoursBetween(ticket.CreatedAt, actual))
    assigneeMap.set(assignee.Id, item)
  })

  const agent_leaderboard = Array.from(assigneeMap.values())
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      resolved: agent.resolved,
      avg_resolution_hours: avg(agent.resolutionHours),
    }))
    .sort((a, b) => b.resolved - a.resolved)
    .slice(0, 10)

  const status_breakdown = [
    { label: 'Open', value: tickets.filter((ticket) => ticket.Status === 'Open').length },
    { label: 'Assigned Pending', value: tickets.filter((ticket) => ticket.Status === 'Assigned Pending').length },
    { label: 'In Progress', value: tickets.filter((ticket) => ticket.Status === 'In Progress').length },
    { label: 'Resolved', value: resolvedTickets.length },
  ]

  const recent_activity = activityLogs.map((log) => ({
    id: log.Id,
    actor: log.Users?.FullName || 'System',
    action: log.Action,
    category: 'TICKET',
    created_at: log.CreatedAt.toISOString(),
    ticket_id: log.TicketId,
    ticket_number: log.Tickets?.TicketNumber || null,
    old_value: log.OldValue,
    new_value: log.NewValue,
  }))

  return {
    active: activeTickets.length,
    resolved: resolvedTickets.length,
    total: tickets.length,
    unassigned: unassignedTickets.length,
    overdue: overdueTickets.length,
    sla_analysis: {
      total_closed: completedTickets.length,
      avg_customer_expected_hours: avg(customerHours),
      avg_support_expected_hours: avg(supportHours),
      avg_actual_resolution_hours: avg(actualHours),
      met_customer_expectation_pct: completedTickets.length ? (metCustomerExpectation / completedTickets.length) * 100 : 0,
      met_support_proposal_pct: completedTickets.length ? (metSupportProposal / completedTickets.length) * 100 : 0,
    },
    status_breakdown,
    company_breakdown: buildBreakdown('Companies'),
    department_breakdown: buildBreakdown('Departments'),
    daily_trend,
    agent_leaderboard,
    recent_activity,
  }
}

router.get('/stats', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = await getStatsPayload()
    res.json(payload)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch layout stats' })
  }
})

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    status,
    exclude_status,
    page = '1',
    page_size = '10',
    assigned_to_me,
    assigned_only,
    unassigned_only,
    reopened_only,
    assigned_to,
    date_from,
    date_to,
    search,
  } = req.query
  try {
    const where: any = {}

    if (status) {
      where.Status = toDbStatus(String(status))
    }

    const shouldIgnoreAssignedPendingExclusion =
      assigned_only === 'true' && String(exclude_status || '') === 'assigned_pending'

    if (exclude_status && !status && !shouldIgnoreAssignedPendingExclusion) {
      where.Status = { not: toDbStatus(String(exclude_status)) }
    }

    if (assigned_to_me === 'true' && req.user?.id) {
      where.AssignedToId = req.user.id
    }

    if (assigned_only === 'true') {
      where.AssignedToId = where.AssignedToId ?? { not: null }
    }

    if (unassigned_only === 'true') {
      where.AssignedToId = null
      where.Status = where.Status ?? { not: 'Resolved' }
    }

    if (assigned_to && req.user?.role === 'admin') {
      const assignedToId = Number(assigned_to)
      if (Number.isInteger(assignedToId) && assignedToId > 0) {
        where.AssignedToId = assignedToId
      }
    }

    const createdAtFilter: Record<string, Date> = {}
    if (typeof date_from === 'string' && date_from) {
      const fromDate = new Date(`${date_from}T00:00:00`)
      if (!Number.isNaN(fromDate.getTime())) {
        createdAtFilter.gte = fromDate
      }
    }
    if (typeof date_to === 'string' && date_to) {
      const toDate = new Date(`${date_to}T23:59:59.999`)
      if (!Number.isNaN(toDate.getTime())) {
        createdAtFilter.lte = toDate
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      where.CreatedAt = createdAtFilter
    }

    if (search && String(search).trim()) {
      const query = String(search).trim()
      where.OR = [
        { TicketNumber: { contains: query } },
        { Title: { contains: query } },
        { Description: { contains: query } },
      ]
    }

    if (req.user?.role === 'employee') {
      where.CreatedById = req.user.id
    }

    if (reopened_only === 'true') {
      where.Status = { in: [...ACTIVE_STATUSES] }
      where.TicketActivityLogs = {
        some: {
          Action: 'ticket_updated',
          OR: [
            { NewValue: { contains: 'status:Resolved->Open' } },
            { NewValue: { contains: 'status:Resolved->Assigned Pending' } },
            { NewValue: { contains: 'status:Resolved->In Progress' } },
          ],
        },
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(page_size as string)

    const [tickets, count] = await Promise.all([
      prisma.tickets.findMany({
        where,
        skip,
        take: parseInt(page_size as string),
        include: ticketIncludes,
        orderBy: { UpdatedAt: 'desc' },
      }),
      prisma.tickets.count({ where }),
    ])

    res.json({ results: await formatReactTickets(tickets), count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
})

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subject, description, priority, category, subcategory, company, department, departments, customer_expected_resolution_at } = req.body

    const count = await prisma.tickets.count()
    const ticket_number = `INC-${1000 + count}`

    const categoryRecord = await prisma.categories.findFirst({ where: { Name: category, IsActive: true } })

    if (!categoryRecord) {
      res.status(400).json({ error: 'Please select a valid active category' })
      return
    }
    const subcategoryRecord = subcategory
      ? await prisma.subcategories.findFirst({
          where: {
            Name: subcategory,
            CategoryId: categoryRecord.Id,
            IsActive: true,
          },
        })
      : null

    if (subcategory && !subcategoryRecord) {
      res.status(400).json({ error: 'Please select a valid active subcategory' })
      return
    }
    const creator = await prisma.users.findUnique({
      where: { Id: req.user.id },
      include: { Companies: true, Departments: true },
    })
    if (!creator) {
      res.status(404).json({ error: 'Creator account not found' })
      return
    }

    const companyRecord = company ? await prisma.companies.findFirst({ where: { Name: company, IsActive: true } }) : null
    const requestedDepartmentNames = Array.from(
      new Set(
        (Array.isArray(departments) ? departments : [department])
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    )
    const departmentRecords = requestedDepartmentNames.length
      ? await prisma.departments.findMany({
          where: {
            Name: { in: requestedDepartmentNames },
            IsActive: true,
          },
          select: { Id: true, Name: true },
        })
      : []
    const isEmployee = req.user?.role === 'employee'
    const departmentAccess = await getUserDepartmentAccess(req.user.id)

    if (isEmployee) {
      if (!creator.CompanyId) {
        res.status(403).json({ error: 'Your account must be assigned to a company before creating tickets' })
        return
      }

      if (companyRecord && companyRecord.Id !== creator.CompanyId) {
        res.status(403).json({ error: 'You can only create tickets for your assigned company' })
        return
      }

      if (!requestedDepartmentNames.length) {
        res.status(400).json({ error: 'Please choose at least one valid active department' })
        return
      }

      if (departmentRecords.length !== requestedDepartmentNames.length) {
        res.status(400).json({ error: 'Please choose valid active departments' })
        return
      }

      if (creator.DepartmentId && departmentRecords.some((departmentRecord) => departmentRecord.Id !== creator.DepartmentId)) {
        res.status(403).json({ error: 'You can only create tickets for your assigned department' })
        return
      }

      if (
        !creator.DepartmentId &&
        departmentAccess.ids.length > 0 &&
        departmentRecords.some((departmentRecord) => !departmentAccess.ids.includes(departmentRecord.Id))
      ) {
        res.status(403).json({ error: 'You can only create tickets for your permitted departments' })
        return
      }
    }

    if (!isEmployee && requestedDepartmentNames.length && departmentRecords.length !== requestedDepartmentNames.length) {
      res.status(400).json({ error: 'Please choose valid active departments' })
      return
    }

    const effectiveCompanyId = isEmployee ? creator.CompanyId : companyRecord?.Id || creator.CompanyId || null
    const orderedDepartmentRecords = requestedDepartmentNames
      .map((name) => departmentRecords.find((departmentRecord) => departmentRecord.Name === name))
      .filter((departmentRecord): departmentRecord is { Id: number; Name: string } => Boolean(departmentRecord))
    const effectiveDepartmentId =
      orderedDepartmentRecords[0]?.Id || (isEmployee ? creator.DepartmentId : creator.DepartmentId || null)
    const createdAt = new Date()
    let matchedRoutingRule = null
    const routingDepartmentIds = orderedDepartmentRecords.length
      ? orderedDepartmentRecords.map((departmentRecord) => departmentRecord.Id)
      : effectiveDepartmentId
        ? [effectiveDepartmentId]
        : []

    for (const departmentId of routingDepartmentIds) {
      matchedRoutingRule = await findMatchingRoutingRule({
        companyId: effectiveCompanyId,
        departmentId,
        categoryId: categoryRecord?.Id || null,
      })
      if (matchedRoutingRule) break
    }
    const assignedToId = matchedRoutingRule?.assignee_user_id || categoryRecord?.DefaultAssigneeId || null
    const initialStatus = assignedToId ? 'Assigned Pending' : 'Open'

    if (customer_expected_resolution_at) {
      const customerExpected = new Date(customer_expected_resolution_at)
      if (customerExpected < createdAt) {
        res.status(400).json({ error: 'Customer expected resolution must be after ticket creation time' })
        return
      }
    }

    const ticket = await prisma.tickets.create({
      data: {
        TicketNumber: ticket_number,
        Title: subject,
        Description: description,
        Priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        CategoryId: categoryRecord.Id,
        SubcategoryId: subcategoryRecord?.Id ?? null,
        CompanyId: effectiveCompanyId || 1,
        DepartmentId: effectiveDepartmentId || 1,
        AssignedToId: assignedToId,
        Status: initialStatus,
        CreatedById: req.user.id,
        CustomerExpectedResolutionAt: customer_expected_resolution_at ? new Date(customer_expected_resolution_at) : null,
      },
      include: ticketIncludes,
    })
    await syncTicketDepartmentAccess(
      ticket.Id,
      orderedDepartmentRecords.length
        ? orderedDepartmentRecords.map((departmentRecord) => departmentRecord.Id)
        : effectiveDepartmentId
          ? [effectiveDepartmentId]
          : []
    )

    await createActivityLog({
      ticketId: ticket.Id,
      userId: req.user.id,
      action: 'ticket_created',
      newValue: JSON.stringify({
        status: ticket.Status,
        priority: ticket.Priority,
        assignedToId,
      }),
    })

    if (assignedToId) {
      await createActivityLog({
        ticketId: ticket.Id,
        userId: req.user.id,
        action: matchedRoutingRule ? 'ticket_auto_routed' : 'ticket_category_default_assigned',
        newValue: JSON.stringify({
          assignedToId,
          routingRuleId: matchedRoutingRule?.id ?? null,
        }),
      })
    }

    const actorName = getActorName(req)
    const adminIds = await getActiveAdminIds(assignedToId || req.user.id)
    await safeCreateNotifications({
      userIds: adminIds,
      title: 'New ticket submitted',
      message: `${actorName} created ${ticket.TicketNumber}: ${ticket.Title}`,
      ticketId: ticket.Id,
    })

    if (assignedToId && assignedToId !== req.user.id) {
      await safeCreateNotifications({
        userIds: [assignedToId],
        title: 'Ticket assigned to you',
        message: `${ticket.TicketNumber} was assigned to you${matchedRoutingRule ? ' automatically' : ''}.`,
        ticketId: ticket.Id,
      })
    }

    res.status(201).json(
      formatReactTicket(
        ticket,
        orderedDepartmentRecords.length
          ? orderedDepartmentRecords.map((departmentRecord) => departmentRecord.Name)
          : []
      )
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create ticket' })
  }
})

router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', page_size = '10', search } = req.query
  try {
    const where: any = { CreatedById: req.user.id }
    if (status) {
      where.Status = toDbStatus(String(status))
    }
    if (search && String(search).trim()) {
      const query = String(search).trim()
      where.OR = [
        { TicketNumber: { contains: query } },
        { Title: { contains: query } },
        { Description: { contains: query } },
      ]
    }

    const skip = (parseInt(page as string) - 1) * parseInt(page_size as string)

    const [tickets, count] = await Promise.all([
      prisma.tickets.findMany({
        where,
        skip,
        take: parseInt(page_size as string),
        include: ticketIncludes,
        orderBy: { UpdatedAt: 'desc' },
      }),
      prisma.tickets.count({ where }),
    ])

    res.json({ results: await formatReactTickets(tickets), count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch my tickets' })
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string)
    const ticket = await prisma.tickets.findUnique({
      where: { Id: id },
      include: ticketIncludes,
    })

    if (!ticket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    res.json((await formatReactTickets([ticket]))[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to retrieve ticket' })
  }
})

router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string)
    const { status, assigned_to, support_expected_resolution_at } = req.body
    const existingTicket = await prisma.tickets.findUnique({ where: { Id: id } })

    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    const data: any = {}
    const changes: string[] = []
    let assignmentChanged = false
    let statusChanged = false

    if (status) {
      if (!isSupportUser(req.user?.role)) {
        res.status(403).json({ error: 'Only IT staff or admins can update ticket status' })
        return
      }

      let nextStatus = toDbStatus(status)

      if (existingTicket.Status === 'Resolved' && nextStatus === 'Open' && existingTicket.AssignedToId) {
        nextStatus = 'Assigned Pending'
      }
      if ((nextStatus === 'Assigned Pending' || nextStatus === 'In Progress') && !existingTicket.AssignedToId) {
        res.status(409).json({ error: 'Assign the ticket before moving it into the support workflow' })
        return
      }

      data.Status = nextStatus
      if (existingTicket.Status !== nextStatus) {
        changes.push(`status:${existingTicket.Status}->${nextStatus}`)
        statusChanged = true
      }

      if (nextStatus === 'Resolved' && existingTicket.Status !== 'Resolved') {
        data.ResolvedAt = new Date()
      }
      if (nextStatus !== 'Resolved' && existingTicket.Status === 'Resolved') {
        data.ResolvedAt = null
      }
    }

    if (assigned_to !== undefined) {
      if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Only admins can change ticket assignees' })
        return
      }
      if (existingTicket.Status === 'Resolved') {
        res.status(409).json({ error: 'Resolved tickets cannot be reassigned until they are reopened' })
        return
      }

      const normalizedAssignedTo = assigned_to ? Number(assigned_to) : null
      if (normalizedAssignedTo) {
        await ensureAssignableSupportUser(normalizedAssignedTo)
      }

      data.AssignedToId = normalizedAssignedTo
      if (existingTicket.AssignedToId !== normalizedAssignedTo) {
        assignmentChanged = true
        changes.push(`assigned_to:${existingTicket.AssignedToId ?? 'none'}->${normalizedAssignedTo ?? 'none'}`)
        const reassignmentStatus = normalizedAssignedTo ? 'Assigned Pending' : 'Open'
        if (data.Status !== reassignmentStatus && existingTicket.Status !== reassignmentStatus) {
          data.Status = reassignmentStatus
          changes.push(`status:${existingTicket.Status}->${reassignmentStatus}`)
          statusChanged = true
        }
      }
    }

    if (support_expected_resolution_at !== undefined) {
      if (!isSupportUser(req.user?.role)) {
        res.status(403).json({ error: 'Only IT staff or admins can update support ETA' })
        return
      }

      const supportExpected = support_expected_resolution_at ? new Date(support_expected_resolution_at) : null
      if (supportExpected && supportExpected < existingTicket.CreatedAt) {
        res.status(400).json({ error: 'Support proposed resolution must be after ticket creation time' })
        return
      }
      data.SupportExpectedResolutionAt = supportExpected
      changes.push(
        `support_eta:${existingTicket.SupportExpectedResolutionAt?.toISOString() ?? 'none'}->${supportExpected?.toISOString() ?? 'none'}`
      )
    }

    const ticket = await prisma.tickets.update({
      where: { Id: id },
      data,
      include: ticketIncludes,
    })

    if (changes.length) {
      await createActivityLog({
        ticketId: id,
        userId: req.user.id,
        action: 'ticket_updated',
        oldValue: JSON.stringify({ status: existingTicket.Status, assignedToId: existingTicket.AssignedToId }),
        newValue: JSON.stringify(changes),
      })
    }

    const actorName = getActorName(req)
    if (assignmentChanged && ticket.AssignedToId && ticket.AssignedToId !== req.user.id) {
      await safeCreateNotifications({
        userIds: [ticket.AssignedToId],
        title: 'Ticket assigned to you',
        message: `${actorName} assigned ${ticket.TicketNumber} to you.`,
        ticketId: ticket.Id,
      })
    }

    if (statusChanged && ticket.CreatedById !== req.user.id) {
      await safeCreateNotifications({
        userIds: [ticket.CreatedById],
        title: 'Ticket status updated',
        message: `${ticket.TicketNumber} is now ${ticket.Status}.`,
        ticketId: ticket.Id,
      })
    }

    res.json((await formatReactTickets([ticket]))[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update ticket' })
  }
})

router.post('/:id/assign_self', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string)
    if (!isSupportUser(req.user?.role)) {
      res.status(403).json({ error: 'Only IT staff or admins can self assign tickets' })
      return
    }

    const existingTicket = await prisma.tickets.findUnique({ where: { Id: id } })
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    if (existingTicket.Status === 'Resolved') {
      res.status(409).json({ error: 'Resolved tickets cannot be reassigned until they are reopened' })
      return
    }
    if (req.user?.role !== 'admin' && existingTicket.AssignedToId && existingTicket.AssignedToId !== req.user.id) {
      res.status(409).json({ error: 'This ticket is already assigned to another team member' })
      return
    }

    const nextStatus =
      existingTicket.AssignedToId === req.user.id && existingTicket.Status === 'In Progress'
        ? 'In Progress'
        : 'Assigned Pending'

    const ticket = await prisma.tickets.update({
      where: { Id: id },
      data: { AssignedToId: req.user.id, Status: nextStatus },
      include: ticketIncludes,
    })

    await createActivityLog({
      ticketId: id,
      userId: req.user.id,
      action: 'ticket_assigned_self',
      newValue: JSON.stringify({ assignedToId: req.user.id }),
    })

    if (ticket.CreatedById !== req.user.id) {
      await safeCreateNotifications({
        userIds: [ticket.CreatedById],
        title: 'Ticket claimed by support',
        message: `${ticket.TicketNumber} has been assigned to ${getActorName(req)}.`,
        ticketId: ticket.Id,
      })
    }

    res.json((await formatReactTickets([ticket]))[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to self assign ticket' })
  }
})

router.post('/:id/assign', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string)
    const { user_id } = req.body
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can assign tickets to other users' })
      return
    }

    const normalizedUserId = Number(user_id)
    if (!Number.isInteger(normalizedUserId) || normalizedUserId < 1) {
      res.status(400).json({ error: 'A valid assignee is required' })
      return
    }

    const existingTicket = await prisma.tickets.findUnique({ where: { Id: id } })
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    if (existingTicket.Status === 'Resolved') {
      res.status(409).json({ error: 'Resolved tickets cannot be reassigned until they are reopened' })
      return
    }

    await ensureAssignableSupportUser(normalizedUserId)

    const nextStatus =
      existingTicket.AssignedToId === normalizedUserId && existingTicket.Status === 'In Progress'
        ? 'In Progress'
        : 'Assigned Pending'

    const ticket = await prisma.tickets.update({
      where: { Id: id },
      data: { AssignedToId: normalizedUserId, Status: nextStatus },
      include: ticketIncludes,
    })

    await createActivityLog({
      ticketId: id,
      userId: req.user.id,
      action: 'ticket_assigned',
      newValue: JSON.stringify({ assignedToId: normalizedUserId }),
    })

    if (ticket.AssignedToId && ticket.AssignedToId !== req.user.id) {
      await safeCreateNotifications({
        userIds: [ticket.AssignedToId],
        title: 'Ticket assigned to you',
        message: `${getActorName(req)} assigned ${ticket.TicketNumber} to you.`,
        ticketId: ticket.Id,
      })
    }

    if (ticket.CreatedById !== req.user.id) {
      await safeCreateNotifications({
        userIds: [ticket.CreatedById],
        title: 'Ticket assignment updated',
        message: `${ticket.TicketNumber} is now assigned to ${ticket.Users_Tickets_AssignedToIdToUsers?.FullName || 'support'}.`,
        ticketId: ticket.Id,
      })
    }

    res.json((await formatReactTickets([ticket]))[0])
  } catch (err: any) {
    console.error(err)
    const statusCode = err.message === 'Assignee must be an active IT staff or admin user' ? 400 : 500
    res.status(statusCode).json({ error: err.message || 'Failed to assign ticket' })
  }
})

router.post('/:id/start_task', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string)
    if (!isSupportUser(req.user?.role)) {
      res.status(403).json({ error: 'Only IT staff or admins can start tasks' })
      return
    }

    const existingTicket = await prisma.tickets.findUnique({ where: { Id: id } })
    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }
    if (!existingTicket.AssignedToId) {
      res.status(409).json({ error: 'Assign the ticket before starting work' })
      return
    }
    if (existingTicket.Status === 'Resolved') {
      res.status(409).json({ error: 'Resolved tickets cannot be started until they are reopened' })
      return
    }
    if (req.user?.role !== 'admin' && existingTicket.AssignedToId !== req.user?.id) {
      res.status(403).json({ error: 'Only the assigned team member can start this task' })
      return
    }
    if (!STARTABLE_STATUSES.includes(existingTicket.Status as (typeof STARTABLE_STATUSES)[number])) {
      res.status(409).json({ error: 'This ticket is not ready to be started' })
      return
    }

    if (existingTicket.Status === 'In Progress') {
      const ticket = await prisma.tickets.findUnique({
        where: { Id: id },
        include: ticketIncludes,
      })
      if (!ticket) {
        res.status(404).json({ error: 'Ticket not found' })
        return
      }
      res.json((await formatReactTickets([ticket]))[0])
      return
    }

    const ticket = await prisma.tickets.update({
      where: { Id: id },
      data: { Status: 'In Progress' },
      include: ticketIncludes,
    })

    await createActivityLog({
      ticketId: id,
      userId: req.user.id,
      action: 'ticket_started',
      oldValue: existingTicket.Status,
      newValue: 'In Progress',
    })

    if (ticket.CreatedById !== req.user.id) {
      await safeCreateNotifications({
        userIds: [ticket.CreatedById],
        title: 'Work started on your ticket',
        message: `${ticket.TicketNumber} is now In Progress.`,
        ticketId: ticket.Id,
      })
    }

    res.json((await formatReactTickets([ticket]))[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to start task' })
  }
})

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string)

    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can delete tickets' })
      return
    }

    const existingTicket = await prisma.tickets.findUnique({
      where: { Id: id },
      select: { Id: true, TicketNumber: true, Title: true },
    })

    if (!existingTicket) {
      res.status(404).json({ error: 'Ticket not found' })
      return
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM "TicketDepartmentAccess"
        WHERE "TicketId" = ${id}
      `

      await tx.ticketAttachments.deleteMany({
        where: { TicketId: id },
      })

      await tx.ticketComments.deleteMany({
        where: { TicketId: id },
      })

      await tx.ticketActivityLogs.deleteMany({
        where: { TicketId: id },
      })

      await tx.notifications.deleteMany({
        where: { TicketId: id },
      })

      await tx.tickets.delete({
        where: { Id: id },
      })
    })

    res.json({
      id,
      ticket_number: existingTicket.TicketNumber,
      deleted: true,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete ticket' })
  }
})

export default router
