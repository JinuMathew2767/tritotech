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
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#4E5A7A] to-[#1a95d0] p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm mb-1">Welcome back,</p>
          <h1 className="text-2xl font-bold">{user?.first_name} {user?.last_name}</h1>
          <p className="text-white/70 text-sm mt-1">{user?.company} · {user?.department}</p>
        </div>
        <Link to="/tickets/new" className="inline-flex items-center gap-2 bg-white text-[#4E5A7A] text-sm font-bold px-4 py-2.5 rounded-xl hover:shadow-lg transition-all active:scale-95">
          <Plus className="w-4 h-4" /> Raise Ticket
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Tickets</h2>
          <Link to="/tickets" className="text-xs text-[#4E5A7A] font-medium hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <TicketIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tickets yet. <Link to="/tickets/new" className="text-[#4E5A7A] hover:underline">Raise your first ticket</Link>.</p>
            </div>
          ) : tickets.map((ticket) => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#4E5A7A] mb-0.5">{ticket.ticket_number}</p>
                <p className="text-sm font-medium text-slate-900 truncate">{ticket.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ticket.category} · {formatDate(ticket.updated_at)}</p>
              </div>
              <StatusBadge status={ticket.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

