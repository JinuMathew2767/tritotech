import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { Ticket, CheckCircle2, Clock3, AlertTriangle, ArrowUpRight, Building2, Gauge, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import ticketService, { type TicketStats } from '@/services/ticketService'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const formatHours = (value: number | null) => (value === null ? '--' : `${value.toFixed(1)}h`)

const statusPalette = [
  { label: 'Open', color: '#4E5A7A', bg: 'bg-cyan-50', text: 'text-cyan-700' },
  { label: 'Assigned Pending', color: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700' },
  { label: 'In Progress', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
  { label: 'Resolved', color: '#16a34a', bg: 'bg-emerald-50', text: 'text-emerald-700' },
]

type ChartRow = {
  name: string
  shortName: string
  total: number
  open: number
  resolved: number
  overdue: number
  sla_met_pct: number
}

const shortenName = (value: string) => {
  if (value.length <= 26) return value
  return `${value.slice(0, 23)}...`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load stats'))
  }, [])

  if (!stats) return <PageLoader />

  const total = Math.max(stats.total, 1)
  const resolvedPct = (stats.resolved / total) * 100
  const activePct = (stats.active / total) * 100
  const overduePct = (stats.overdue / total) * 100
  const avgActual = stats.sla_analysis.avg_actual_resolution_hours
  const avgSupport = stats.sla_analysis.avg_support_expected_hours
  const paceDelta = avgActual !== null && avgSupport !== null ? Math.abs(avgActual - avgSupport).toFixed(1) : null

  const kpis = [
    {
      label: 'Total Tickets',
      value: stats.total,
      helper: 'All tickets in the service desk',
      icon: Ticket,
      color: 'text-cyan-700',
      bg: 'bg-cyan-50',
      accent: 'from-cyan-500/20 to-sky-500/5',
    },
    {
      label: 'Active Queue',
      value: stats.active,
      helper: `${activePct.toFixed(1)}% of total workload`,
      icon: Clock3,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      accent: 'from-amber-500/20 to-orange-500/5',
    },
    {
      label: 'Resolved',
      value: stats.resolved,
      helper: `${resolvedPct.toFixed(1)}% completion share`,
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      accent: 'from-emerald-500/20 to-teal-500/5',
    },
    {
      label: 'Overdue Risk',
      value: `${overduePct.toFixed(1)}%`,
      helper: 'Tickets already beyond proposed timing',
      icon: AlertTriangle,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      accent: 'from-rose-500/20 to-orange-500/5',
    },
  ]

  const topCompanies: ChartRow[] = stats.company_breakdown.slice(0, 5).map((row) => ({
    ...row,
    shortName: shortenName(row.name),
  }))
  const leadingCompany = topCompanies[0]
  const statusRows = stats.status_breakdown.map((row, index) => {
    const palette = statusPalette[index] || statusPalette[0]
    const pct = total ? (row.value / total) * 100 : 0
    return { ...row, ...palette, pct }
  })
  let cursor = 0
  const statusGradient = `conic-gradient(${statusRows
    .map((row) => {
      const start = cursor
      cursor += row.pct
      return `${row.color} ${start}% ${cursor}%`
    })
    .join(', ')})`

  return (
    <div className="space-y-4 p-4 md:p-5">
      <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#08233a_0%,#0c3f63_55%,#0a2942_100%)] p-4 shadow-[0_18px_50px_-34px_rgba(15,76,119,0.55)] md:p-5">
        <div className="pointer-events-none absolute -right-8 top-6 h-28 w-28 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-20 w-20 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] xl:block" />

        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_300px]">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50/90">
              <Sparkles className="h-3.5 w-3.5" />
              Operations Snapshot
            </div>
            <h1 className="mt-3 max-w-2xl text-[1.75rem] font-bold tracking-tight text-white md:text-[1.95rem]">
              Team workload, SLA health, and queue movement at a glance.
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-slate-200/90 md:text-sm">
              A compact operational read on ticket pace, delivery confidence, and where attention is needed next.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">Support ETA</p>
                <p className="mt-1.5 text-[1.35rem] font-bold leading-none text-white">{formatHours(stats.sla_analysis.avg_support_expected_hours)}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-200/85">Average requester commitment</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">Actual Resolution</p>
                <p className="mt-1.5 text-[1.35rem] font-bold leading-none text-white">{formatHours(stats.sla_analysis.avg_actual_resolution_hours)}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-200/85">
                  {paceDelta ? `${paceDelta}h against support ETA` : 'Waiting for more history'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">SLA Met</p>
                <p className="mt-1.5 text-[1.35rem] font-bold leading-none text-white">{stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-200/85">Resolved inside support ETA</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/80">Active Queue</p>
                <p className="mt-1.5 text-[1.35rem] font-bold leading-none text-white">{stats.active}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-200/85">{activePct.toFixed(1)}% of current ticket load</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 rounded-[22px] border border-white/40 bg-white/72 p-3.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Executive Pulse</p>
                <p className="mt-1 text-[2rem] font-bold tracking-tight text-slate-900">{stats.total}</p>
                <p className="text-[12px] leading-5 text-slate-500">tickets currently tracked in the platform</p>
              </div>
              <div className="rounded-2xl bg-slate-900 px-3 py-2 text-right text-white">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Compliance</p>
                <p className="mt-1 text-lg font-semibold">{stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%</p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {statusRows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-white/60 bg-white/55 p-2.5 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      <span className="text-[13px] font-semibold text-slate-700">{row.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-slate-900">{row.value}</p>
                      <p className="text-[11px] text-slate-400">{row.pct.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-white">
                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-2xl border border-white/55 bg-white/55 p-3 backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Overdue Queue</p>
              <div className="mt-1.5 flex items-end justify-between gap-3">
                <p className="text-[1.8rem] font-bold tracking-tight text-slate-900">{stats.overdue}</p>
                <p className="text-[12px] leading-5 text-slate-500">tickets need immediate attention</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, helper, icon: Icon, color, bg, accent }) => (
          <div
            key={label}
            className={clsx(
              'relative overflow-hidden rounded-[20px] border border-white/60 bg-white/70 p-3.5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.26)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5',
              `bg-gradient-to-br ${accent}`
            )}
          >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/45 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${bg}`}>
                <Icon className={`h-4.5 w-4.5 ${color}`} />
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 text-slate-400" />
            </div>
            <div className="relative mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
              <p className="mt-2 text-[1.8rem] font-bold leading-none tracking-tight text-slate-900">{value}</p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{helper}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_340px]">
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workload Map</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Ticket distribution by company</h2>
            </div>
            {leadingCompany && (
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                <Building2 className="h-4 w-4" />
                Busiest: {leadingCompany.shortName}
              </div>
            )}
          </div>

          {topCompanies.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No company ticket data yet.</div>
          ) : (
            <div className="px-2 pb-2 pt-1">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topCompanies} margin={{ top: 14, right: 8, left: 2, bottom: 4 }}>
                  <defs>
                    <linearGradient id="ticketCompanyBar" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4E5A7A" />
                      <stop offset="100%" stopColor="#0f78c9" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: '#e2e8f0',
                      boxShadow: '0 14px 30px -18px rgba(15, 23, 42, 0.35)',
                    }}
                    formatter={(value) => [`${value ?? 0} tickets`, 'Volume']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                  />
                  <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="url(#ticketCompanyBar)" barSize={34}>
                    {topCompanies.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? 'url(#ticketCompanyBar)' : `hsl(${202 + index * 9}, 72%, ${50 + index * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resolution Mix</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Ticket status split</h2>
          </div>

          <div className="p-4">
            <div className="mx-auto flex w-full max-w-[180px] items-center justify-center">
              <div
                className="relative grid h-[180px] w-[180px] place-items-center rounded-full"
                style={{ backgroundImage: statusGradient }}
              >
                <div className="grid h-[112px] w-[112px] place-items-center rounded-full border border-white/60 bg-white/78 text-center shadow-inner backdrop-blur-md">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Total</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{stats.total}</p>
                    <p className="text-xs text-slate-500">tracked tickets</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {statusRows.map((row) => (
                <div key={row.label} className={`rounded-2xl border border-white/60 px-3.5 py-2.5 backdrop-blur-md ${row.bg}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.pct.toFixed(1)}% of platform tickets</p>
                      </div>
                    </div>
                    <p className={`text-base font-bold ${row.text}`}>{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">SLA League Table</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Company SLA performance</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <Gauge className="h-4 w-4 text-cyan-600" />
            Support ETA hit rate: {stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%
          </div>
        </div>

        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
          {stats.company_breakdown.slice(0, 4).map((row, index) => (
            <div
              key={row.name}
              className="rounded-[20px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(248,251,253,0.72)_100%)] p-3.5 shadow-sm backdrop-blur-lg transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Rank #{index + 1}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-5 text-slate-900">{row.name}</h3>
                </div>
                <div className="rounded-2xl border border-white/60 bg-cyan-50/80 px-3 py-2 text-right backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-600">SLA Met</p>
                  <p className="mt-1 text-lg font-bold text-cyan-700">{row.sla_met_pct.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#4E5A7A_0%,#16a34a_100%)]"
                  style={{ width: `${Math.min(100, row.sla_met_pct)}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-white/50 bg-white/65 p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Open</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{row.open}</p>
                </div>
                <div className="rounded-2xl border border-white/50 bg-emerald-50/80 p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-600">Resolved</p>
                  <p className="mt-1 text-base font-bold text-emerald-700">{row.resolved}</p>
                </div>
                <div className="rounded-2xl border border-white/50 bg-rose-50/80 p-3 backdrop-blur-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-rose-600">Overdue</p>
                  <p className="mt-1 text-base font-bold text-rose-700">{row.overdue}</p>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                {row.total} total tickets tracked for this company across active and completed work.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

