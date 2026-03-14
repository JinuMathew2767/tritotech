import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket, type TicketStatus } from '@/services/ticketService'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const filters: { label: string; value: TicketStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Assigned Pending', value: 'assigned_pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

export default function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const params = { search, page, page_size: 10, ...(statusFilter !== 'all' ? { status: statusFilter } : {}) }
      try {
        const data = await ticketService.getMyTickets(params)
        setTickets(data.results)
        setTotalPages(Math.ceil(data.count / 10))
      } catch {
        toast.error('Failed to load tickets')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [search, statusFilter, page])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">My Tickets</h1>
        <Link to="/tickets/new" className="btn-primary text-sm py-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search tickets…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => { setStatusFilter(value); setPage(1) }}
            className={clsx('filter-pill', statusFilter === value ? 'filter-pill-active' : 'filter-pill-inactive')}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="card p-10 text-center text-slate-400">
              <p>No tickets found.</p>
            </div>
          ) : tickets.map((ticket) => {
            const isResolved = ticket.status === 'resolved'
            return (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`} className={clsx('card flex items-center gap-4 p-4 hover:shadow-md transition-all', isResolved && 'opacity-60')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#4E5A7A]">{ticket.ticket_number}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className={clsx('text-sm font-medium text-slate-900 truncate', isResolved && 'line-through')}>{ticket.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{ticket.category}</span>
                    <span>·</span>
                    <span>Updated {formatDate(ticket.updated_at)}</span>
                  </div>
                </div>
                <PriorityBadge priority={ticket.priority} />
              </Link>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* FAB */}
      <Link to="/tickets/new" className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#4E5A7A] rounded-full flex items-center justify-center shadow-lg shadow-[#4E5A7A]/40 hover:scale-105 transition-transform">
        <Plus className="w-6 h-6 text-white" />
      </Link>
    </div>
  )
}

