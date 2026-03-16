import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Inbox,
  RotateCcw,
  Search,
  Sparkles,
  TicketCheck,
  UserCheck,
} from 'lucide-react'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import AssignTicketModal from '@/components/tickets/AssignTicketModal'
import CalendarField from '@/components/ui/CalendarField'
import Pagination from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket, type TicketStats } from '@/services/ticketService'
import userService, { type PendingUser } from '@/services/userService'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'

type DeskTab = 'all' | 'to_be_assigned' | 'assigned_pending' | 'in_progress' | 'resolved' | 'reopened'

const deskTabs: Array<{ id: DeskTab; label: string }> = [
  { id: 'all', label: 'All Tickets' },
  { id: 'to_be_assigned', label: 'To Be Assigned' },
  { id: 'assigned_pending', label: 'Assigned Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'reopened', label: 'Reopened' },
]

const emptyStateCopy: Record<DeskTab, { title: string; body: string }> = {
  all: {
    title: 'No tickets found for this range',
    body: 'Try widening the date range or switching to another desk tab.',
  },
  to_be_assigned: {
    title: 'No tickets waiting for assignment',
    body: 'Everything in the selected range has already been routed or assigned.',
  },
  assigned_pending: {
    title: 'No assigned pending tickets',
    body: 'Assigned tickets that have not been started yet will appear here.',
  },
  in_progress: {
    title: 'No tickets in progress',
    body: 'There are no active tickets currently being worked on in this range.',
  },
  resolved: {
    title: 'No resolved tickets in range',
    body: 'Completed work will appear here once tickets are closed out.',
  },
  reopened: {
    title: 'No reopened tickets',
    body: 'Tickets that were resolved and then reopened will appear here.',
  },
}

const deskTabMeta: Record<DeskTab, { eyebrow: string; chipTone: string }> = {
  all: { eyebrow: 'Complete queue', chipTone: 'bg-slate-100 text-slate-700' },
  to_be_assigned: { eyebrow: 'Needs ownership', chipTone: 'bg-amber-50 text-amber-700' },
  assigned_pending: { eyebrow: 'Assigned, not started', chipTone: 'bg-violet-50 text-violet-700' },
  in_progress: { eyebrow: 'Active delivery', chipTone: 'bg-emerald-50 text-emerald-700' },
  resolved: { eyebrow: 'Completed work', chipTone: 'bg-slate-100 text-slate-700' },
  reopened: { eyebrow: 'Came back to queue', chipTone: 'bg-orange-50 text-orange-700' },
}

const getMonthStart = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

const getToday = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const formatFilterDate = (value: string) => {
  if (!value) return 'Any time'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ITStaffDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [assignees, setAssignees] = useState<PendingUser[]>([])
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [myActiveCount, setMyActiveCount] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)
  const [deskReady, setDeskReady] = useState(false)
  const [statsReady, setStatsReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deskTab, setDeskTab] = useState<DeskTab>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(getMonthStart())
  const [dateTo, setDateTo] = useState(getToday())
  const [assignmentTarget, setAssignmentTarget] = useState<Ticket | null>(null)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const hasLoadedRef = useRef(false)

  const matchesDeskTab = (ticket: Ticket, activeTab: DeskTab) => {
    if (activeTab === 'all') return true
    if (activeTab === 'to_be_assigned') return !ticket.assigned_to && ticket.status !== 'resolved'
    if (activeTab === 'assigned_pending') return ticket.status === 'assigned_pending'
    if (activeTab === 'in_progress') return ticket.status === 'in_progress'
    if (activeTab === 'resolved') return ticket.status === 'resolved'
    if (activeTab === 'reopened') return true
    return false
  }

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const requests = [
          ticketService.getStats(),
          ticketService.list({ assigned_to_me: true, status: 'assigned_pending', page_size: 1 }),
          ticketService.list({ assigned_to_me: true, status: 'open', page_size: 1 }),
          ticketService.list({ assigned_to_me: true, status: 'in_progress', page_size: 1 }),
        ] as const

        const adminRequests =
          user?.role === 'admin' ? [userService.getActiveUsers()] : [Promise.resolve([] as PendingUser[])]
        const [statsData, myAssignedPending, myOpen, myInProgress, activeUsers] = await Promise.all([
          ...requests,
          ...adminRequests,
        ])

        setStats(statsData)
        setMyActiveCount(myAssignedPending.count + myOpen.count + myInProgress.count)
        if (user?.role === 'admin') {
          setAssignees(activeUsers.filter((item) => item.role === 'admin' || item.role === 'it_staff'))
        }
        setStatsReady(true)
      } catch {
        toast.error('Failed to load desk data')
      }
    }

    fetchOverview()
  }, [user?.role])

  useEffect(() => {
    const fetchDesk = async () => {
      if (!hasLoadedRef.current) {
        setInitialLoading(true)
      } else {
        setRefreshing(true)
      }

      const deskParams = {
        page,
        page_size: 10,
        search: search.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        ...(deskTab === 'to_be_assigned' ? { unassigned_only: true } : {}),
        ...(deskTab === 'assigned_pending' ? { status: 'assigned_pending' as const } : {}),
        ...(deskTab === 'in_progress' ? { status: 'in_progress' as const } : {}),
        ...(deskTab === 'resolved' ? { status: 'resolved' as const } : {}),
        ...(deskTab === 'reopened' ? { reopened_only: true } : {}),
      }

      try {
        const ticketPage = await ticketService.list(deskParams)
        setTickets(ticketPage.results)
        setTotalPages(Math.ceil(ticketPage.count / 10))
        setDeskReady(true)
      } catch {
        toast.error('Failed to load ticket queue')
      } finally {
        hasLoadedRef.current = true
        setRefreshing(false)
      }
    }

    fetchDesk()
  }, [dateFrom, dateTo, deskTab, page, search])

  useEffect(() => {
    if (deskReady && statsReady) {
      setInitialLoading(false)
    }
  }, [deskReady, statsReady])

  const handleAssignSelf = async (id: number) => {
    try {
      const updated = await ticketService.assignToMe(id)
      setTickets((prev) =>
        prev.map((ticket) => (ticket.id === id ? updated : ticket)).filter((ticket) => matchesDeskTab(ticket, deskTab))
      )
      toast.success('Ticket assigned to you and ready to start')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign ticket')
    }
  }

  const handleAssignToUser = async (ticketId: number, userId: number) => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignTo(ticketId, userId)
      setTickets((prev) =>
        prev
          .map((ticket) => (ticket.id === ticketId ? updated : ticket))
          .filter((ticket) => matchesDeskTab(ticket, deskTab))
      )
      setAssignmentTarget(null)
      toast.success('Ticket assigned and moved to Assigned Pending')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update assignee')
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleAdminAssignSelf = async (ticketId: number) => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignToMe(ticketId)
      setTickets((prev) =>
        prev
          .map((ticket) => (ticket.id === ticketId ? updated : ticket))
          .filter((ticket) => matchesDeskTab(ticket, deskTab))
      )
      setAssignmentTarget(null)
      toast.success('Ticket assigned to you and ready to start')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign ticket')
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleStartTask = async (ticketId: number) => {
    try {
      const updated = await ticketService.startTask(ticketId)
      setTickets((prev) =>
        prev
          .map((ticket) => (ticket.id === ticketId ? updated : ticket))
          .filter((ticket) => matchesDeskTab(ticket, deskTab))
      )
      toast.success('Task started')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start task')
    }
  }

  const clearDateFilters = () => {
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const tabDescription = useMemo(() => {
    switch (deskTab) {
      case 'to_be_assigned':
        return 'Unassigned unresolved tickets waiting for manual pickup or admin routing.'
      case 'assigned_pending':
        return 'Tickets that are assigned already but still waiting for the assignee to begin work.'
      case 'in_progress':
        return 'Tickets actively being worked on by the support team.'
      case 'resolved':
        return 'Completed tickets in the selected date range.'
      case 'reopened':
        return 'Tickets that were resolved earlier and later reopened.'
      default:
        return 'Full ticket desk view. Defaults to the current month until you change the date range.'
    }
  }, [deskTab])

  if (initialLoading || !stats) return <PageLoader />

  const skeletonRows = Array.from({ length: 5 }, (_, index) => index)
  const assignedPendingCount = stats.status_breakdown.find((item) => item.label === 'Assigned Pending')?.value ?? 0
  const inProgressCount = stats.status_breakdown.find((item) => item.label === 'In Progress')?.value ?? 0
  const resolvedCount = stats.status_breakdown.find((item) => item.label === 'Resolved')?.value ?? stats.resolved
  const activeRangeLabel =
    dateFrom || dateTo ? `${formatFilterDate(dateFrom)} to ${formatFilterDate(dateTo)}` : 'All dates'

  const kpis = [
    { icon: Inbox, label: 'Unassigned Queue', value: stats.unassigned, color: 'text-[#4E5A7A]', bg: 'bg-[#4E5A7A]/10' },
    { icon: TicketCheck, label: 'Assigned Pending', value: assignedPendingCount, color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: UserCheck, label: 'In Progress', value: inProgressCount, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: AlertCircle, label: 'Overdue Queue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  const compactStats = [
    ...kpis.map(({ icon, label, value, color, bg }) => ({ icon, label, value: String(value), color, bg })),
    {
      icon: Sparkles,
      label: 'Support ETA',
      value: stats.sla_analysis.avg_support_expected_hours ? `${stats.sla_analysis.avg_support_expected_hours.toFixed(1)}h` : '--',
      color: 'text-sky-700',
      bg: 'bg-sky-50',
    },
    {
      icon: RotateCcw,
      label: 'Resolution',
      value: stats.sla_analysis.avg_actual_resolution_hours ? `${stats.sla_analysis.avg_actual_resolution_hours.toFixed(1)}h` : '--',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
    },
    {
      icon: TicketCheck,
      label: 'ETA Met',
      value: `${stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%`,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="page-shell space-y-3">
      <div className="rounded-[22px] border border-white/70 bg-white/72 p-3 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#d5dce7] bg-[linear-gradient(135deg,rgba(78,90,122,0.14)_0%,rgba(78,90,122,0.06)_100%)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4E5A7A] shadow-[0_14px_28px_-24px_rgba(78,90,122,0.22)]">
                <TicketCheck className="h-3 w-3" />
                Ticket Desk
              </div>
              <h1 className="mt-2 text-[1.25rem] font-bold tracking-tight text-slate-900">Queue Overview</h1>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{tabDescription}</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)]">
                {tickets.length} shown
              </span>
              <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)]">
                {activeRangeLabel}
              </span>
              <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)]">
                My workload: {myActiveCount}
              </span>
              <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)]">
                Resolved: {resolvedCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 2xl:grid-cols-7">
            {compactStats.map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="rounded-[18px] border border-white/70 bg-white/58 px-3 py-2.5 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.25)] backdrop-blur-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                    <p className="mt-1.5 text-[1.05rem] font-bold leading-none tracking-tight text-slate-900">{value}</p>
                  </div>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-table">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="rounded-[20px] border border-white/70 bg-white/55 p-2.5 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.32)] backdrop-blur-md">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {deskTabMeta[deskTab].eyebrow}
                    </p>
                    <h2 className="text-sm font-semibold tracking-tight text-slate-900">Ticket Queue</h2>
                    <span
                      className={clsx(
                        'inline-flex min-w-[74px] items-center justify-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold tabular-nums shadow-[0_10px_22px_-20px_rgba(78,90,122,0.16)]',
                        deskTabMeta[deskTab].chipTone
                      )}
                    >
                      <span>{tickets.length}</span>
                      <span>shown</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full border border-white/70 bg-white/70 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.3)]">
                    {activeRangeLabel}
                  </span>
                  <span className={clsx('text-[11px] font-medium text-slate-400 transition-opacity', refreshing ? 'opacity-100' : 'opacity-0')}>
                    Updating queue...
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-56 xl:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-8.5 w-full rounded-xl border border-white/75 bg-white/82 pl-9 pr-3 text-xs text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md outline-none transition-all placeholder:text-slate-400 focus:border-[#4E5A7A] focus:ring-2 focus:ring-[#4E5A7A]/20"
                    placeholder="Search tickets..."
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                  />
                </div>

                <div className="flex flex-1 flex-wrap gap-1.5">
                  {deskTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setDeskTab(tab.id)
                        setPage(1)
                      }}
                      className={clsx(
                        'rounded-2xl px-3 py-1.5 text-[11px] font-semibold transition-all',
                        deskTab === tab.id
                          ? 'border border-[#d5dce7] bg-[linear-gradient(135deg,rgba(78,90,122,0.14)_0%,rgba(78,90,122,0.06)_100%)] text-[#4E5A7A] shadow-[0_14px_28px_-24px_rgba(78,90,122,0.22)]'
                          : 'border border-transparent bg-white/45 text-slate-600 hover:bg-white/75 hover:text-slate-900'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 grid gap-1.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[170px_170px_auto]">
                <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-2.5 py-1.5 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.28)]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">From</span>
                  <CalendarField
                    value={dateFrom}
                    onChange={(nextValue) => {
                      setDateFrom(nextValue)
                      setPage(1)
                    }}
                    placeholder="From date"
                    buttonClassName="h-7 min-h-0 border-0 bg-transparent px-0 py-0 text-xs shadow-none ring-0"
                    panelClassName="w-[20rem]"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/60 px-2.5 py-1.5 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.28)]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">To</span>
                  <CalendarField
                    value={dateTo}
                    onChange={(nextValue) => {
                      setDateTo(nextValue)
                      setPage(1)
                    }}
                    placeholder="To date"
                    buttonClassName="h-7 min-h-0 border-0 bg-transparent px-0 py-0 text-xs shadow-none ring-0"
                    panelClassName="w-[20rem]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 lg:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-white/70 bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.28)] backdrop-blur-md transition-all hover:bg-white/75"
                    onClick={() => {
                      setDateFrom(getMonthStart())
                      setDateTo(getToday())
                      setPage(1)
                    }}
                  >
                    Current Month
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-white/70 bg-white/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.28)] backdrop-blur-md transition-all hover:bg-white/75"
                    onClick={() => {
                      const today = getToday()
                      setDateFrom(today)
                      setDateTo(today)
                      setPage(1)
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-white/70 bg-white/55 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.24)] backdrop-blur-md transition-all hover:bg-white/75"
                    onClick={clearDateFilters}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div
              className={clsx(
                'overflow-hidden rounded-full bg-slate-100 transition-all duration-300',
                refreshing ? 'mt-3 h-1 opacity-100' : 'mt-0 h-0 opacity-0'
              )}
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[#4E5A7A]" />
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px]">
          <div className={clsx('space-y-4 p-4 md:hidden transition-opacity duration-200', refreshing && 'opacity-45')}>
            {tickets.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white/95 px-5 py-12 text-center shadow-[0_20px_45px_-34px_rgba(15,23,42,0.32)]">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  {deskTab === 'reopened' ? (
                    <RotateCcw className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Inbox className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-700">{emptyStateCopy[deskTab].title}</p>
                <p className="mt-1 text-sm text-slate-400">{emptyStateCopy[deskTab].body}</p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const isOverdue = ticket.sla_status === 'overdue'
                const canStartTask =
                  ticket.status === 'assigned_pending' &&
                  !!ticket.assigned_to &&
                  (user?.role === 'admin' || ticket.assigned_to.id === user?.id)
                const canAssignSelf = user?.role !== 'admin' && !ticket.assigned_to && ticket.status !== 'resolved'
                const canManageAssignment = user?.role === 'admin' && ticket.status !== 'resolved'

                return (
                  <div
                    key={ticket.id}
                    className={clsx(
                      'rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_45px_-34px_rgba(15,23,42,0.32)]',
                      isOverdue && 'border-red-200 bg-red-50/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#253763]"
                        >
                          {ticket.ticket_number}
                        </Link>
                        <h3 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-slate-950">
                          {ticket.subject}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">{`${ticket.category} - ${formatDate(ticket.created_at)}`}</p>
                      </div>
                      <div className="shrink-0">
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Requester</p>
                          <div className="mt-2 flex items-start gap-2">
                            <Avatar name={ticket.created_by.name} src={ticket.created_by.avatar} size="xs" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900">{ticket.created_by.name}</p>
                              <p className="truncate text-[11px] text-slate-500">{ticket.company}</p>
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Assignee</p>
                          <div className="mt-2 min-w-0">
                            {ticket.assigned_to ? (
                              <>
                                <p className="text-xs font-semibold text-slate-900">{ticket.assigned_to.name}</p>
                                <p className="text-[11px] text-slate-500">
                                  {ticket.status === 'assigned_pending' ? 'Awaiting start' : 'Current owner'}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs font-semibold text-amber-600">Pending assignment</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={ticket.status} className="px-3 py-1.5 text-xs" />
                          {deskTab === 'reopened' && (
                            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                              Reopened
                            </span>
                          )}
                          {isOverdue && (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {canStartTask && (
                          <button
                            onClick={() => handleStartTask(ticket.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#253763] px-4 text-sm font-semibold text-white shadow-sm"
                          >
                            Start Task
                          </button>
                        )}
                        {canAssignSelf && (
                          <button
                            onClick={() => handleAssignSelf(ticket.id)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#253763] px-4 text-sm font-semibold text-white shadow-sm"
                          >
                            Assign me
                          </button>
                        )}
                        {canManageAssignment && (
                          <button
                            onClick={() => setAssignmentTarget(ticket)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#9fb0d8] bg-white px-4 text-sm font-medium text-slate-900 shadow-sm"
                          >
                            {ticket.assigned_to ? 'Manage' : 'Assign'}
                          </button>
                        )}
                        <Link
                          to={`/tickets/${ticket.id}`}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Ticket</th>
                  <th className="px-4 py-3 text-left">Requester</th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">Assignee</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className={clsx('divide-y divide-slate-100 transition-opacity duration-200', refreshing && 'opacity-45')}>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="mx-auto max-w-md">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                          {deskTab === 'reopened' ? (
                            <RotateCcw className="h-5 w-5 text-slate-400" />
                          ) : (
                            <Inbox className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-700">{emptyStateCopy[deskTab].title}</p>
                        <p className="mt-1 text-sm text-slate-400">{emptyStateCopy[deskTab].body}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => {
                    const isOverdue = ticket.sla_status === 'overdue'

                    return (
                      <tr
                        key={ticket.id}
                        className={clsx('transition-colors hover:bg-slate-50/80', isOverdue && 'bg-red-50/35')}
                      >
                        <td className="px-4 py-4">
                          <Link to={`/tickets/${ticket.id}`} className="group block">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold text-[#4E5A7A] group-hover:underline">
                                {ticket.ticket_number}
                              </p>
                              {ticket.sla_status === 'overdue' && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="mt-1 max-w-[260px] font-semibold leading-5 text-slate-800">{ticket.subject}</p>
                            <p className="mt-2 text-xs text-slate-500">{`${ticket.category} - ${formatDate(ticket.created_at)}`}</p>
                            <p className="mt-1 text-xs text-slate-400 lg:hidden">
                              Assignee: {ticket.assigned_to?.name || 'Pending assignment'}
                            </p>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={ticket.created_by.name} src={ticket.created_by.avatar} size="xs" />
                            <div>
                              <p className="text-xs font-medium text-slate-800">{ticket.created_by.name}</p>
                              <p className="text-xs text-slate-400">{ticket.company}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          {ticket.assigned_to ? (
                            <div>
                              <p className="text-xs font-semibold text-slate-700">{ticket.assigned_to.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {ticket.status === 'assigned_pending' ? 'Awaiting start' : 'Current owner'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600">Pending assignment</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={ticket.status} />
                            {deskTab === 'reopened' && (
                              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                                Reopened
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {ticket.status === 'assigned_pending' &&
                              ticket.assigned_to &&
                              (user?.role === 'admin' || ticket.assigned_to.id === user?.id) && (
                                <button
                                  onClick={() => handleStartTask(ticket.id)}
                                  className="btn-primary whitespace-nowrap px-2.5 py-1 text-xs"
                                >
                                  Start Task
                                </button>
                              )}
                            {user?.role !== 'admin' && !ticket.assigned_to && ticket.status !== 'resolved' && (
                              <button
                                onClick={() => handleAssignSelf(ticket.id)}
                                className="btn-primary whitespace-nowrap px-2.5 py-1 text-xs"
                              >
                                Assign me
                              </button>
                            )}
                            {user?.role === 'admin' && ticket.status !== 'resolved' && (
                              <button
                                onClick={() => setAssignmentTarget(ticket)}
                                className="btn-secondary whitespace-nowrap border-slate-200 bg-slate-100/95 px-2.5 py-1 text-xs text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-100"
                              >
                                {ticket.assigned_to ? 'Manage assignment' : 'Assign'}
                              </button>
                            )}
                            <Link
                              to={`/tickets/${ticket.id}`}
                              className="btn-secondary whitespace-nowrap border-slate-200 bg-slate-100/95 px-2.5 py-1 text-xs text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-100"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {refreshing && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[49px] hidden bg-white/35 backdrop-blur-[1px] md:block">
              <div className="divide-y divide-slate-100">
                {skeletonRows.map((row) => (
                  <div
                    key={row}
                    className="grid min-h-[92px] grid-cols-[1.35fr_1.15fr_0.9fr_0.9fr_1fr_1fr] gap-4 px-4 py-4"
                  >
                    <div className="space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                      <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200" />
                    </div>
                    <div className="hidden md:block">
                      <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                    </div>
                    <div>
                      <div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" />
                    </div>
                    <div>
                      <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-8 w-16 animate-pulse rounded-xl bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-100 p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <AssignTicketModal
        open={!!assignmentTarget}
        ticket={assignmentTarget}
        assignees={assignees}
        saving={savingAssignment}
        currentUserId={user?.id}
        onClose={() => setAssignmentTarget(null)}
        onAssignToUser={handleAssignToUser}
        onAssignToMe={handleAdminAssignSelf}
      />
    </div>
  )
}

