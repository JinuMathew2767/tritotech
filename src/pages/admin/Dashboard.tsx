import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { CheckCircle2, Clock3, Building2, Gauge, Sparkles } from 'lucide-react'
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
  const avgActual = stats.sla_analysis.avg_actual_resolution_hours
  const avgSupport = stats.sla_analysis.avg_support_expected_hours
  const paceDelta = avgActual !== null && avgSupport !== null ? Math.abs(avgActual - avgSupport).toFixed(1) : null

  const topCompanies: ChartRow[] = stats.company_breakdown.slice(0, 5).map((row) => ({
    ...row,
    shortName: shortenName(row.name),
  }))
  const leadingCompany = topCompanies[0]
  const assignedPendingCount = stats.status_breakdown.find((row) => row.label === 'Assigned Pending')?.value ?? 0
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
  const stripStats = [
    { label: 'SLA', value: `${stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%` },
    { label: 'Support ETA', value: formatHours(stats.sla_analysis.avg_support_expected_hours) },
    { label: 'Actual Resolution', value: formatHours(stats.sla_analysis.avg_actual_resolution_hours) },
    { label: 'Active Queue', value: String(stats.active) },
  ]
  const summaryCards = [
    {
      label: 'Time to Resolution',
      value: formatHours(stats.sla_analysis.avg_actual_resolution_hours),
      helper: paceDelta ? `${paceDelta}h away from support ETA` : 'Waiting for more resolved-ticket history',
      icon: Clock3,
      tone: 'text-amber-700',
      bg: 'bg-amber-50',
      accent: 'Within target range',
    },
    {
      label: 'SLA Confidence',
      value: `${stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%`,
      helper: 'Resolved tickets landing inside the support ETA commitment.',
      icon: CheckCircle2,
      tone: 'text-sky-700',
      bg: 'bg-sky-50',
      accent: 'Live compliance signal',
    },
    {
      label: 'Busiest Company',
      value: leadingCompany?.shortName ?? 'No data',
      helper: leadingCompany ? `${leadingCompany.total} tickets currently tracked` : 'No company volume yet',
      icon: Building2,
      tone: 'text-indigo-700',
      bg: 'bg-indigo-50',
      accent: leadingCompany ? 'Highest current throughput' : 'Awaiting traffic',
    },
  ]

  return (
    <div className="space-y-4 p-4 md:p-5">
      <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,250,252,0.86)_100%)] shadow-[0_24px_55px_-34px_rgba(15,23,42,0.26)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200/80 bg-[linear-gradient(90deg,#0a2f45_0%,#103b57_52%,#143956_100%)] px-4 py-3 text-white">
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            <Sparkles className="h-3.5 w-3.5" />
            Operations Snapshot
          </div>
          {stripStats.map((item) => (
            <div key={item.label} className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-100">
              <span className="uppercase tracking-[0.16em] text-slate-300">{item.label}</span>
              <span className="text-[1rem] font-bold text-white">{item.value}</span>
            </div>
          ))}
          <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live Updates
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.55fr)_300px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-[2rem] font-bold tracking-tight text-slate-950">Ticket Velocity</h1>
                <p className="mt-1 text-[14px] font-medium leading-6 text-slate-500">
                  Real-time throughput analysis for the current support cycle.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl bg-slate-100 px-4 py-2 text-[12px] font-semibold text-slate-700">
                  Daily
                </button>
                <button className="rounded-xl bg-[#0c3551] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_16px_30px_-20px_rgba(12,53,81,0.55)]">
                  Weekly
                </button>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/75 bg-white/78 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f5d91]">Performance Trend</p>
                  <h2 className="mt-2 text-[1.9rem] font-bold tracking-tight text-slate-950">Inbound Volume</h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[2.35rem] font-bold leading-none tracking-tight text-slate-950">{stats.total}</p>
                  <p className="mt-2 text-[12px] font-semibold text-[#0f5d91]">
                    {resolvedPct.toFixed(1)}% resolved share
                  </p>
                </div>
              </div>

              {topCompanies.length === 0 ? (
                <div className="mt-8 rounded-[22px] bg-slate-50 px-5 py-16 text-center text-sm text-slate-400">
                  No company ticket data yet.
                </div>
              ) : (
                <div className="mt-4 h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompanies} margin={{ top: 10, right: 4, left: -8, bottom: 2 }}>
                      <CartesianGrid vertical={false} stroke="#edf2f7" strokeDasharray="4 4" />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                        contentStyle={{
                          borderRadius: 16,
                          borderColor: '#e2e8f0',
                          boxShadow: '0 14px 30px -18px rgba(15, 23, 42, 0.22)',
                        }}
                        formatter={(value) => [`${value ?? 0} tickets`, 'Volume']}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                      />
                      <Bar dataKey="total" radius={[12, 12, 0, 0]} barSize={38}>
                        {topCompanies.map((_, index) => (
                          <Cell
                            key={index}
                            fill={index === 3 ? '#0f69ac' : '#dbe4ee'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {summaryCards.map(({ label, value, helper, icon: Icon, tone, bg, accent }) => (
                <div
                  key={label}
                  className="rounded-[24px] border border-white/75 bg-white/78 p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.16)]"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg}`}>
                    <Icon className={`h-4.5 w-4.5 ${tone}`} />
                  </div>
                  <p className="mt-4 text-[15px] font-semibold tracking-tight text-slate-950">{label}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <p className="text-[2rem] font-bold leading-none tracking-tight text-slate-950">{value}</p>
                  </div>
                  <p className="mt-2 text-[12px] font-semibold text-[#0f5d91]">{accent}</p>
                  <p className="mt-1.5 text-[12px] leading-5 text-slate-500">{helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] bg-[linear-gradient(180deg,#072f47_0%,#08283d_100%)] p-5 text-white shadow-[0_24px_55px_-34px_rgba(8,19,31,0.7)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">Executive Pulse</p>
                <p className="mt-6 text-[3rem] font-bold leading-none tracking-tight">{stats.sla_analysis.met_support_proposal_pct.toFixed(0)}%</p>
                <p className="mt-2 text-[14px] font-medium text-slate-300">SLA compliance confidence</p>
              </div>
              <button className="text-slate-300">...</button>
            </div>

            <div className="mt-6 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,#0ea5e9_0%,#38bdf8_100%)]"
                style={{ width: `${Math.min(100, stats.sla_analysis.met_support_proposal_pct)}%` }}
              />
            </div>

            <div className="mt-8 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-white">Critical Tickets</p>
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Alert
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">Overdue Queue</p>
                    <p className="mt-1 text-[11px] text-slate-400">{stats.overdue} tickets need immediate attention</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">Assigned Pending</p>
                    <p className="mt-1 text-[11px] text-slate-400">{assignedPendingCount} tickets waiting for work to begin</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/6 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">Active Queue</p>
                    <p className="mt-1 text-[11px] text-slate-400">{stats.active} live tickets currently moving through the desk</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

