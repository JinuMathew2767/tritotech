import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, TicketIcon } from 'lucide-react'
import clsx from 'clsx'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket, type TicketStatus } from '@/services/ticketService'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

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
    <div className="page-shell mx-auto max-w-6xl">
      <PageHeader
        eyebrow={
          <>
            <TicketIcon className="h-3.5 w-3.5" />
            Ticket History
          </>
        }
        title="My Tickets"
        description="A compact view of your active and completed requests with quick status filtering."
        actions={
          <Link to="/tickets/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        }
        meta={
          <>
            <span className="page-meta-chip">
              {statusFilter === 'all' ? 'All statuses' : statusFilter.replace(/_/g, ' ')}
            </span>
            <span className="page-meta-chip">Page {page}</span>
          </>
        }
      />

      <section className="glass-table">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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

              <div className="flex flex-wrap gap-2">
                {filters.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setStatusFilter(value)
                      setPage(1)
                    }}
                    className={clsx(
                      'filter-pill',
                      statusFilter === value ? 'filter-pill-active' : 'filter-pill-inactive'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : tickets.length === 0 ? (
          <div className="px-5 py-14 text-center text-slate-500">
            <TicketIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No tickets found for the current filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Ticket</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Updated</th>
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
                      <td className="px-4 py-4">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(ticket.updated_at)}</td>
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
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <span className="text-[12px] text-slate-500">
                      {ticket.category} • {formatDate(ticket.updated_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {totalPages > 1 ? (
          <div className="border-t border-slate-200 p-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </section>

      <Link
        to="/tickets/new"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#123251] bg-[linear-gradient(135deg,#163b63_0%,#0f7cb8_100%)] shadow-[0_12px_24px_-16px_rgba(15,124,184,0.4)] transition-transform hover:scale-105 lg:hidden"
      >
        <Plus className="h-6 w-6 text-white" />
      </Link>
    </div>
  )
}
