import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock3, Plus, TicketIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { StatusBadge } from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket } from '@/services/ticketService'
import { formatDate } from '@/utils/formatters'
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  if (loading) return <PageLoader />

  const kpis = [
    {
      icon: Clock3,
      label: 'Active Tickets',
      value: stats.active,
      helper: 'Open, assigned, or in progress',
      tone: 'bg-[#0f7cb8]/8 text-[#163b63]',
    },
    {
      icon: CheckCircle,
      label: 'Resolved',
      value: stats.resolved,
      helper: 'Completed requests',
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      icon: TicketIcon,
      label: 'Total Raised',
      value: stats.total,
      helper: 'All requests in your history',
      tone: 'bg-slate-100 text-slate-700',
    },
  ] as const

  return (
    <div className="page-shell mx-auto max-w-6xl">
      <PageHeader
        eyebrow={
          <>
            <TicketIcon className="h-3.5 w-3.5" />
            Employee Portal
          </>
        }
        title={`${greeting}, ${user?.first_name ?? 'there'}`}
        description="Track your requests, check current status, and raise new tickets without wading through unnecessary layout noise."
        actions={
          <>
            <Link to="/tickets" className="btn-secondary">
              View all tickets
            </Link>
            <Link to="/tickets/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              Raise Ticket
            </Link>
          </>
        }
        meta={
          <>
            <span className="page-meta-chip">{user?.company || 'No company assigned'}</span>
            <span className="page-meta-chip">{user?.department || 'No department assigned'}</span>
            <span className="page-meta-chip">{stats.total} requests tracked</span>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        {kpis.map(({ icon: Icon, label, value, helper, tone }) => (
          <div key={label} className="metric-tile">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-metric-label">{label}</p>
                <p className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-slate-950">{value}</p>
                <p className="mt-2 text-[12px] text-slate-500">{helper}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="glass-table">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ui-kicker">Recent Activity</p>
            <h2 className="ui-section-title mt-1">Latest tickets</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="page-meta-chip">{tickets.length} shown</span>
            <Link to="/tickets" className="btn-secondary px-3 py-2 text-[12px]">
              Open ticket history
            </Link>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="px-5 py-14 text-center text-slate-500">
            <TicketIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No tickets yet.</p>
            <p className="mt-1 text-sm">
              Raise your first request from{' '}
              <Link to="/tickets/new" className="font-semibold text-[#163b63] hover:underline">
                the new ticket form
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Ticket</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <Link to={`/tickets/${ticket.id}`} className="block">
                          <p className="text-xs font-bold text-[#0f7cb8]">{ticket.ticket_number}</p>
                          <p className="mt-1 font-semibold text-slate-900">{ticket.subject}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{ticket.category}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(ticket.updated_at)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  className="block rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0f7cb8]">
                        {ticket.ticket_number}
                      </p>
                      <p className="mt-1 truncate font-semibold text-slate-900">{ticket.subject}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500">
                    {ticket.category} • Updated {formatDate(ticket.updated_at)}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
