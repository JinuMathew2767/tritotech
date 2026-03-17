import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Clock3, Gauge, Layers3, TriangleAlert } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type TicketStats } from '@/services/ticketService'
import toast from 'react-hot-toast'

const formatHours = (value: number | null) => (value === null ? '--' : `${value.toFixed(1)}h`)

const statusPalette = [
  { label: 'Open', color: 'bg-sky-500', tone: 'text-sky-700 bg-sky-50' },
  { label: 'Assigned Pending', color: 'bg-violet-500', tone: 'text-violet-700 bg-violet-50' },
  { label: 'In Progress', color: 'bg-amber-500', tone: 'text-amber-700 bg-amber-50' },
  { label: 'Resolved', color: 'bg-emerald-500', tone: 'text-emerald-700 bg-emerald-50' },
] as const

const shortenName = (value: string) => (value.length <= 28 ? value : `${value.slice(0, 25)}...`)

export default function AdminDashboard() {
  const [stats, setStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load stats'))
  }, [])

  if (!stats) return <PageLoader />

  const total = Math.max(stats.total, 1)
  const avgActual = stats.sla_analysis.avg_actual_resolution_hours
  const avgSupport = stats.sla_analysis.avg_support_expected_hours
  const paceDelta = avgActual !== null && avgSupport !== null ? Math.abs(avgActual - avgSupport).toFixed(1) : null
  const leadingCompany = stats.company_breakdown[0]
  const statusRows = stats.status_breakdown.map((row, index) => {
    const palette = statusPalette[index] || statusPalette[0]
    const pct = total ? (row.value / total) * 100 : 0
    return { ...row, ...palette, pct }
  })

  const summaryCards = [
    {
      label: 'Total Tickets',
      value: stats.total,
      helper: 'All tracked requests',
      icon: Layers3,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'SLA Met',
      value: `${stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%`,
      helper: 'Resolved within support ETA',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Resolution Pace',
      value: formatHours(stats.sla_analysis.avg_actual_resolution_hours),
      helper: paceDelta ? `${paceDelta}h from support ETA` : 'Awaiting more closure data',
      icon: Clock3,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Overdue Queue',
      value: stats.overdue,
      helper: 'Tickets needing intervention',
      icon: TriangleAlert,
      tone: stats.overdue > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
    },
  ] as const

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={
          <>
            <Gauge className="h-3.5 w-3.5" />
            Operations Overview
          </>
        }
        title="Admin Dashboard"
        description="A cleaner operational snapshot of queue health, throughput, company load, and SLA performance."
        meta={
          <>
            <span className="page-meta-chip">Active queue: {stats.active}</span>
            <span className="page-meta-chip">Resolved: {stats.resolved}</span>
            <span className="page-meta-chip">Support ETA: {formatHours(stats.sla_analysis.avg_support_expected_hours)}</span>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, helper, icon: Icon, tone }) => (
          <div key={label} className="metric-tile">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-metric-label">{label}</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-slate-950">{value}</p>
                <p className="mt-2 text-[12px] text-slate-500">{helper}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Queue Composition</p>
            <h2 className="ui-section-title mt-1">Ticket status balance</h2>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="surface-muted p-4">
              <p className="ui-data-label">Current Focus</p>
              <p className="mt-2 text-[1.2rem] font-semibold tracking-[-0.03em] text-slate-950">
                {stats.overdue === 0 ? 'Queue is stable' : 'Overdue work needs attention'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {stats.overdue === 0
                  ? 'No overdue tickets are currently flagged in the support desk.'
                  : `${stats.overdue} tickets are outside the expected support window and should be reviewed first.`}
              </p>
            </div>

            <div className="space-y-3">
              {statusRows.map((row) => (
                <div key={row.label} className="rounded-[16px] border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                      <p className="font-semibold text-slate-900">{row.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.tone}`}>
                        {row.pct.toFixed(1)}%
                      </span>
                      <span className="font-semibold text-slate-700">{row.value}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Company Load</p>
            <h2 className="ui-section-title mt-1">Top queues</h2>
          </div>

          <div className="space-y-3 p-4">
            <div className="surface-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ui-data-label">Busiest Company</p>
                  <p className="mt-2 text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-950">
                    {leadingCompany ? shortenName(leadingCompany.name) : 'No data'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {leadingCompany
                      ? `${leadingCompany.total} tickets with ${leadingCompany.sla_met_pct.toFixed(1)}% SLA met`
                      : 'Company volume will appear here once ticket activity is available.'}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f7cb8]/8 text-[#163b63]">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
              </div>
            </div>

            {stats.company_breakdown.slice(0, 5).map((row, index) => (
              <div key={row.name} className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ui-data-label">Rank #{index + 1}</p>
                    <p className="mt-1 truncate font-semibold text-slate-900">{row.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[1.05rem] font-bold text-slate-950">{row.total}</p>
                    <p className="text-[11px] text-slate-500">tickets</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#163b63_0%,#0f7cb8_100%)]"
                    style={{ width: `${Math.min(100, row.sla_met_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
