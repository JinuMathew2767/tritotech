import { useEffect, useMemo, useState } from 'react'
import { ActivitySquare, Download, Search } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import ticketService, { type TicketStats } from '@/services/ticketService'
import { formatDateTime } from '@/utils/formatters'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'

const catColor: Record<string, string> = {
  TICKET: 'bg-[#4E5A7A]/10 text-[#4E5A7A]',
}

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load audit activity'))
  }, [])

  const filtered = useMemo(() => {
    const logs = stats?.recent_activity ?? []
    const query = search.trim().toLowerCase()
    if (!query) return logs
    return logs.filter((log) =>
      log.actor.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      (log.ticket_number || '').toLowerCase().includes(query)
    )
  }, [search, stats])

  if (!stats) return <PageLoader />

  return (
    <div className="page-shell">
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]">
              <ActivitySquare className="h-3.5 w-3.5" />
              Audit Stream
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Audit Logs</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Follow who changed what, when it happened, and how the service desk evolved over time with a cleaner forensic view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {stats.recent_activity.length} recent events
            </span>
            <button className="btn-primary text-sm gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search activity..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">No recorded audit activity yet.</div>
        ) : filtered.map((log) => (
          <div key={log.id} className={clsx('card p-4 transition-all hover:-translate-y-0.5', log.action.includes('resolved') && 'border-l-4 border-l-[#4E5A7A]')}>
            <div className="flex items-start gap-3">
              <Avatar name={log.actor} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-slate-900">{log.actor}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${catColor[log.category] || 'bg-slate-100 text-slate-600'}`}>{log.category}</span>
                  {log.ticket_number && <span className="text-xs font-semibold text-[#4E5A7A]">{log.ticket_number}</span>}
                </div>
                <p className="text-sm text-slate-600">{log.action.replaceAll('_', ' ')}</p>
                <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

