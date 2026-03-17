import { useEffect, useMemo, useState } from 'react'
import { ActivitySquare, Download, Search } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import Avatar from '@/components/ui/Avatar'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import PageHeader from '@/components/ui/PageHeader'
import ticketService, { type TicketStats } from '@/services/ticketService'
import { formatDateTime } from '@/utils/formatters'

const actionLabel = (value: string) => value.replaceAll('_', ' ')

const actionTone = (value: string) => {
  if (value.includes('resolved')) return 'bg-emerald-50 text-emerald-700'
  if (value.includes('assigned')) return 'bg-[#0f7cb8]/8 text-[#163b63]'
  if (value.includes('reopened') || value.includes('overdue')) return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-700'
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('All')

  useEffect(() => {
    void ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load audit activity'))
  }, [])

  const categories = useMemo(() => {
    const values = Array.from(new Set((stats?.recent_activity ?? []).map((log) => log.category))).sort()
    return ['All', ...values]
  }, [stats])

  const filtered = useMemo(() => {
    const logs = stats?.recent_activity ?? []
    const query = search.trim().toLowerCase()

    return logs.filter((log) => {
      const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter
      const matchesQuery =
        !query ||
        log.actor.toLowerCase().includes(query) ||
        actionLabel(log.action).toLowerCase().includes(query) ||
        (log.ticket_number || '').toLowerCase().includes(query)

      return matchesCategory && matchesQuery
    })
  }, [categoryFilter, search, stats])

  const resolvedEvents = useMemo(
    () => (stats?.recent_activity ?? []).filter((log) => log.action.includes('resolved')).length,
    [stats]
  )

  const exportLogs = () => {
    if (filtered.length === 0) return

    const header = ['Time', 'Actor', 'Action', 'Category', 'Ticket']
    const rows = filtered.map((log) => [
      formatDateTime(log.created_at),
      log.actor,
      actionLabel(log.action),
      log.category,
      log.ticket_number || '',
    ])

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!stats) return <PageLoader />

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={
          <>
            <ActivitySquare className="h-3.5 w-3.5" />
            Activity Stream
          </>
        }
        title="Audit Logs"
        description="Review user actions and ticket lifecycle changes in a cleaner, search-driven operational trail."
        actions={
          <button onClick={exportLogs} className="btn-secondary gap-2" disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        }
        meta={
          <>
            <span className="page-meta-chip">{stats.recent_activity.length} recent events</span>
            <span className="page-meta-chip">{resolvedEvents} resolution updates</span>
          </>
        }
      />

      <section className="glass-table">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search actor, action, or ticket..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={clsx(
                    'filter-pill',
                    categoryFilter === category ? 'filter-pill-active' : 'filter-pill-inactive'
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-slate-500">
            No audit activity matches the current filters.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Actor</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Ticket</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={log.actor} size="sm" />
                          <span className="font-semibold text-slate-900">{log.actor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionTone(log.action)}`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{log.ticket_number || '--'}</td>
                      <td className="px-4 py-4 text-slate-700">{log.category}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {filtered.map((log) => (
                <div key={log.id} className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={log.actor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{log.actor}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${actionTone(log.action)}`}>
                          {actionLabel(log.action)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{log.category}</span>
                        <span>{log.ticket_number || '--'}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
