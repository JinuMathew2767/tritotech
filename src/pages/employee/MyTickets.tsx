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
    void fetchData()
  }, [search, statusFilter, page])

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">My Tickets</h1>
        <Link to="/tickets/new" className="btn-primary w-full py-2 text-sm sm:w-auto">
          <Plus className="h-4 w-4" /> New Ticket
        </Link>
      </div>

      <div className="relative mb-4">
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

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => {
              setStatusFilter(value)
              setPage(1)
            }}
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
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className={clsx('card flex flex-col gap-3 p-4 transition-all hover:shadow-md sm:flex-row sm:items-center sm:gap-4', isResolved && 'opacity-60')}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#4E5A7A]">{ticket.ticket_number}</span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className={clsx('truncate text-sm font-medium text-slate-900', isResolved && 'line-through')}>
                    {ticket.subject}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{ticket.category}</span>
                    <span>-</span>
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

      <Link
        to="/tickets/new"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#4E5A7A] shadow-lg shadow-[#4E5A7A]/40 transition-transform hover:scale-105 lg:hidden"
      >
        <Plus className="h-6 w-6 text-white" />
      </Link>
    </div>
  )
}
