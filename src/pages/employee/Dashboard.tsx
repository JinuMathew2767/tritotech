import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { StatusBadge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket } from '@/services/ticketService'
import { formatDate } from '@/utils/formatters'
import { Plus, TicketIcon, CheckCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState({ active: 0, resolved: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ticketService.getMyTickets({ page_size: 5 }),
      ticketService.getMyTickets({ page_size: 1 }),
      ticketService.getMyTickets({ status: 'open', page_size: 1 }),
      ticketService.getMyTickets({ status: 'assigned_pending', page_size: 1 }),
      ticketService.getMyTickets({ status: 'in_progress', page_size: 1 }),
      ticketService.getMyTickets({ status: 'resolved', page_size: 1 }),
    ])
      .then(([recent, all, open, assignedPending, inProgress, resolved]) => {
        setTickets(recent.results)
        setStats({
          total: all.count,
          active: open.count + assignedPending.count + inProgress.count,
          resolved: resolved.count,
        })
      })
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const kpis = [
    { icon: Clock, label: 'Active Tickets', value: stats.active, color: 'text-[#4E5A7A]', bg: 'bg-[#4E5A7A]/10' },
    { icon: CheckCircle, label: 'Resolved', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: TicketIcon, label: 'Total Tickets', value: stats.total, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#4E5A7A] to-[#1a95d0] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="mb-1 text-sm text-white/80">Welcome back,</p>
          <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>
          <p className="mt-1 text-sm text-white/70">{user?.company} - {user?.department}</p>
        </div>

        <Link
          to="/tickets/new"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#4E5A7A] transition-all hover:shadow-lg active:scale-95 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Raise Ticket
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-slate-900">Recent Tickets</h2>
          <Link to="/tickets" className="text-xs font-medium text-[#4E5A7A] hover:underline">View all -&gt;</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <TicketIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">
                No tickets yet.{' '}
                <Link to="/tickets/new" className="text-[#4E5A7A] hover:underline">
                  Raise your first ticket
                </Link>.
              </p>
            </div>
          ) : tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/tickets/${ticket.id}`}
              className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-semibold text-[#4E5A7A]">{ticket.ticket_number}</p>
                <p className="truncate text-sm font-medium text-slate-900">{ticket.subject}</p>
                <p className="mt-0.5 text-xs text-slate-400">{ticket.category} - {formatDate(ticket.updated_at)}</p>
              </div>
              <StatusBadge status={ticket.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
