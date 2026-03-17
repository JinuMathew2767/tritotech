import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'
import clsx from 'clsx'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import AssignTicketModal from '@/components/tickets/AssignTicketModal'
import Pagination from '@/components/ui/Pagination'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import ticketService, { type Ticket, type TicketStatus } from '@/services/ticketService'
import userService, { type PendingUser } from '@/services/userService'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

type AssignedTicketsTab = TicketStatus | 'all' | 'assigned_pending_mine'

const tabs: { label: string; value: AssignedTicketsTab }[] = [
  { label: 'All Assigned', value: 'all' },
  { label: 'Pending To Me', value: 'assigned_pending_mine' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

const getSlaPresentation = (ticket: Ticket) => {
  const status = ticket.sla_status ?? 'none'

  if (!ticket.sla_due) {
    return {
      rowTone: '',
      titleTone: 'text-[#163b63]',
      label: null as string | null,
      labelTone: '',
      dateTone: 'text-slate-500',
    }
  }

  if (status === 'overdue') {
    return {
      rowTone: 'border-l-4 border-l-red-500',
      titleTone: 'text-red-600',
      label: 'OVERDUE',
      labelTone: 'bg-red-50 text-red-600',
      dateTone: 'text-red-600 font-semibold',
    }
  }

  if (status === 'resolved_late') {
    return {
      rowTone: 'border-l-4 border-l-amber-500',
      titleTone: 'text-amber-600',
      label: 'RESOLVED LATE',
      labelTone: 'bg-amber-50 text-amber-700',
      dateTone: 'text-amber-700 font-semibold',
    }
  }

  if (status === 'resolved_on_time') {
    return {
      rowTone: 'border-l-4 border-l-green-500',
      titleTone: 'text-green-700',
      label: 'ON TIME',
      labelTone: 'bg-green-50 text-green-700',
      dateTone: 'text-green-700 font-semibold',
    }
  }

  return {
    rowTone: '',
    titleTone: 'text-[#163b63]',
    label: 'ON TRACK',
    labelTone: 'bg-blue-50 text-blue-700',
    dateTone: 'text-slate-500',
  }
}

export default function AssignedTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [assignees, setAssignees] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<AssignedTicketsTab>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [assignmentTarget, setAssignmentTarget] = useState<Ticket | null>(null)
  const [savingAssignment, setSavingAssignment] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = {
          search,
          page,
          page_size: 10,
          assigned_only: true,
          ...(tab === 'assigned_pending_mine'
            ? { assigned_to_me: true, status: 'assigned_pending' as TicketStatus }
            : {}),
          ...(tab !== 'all' && tab !== 'assigned_pending_mine' ? { status: tab as TicketStatus } : {}),
        }

        const [data, activeUsers] = await Promise.all([
          ticketService.list(params),
          user?.role === 'admin' ? userService.getActiveUsers() : Promise.resolve([] as PendingUser[]),
        ])

        setTickets(data.results)
        setTotalPages(Math.ceil(data.count / 10))
        if (user?.role === 'admin') {
          setAssignees(activeUsers.filter((item) => item.role === 'admin' || item.role === 'it_staff'))
        }
      } catch {
        toast.error('Failed to load tickets')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [page, search, tab, user?.role])

  const handleAssignToUser = async (ticketId: number, userId: number) => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignTo(ticketId, userId)
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)))
      setAssignmentTarget(null)
      toast.success('Ticket assigned and moved to Assigned Pending')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update assignee')
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleAssignToMe = async (ticketId: number) => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignToMe(ticketId)
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)))
      setAssignmentTarget(null)
      toast.success('Ticket assigned to you and ready to start')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign ticket')
    } finally {
      setSavingAssignment(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={
          <>
            <ClipboardList className="h-3.5 w-3.5" />
            Assigned Work
          </>
        }
        title="Assigned Tickets"
        description="Follow the support queue after assignment, with compact status filters and clear SLA visibility."
        meta={
          <>
            <span className="page-meta-chip">
              {(tab === 'all' ? 'all assigned' : tab === 'assigned_pending_mine' ? 'pending to me' : tab).replace(
                /_/g,
                ' '
              )}
            </span>
            <span className="page-meta-chip">{tickets.length} visible</span>
          </>
        }
      />

      <section className="glass-table">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {tabs.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => {
                    setTab(value)
                    setPage(1)
                  }}
                  className={clsx(
                    'filter-pill',
                    tab === value ? 'filter-pill-active' : 'filter-pill-inactive'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search tickets..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Ticket</th>
                    <th className="px-4 py-3 text-left">Requester</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="hidden px-4 py-3 text-left md:table-cell">SLA Due</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => {
                    const sla = getSlaPresentation(ticket)
                    return (
                      <tr key={ticket.id} className={clsx('transition-colors hover:bg-slate-50', sla.rowTone)}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={clsx('text-xs font-bold', sla.titleTone)}>{ticket.ticket_number}</p>
                            {sla.label ? (
                              <span
                                className={clsx(
                                  'rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                                  sla.labelTone
                                )}
                              >
                                {sla.label}
                              </span>
                            ) : null}
                          </div>
                          <p className="max-w-[240px] truncate font-semibold text-slate-900">{ticket.subject}</p>
                          <p className="mt-1 text-xs text-slate-500">{ticket.category}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={ticket.created_by.name} size="xs" />
                            <div>
                              <p className="text-xs font-medium text-slate-800">{ticket.created_by.name}</p>
                              <p className="text-xs text-slate-400">{ticket.company}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="hidden px-4 py-4 md:table-cell">
                          <div className="space-y-1">
                            <span className={clsx('text-xs', sla.dateTone)}>
                              {ticket.sla_due ? formatDate(ticket.sla_due) : '--'}
                            </span>
                            {ticket.actual_resolution_at ? (
                              <p className="text-[11px] text-slate-400">
                                Resolved {formatDate(ticket.actual_resolution_at)}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {assignees.length > 0 && ticket.status !== 'resolved' ? (
                              <button
                                onClick={() => setAssignmentTarget(ticket)}
                                className="btn-secondary whitespace-nowrap px-2.5 py-1 text-xs"
                              >
                                {ticket.assigned_to ? 'Manage assignment' : 'Assign'}
                              </button>
                            ) : null}
                            <Link to={`/tickets/${ticket.id}`} className="btn-primary whitespace-nowrap px-2.5 py-1 text-xs">
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {tickets.map((ticket) => {
                const sla = getSlaPresentation(ticket)
                return (
                  <div key={ticket.id} className={clsx('rounded-[16px] border border-slate-200 bg-white p-4', sla.rowTone)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={clsx('text-[11px] font-semibold uppercase tracking-[0.16em]', sla.titleTone)}>
                          {ticket.ticket_number}
                        </p>
                        <p className="mt-1 truncate font-semibold text-slate-900">{ticket.subject}</p>
                      </div>
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Avatar name={ticket.created_by.name} size="xs" />
                      <div>
                        <p className="text-xs font-medium text-slate-800">{ticket.created_by.name}</p>
                        <p className="text-xs text-slate-400">{ticket.company}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge status={ticket.status} />
                      {sla.label ? (
                        <span
                          className={clsx(
                            'rounded-full border border-transparent px-2 py-0.5 text-[10px] font-semibold',
                            sla.labelTone
                          )}
                        >
                          {sla.label}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assignees.length > 0 && ticket.status !== 'resolved' ? (
                        <button
                          onClick={() => setAssignmentTarget(ticket)}
                          className="btn-secondary whitespace-nowrap px-2.5 py-1 text-xs"
                        >
                          {ticket.assigned_to ? 'Manage assignment' : 'Assign'}
                        </button>
                      ) : null}
                      <Link to={`/tickets/${ticket.id}`} className="btn-primary whitespace-nowrap px-2.5 py-1 text-xs">
                        View
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {totalPages > 1 ? (
          <div className="border-t border-slate-200 p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </section>

      <AssignTicketModal
        open={!!assignmentTarget}
        ticket={assignmentTarget}
        assignees={assignees}
        saving={savingAssignment}
        currentUserId={user?.id}
        onClose={() => setAssignmentTarget(null)}
        onAssignToUser={handleAssignToUser}
        onAssignToMe={handleAssignToMe}
      />
    </div>
  )
}
