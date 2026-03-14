import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Search } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import AssignTicketModal from '@/components/tickets/AssignTicketModal'
import Pagination from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket, type TicketStatus } from '@/services/ticketService'
import userService, { type PendingUser } from '@/services/userService'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'

const tabs: { label: string; value: TicketStatus | 'all'; count?: number }[] = [
  { label: 'All Assigned', value: 'all' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

const getSlaPresentation = (ticket: Ticket) => {
  const status = ticket.sla_status ?? 'none'

  if (!ticket.sla_due) {
    return {
      rowTone: '',
      titleTone: 'text-[#4E5A7A]',
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
    titleTone: 'text-[#4E5A7A]',
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
  const [tab, setTab] = useState<TicketStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [assignmentTarget, setAssignmentTarget] = useState<Ticket | null>(null)
  const [savingAssignment, setSavingAssignment] = useState(false)

  const ticketMatchesTab = (ticket: Ticket, activeTab: TicketStatus | 'all') =>
    activeTab === 'all' || ticket.status === activeTab

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = {
          search,
          page,
          page_size: 10,
          assigned_only: true,
          ...(user?.role === 'it_staff' ? { assigned_to_me: true } : {}),
          ...(tab !== 'all' ? { status: tab as TicketStatus } : {}),
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
    fetchData()
  }, [tab, search, page, user?.role])

  const handleAssignToUser = async (ticketId: number, userId: number) => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignTo(ticketId, userId)
      setTickets((prev) =>
        prev
          .map((ticket) => (ticket.id === ticketId ? updated : ticket))
          .filter((ticket) => ticketMatchesTab(ticket, tab))
      )
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
      setTickets((prev) =>
        prev
          .map((ticket) => (ticket.id === ticketId ? updated : ticket))
          .filter((ticket) => ticketMatchesTab(ticket, tab))
      )
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
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]">
              <ClipboardList className="h-3.5 w-3.5" />
              Assigned Work
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              {user?.role === 'admin' ? 'Assigned Tickets' : 'My Assigned Tickets'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Track everything already assigned to the support team, including tickets waiting to be started, work in progress, and completed items.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/82 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {tickets.length} visible
            </span>
            <span className="rounded-full bg-white/82 px-3 py-2 text-sm font-semibold capitalize text-slate-700 shadow-sm">
              {(tab === 'all' ? 'all assigned' : tab).replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-2">
        <div className="flex flex-wrap gap-1">
        {tabs.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setTab(value); setPage(1) }}
            className={clsx('rounded-full px-4 py-2 text-sm font-semibold transition-colors', tab === value ? 'bg-[#4E5A7A] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700')}
          >
            {label}
          </button>
        ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-9" placeholder="Search tickets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>
      </div>

      {loading ? <PageLoader /> : (
        <div className="glass-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Ticket Info</th>
                  <th className="text-left px-4 py-3">Requester</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">SLA Due</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => {
                  const sla = getSlaPresentation(ticket)
                  return (
                    <tr key={ticket.id} className={clsx('hover:bg-slate-50 transition-colors', sla.rowTone)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={clsx('text-xs font-bold', sla.titleTone)}>{ticket.ticket_number}</p>
                          {sla.label && (
                            <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide', sla.labelTone)}>
                              {sla.label}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-800 font-medium truncate max-w-[200px]">{ticket.subject}</p>
                        <p className="text-xs text-slate-400">{ticket.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={ticket.created_by.name} size="xs" />
                          <div>
                            <p className="text-xs font-medium text-slate-800">{ticket.created_by.name}</p>
                            <p className="text-xs text-slate-400">{ticket.company}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="space-y-1">
                          <span className={clsx('text-xs', sla.dateTone)}>
                            {ticket.sla_due ? formatDate(ticket.sla_due) : '—'}
                          </span>
                          {ticket.actual_resolution_at && (
                            <p className="text-[11px] text-slate-400">
                              Resolved {formatDate(ticket.actual_resolution_at)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {user?.role === 'admin' && ticket.status !== 'resolved' && (
                            <button
                              onClick={() => setAssignmentTarget(ticket)}
                              className="btn-secondary whitespace-nowrap border-slate-200 bg-slate-100/95 px-2.5 py-1 text-xs text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-100"
                            >
                              {ticket.assigned_to ? 'Manage assignment' : 'Assign'}
                            </button>
                          )}
                          <Link to={`/tickets/${ticket.id}`} className="btn-primary whitespace-nowrap px-2.5 py-1 text-xs">View</Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
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

