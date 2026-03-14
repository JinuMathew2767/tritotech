import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, BarChart, Bar, Cell, YAxis } from 'recharts'
import { Activity, Building2, Download, Gauge, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import clsx from 'clsx'
import ticketService, { type TicketStats } from '@/services/ticketService'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const formatHours = (value: number | null) => (value === null ? '--' : `${value.toFixed(1)}h`)

const shortenName = (value: string, max = 28) => {
  if (value.length <= max) return value
  return `${value.slice(0, max - 3)}...`
}

export default function Analytics() {
  const [stats, setStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load analytics'))
  }, [])

  if (!stats) return <PageLoader />

  const total = Math.max(stats.total, 1)
  const activeCount = stats.active
  const resolvedCount = stats.resolved
  const overdueCount = stats.overdue
  const compliance = stats.sla_analysis.met_support_proposal_pct
  const companyLeaders = stats.company_breakdown.slice(0, 4).map((row) => ({
    ...row,
    shortName: shortenName(row.name, 24),
  }))
  const departmentLeaders = stats.department_breakdown.slice(0, 4).map((row) => ({
    ...row,
    shortName: shortenName(row.name, 24),
  }))
  const strongestCompany = companyLeaders[0]

  const summaryCards = [
    {
      label: 'Total Volume',
      value: stats.total,
      helper: 'All tracked tickets',
      icon: Activity,
      accent: 'from-cyan-500/20 to-sky-500/5',
      iconTone: 'text-cyan-700',
      iconBg: 'bg-cyan-50/85',
      progress: 100,
    },
    {
      label: 'Active Queue',
      value: activeCount,
      helper: `${((activeCount / total) * 100).toFixed(1)}% of total`,
      icon: TrendingUp,
      accent: 'from-amber-500/20 to-orange-500/5',
      iconTone: 'text-amber-700',
      iconBg: 'bg-amber-50/85',
      progress: (activeCount / total) * 100,
    },
    {
      label: 'Resolved',
      value: resolvedCount,
      helper: `${((resolvedCount / total) * 100).toFixed(1)}% completed`,
      icon: ShieldCheck,
      accent: 'from-emerald-500/20 to-teal-500/5',
      iconTone: 'text-emerald-700',
      iconBg: 'bg-emerald-50/85',
      progress: (resolvedCount / total) * 100,
    },
    {
      label: 'Overdue',
      value: overdueCount,
      helper: `${((overdueCount / total) * 100).toFixed(1)}% at risk`,
      icon: Gauge,
      accent: 'from-rose-500/20 to-orange-500/5',
      iconTone: 'text-rose-700',
      iconBg: 'bg-rose-50/85',
      progress: (overdueCount / total) * 100,
    },
  ]

  const timingCards = [
    {
      label: 'Customer Expected',
      value: formatHours(stats.sla_analysis.avg_customer_expected_hours),
      helper: 'Average requested resolution window',
    },
    {
      label: 'Support Proposed',
      value: formatHours(stats.sla_analysis.avg_support_expected_hours),
      helper: 'Average support commitment window',
    },
    {
      label: 'Actual Resolution',
      value: formatHours(stats.sla_analysis.avg_actual_resolution_hours),
      helper: 'Average completed resolution time',
    },
  ]

  return (
    <div className="space-y-4 p-4 md:p-5">
      <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,#07243b_0%,#0f4c77_55%,#0b2941_100%)] p-5 shadow-[0_18px_50px_-30px_rgba(15,76,119,0.65)]">
        <div className="pointer-events-none absolute -right-8 top-8 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] xl:block" />

        <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_330px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50/90">
              <TrendingUp className="h-3.5 w-3.5" />
              Analytics Overview
            </div>
            <h1 className="mt-3 max-w-2xl text-[2rem] font-bold tracking-tight text-white md:text-[2.1rem]">
              Modern reporting for queue movement, resolution pace, and team performance.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Follow how work is entering, getting resolved, and where SLA pressure is building across companies and departments.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {timingCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-white/12 bg-white/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">{card.label}</p>
                  <p className="mt-1.5 text-xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-200">{card.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 rounded-[22px] border border-white/40 bg-white/72 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Report Pulse</p>
                <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">tickets in the reporting window</p>
              </div>
              <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-2xl border border-white/60 bg-white/55 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">SLA Compliance</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{compliance.toFixed(1)}%</p>
                  </div>
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#4E5A7A_0%,#16a34a_100%)]"
                    style={{ width: `${Math.min(100, compliance)}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/55 bg-white/55 p-3.5 backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Top Company</p>
                <div className="mt-2.5 flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{strongestCompany?.name || 'No data yet'}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {strongestCompany ? `${strongestCompany.total} tickets with ${strongestCompany.sla_met_pct.toFixed(1)}% SLA met` : 'Waiting for more ticket activity'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/55 bg-white/55 p-3.5 backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Agent Coverage</p>
                <div className="mt-2.5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900">{stats.agent_leaderboard.length}</p>
                    <p className="text-sm text-slate-500">agents with measurable resolution history</p>
                  </div>
                  <Users className="h-7 w-7 text-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, helper, icon: Icon, accent, iconTone, iconBg, progress }) => (
          <div
            key={label}
            className={clsx(
              'relative overflow-hidden rounded-[22px] border border-white/60 bg-white/70 p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.3)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5',
              `bg-gradient-to-br ${accent}`
            )}
          >
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/50 blur-2xl" />
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-2xl ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconTone}`} />
            </div>
            <div className="relative mt-4">
              <p className="text-[1.75rem] font-bold tracking-tight text-slate-900">{value}</p>
              <p className="mt-1.5 text-sm font-semibold text-slate-700">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
              <div className="mt-3 h-2 rounded-full bg-white/80">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#4E5A7A_0%,#0f78c9_100%)]"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_340px]">
        <section className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Trend Monitor</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Ticket trends over the last 7 days</h2>
          </div>

          <div className="px-2 pb-2 pt-1">
            <ResponsiveContainer width="100%" height={245}>
              <LineChart data={stats.daily_trend} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: '#e2e8f0',
                    boxShadow: '0 14px 30px -18px rgba(15, 23, 42, 0.35)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="created" name="Created" stroke="#4E5A7A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">SLA Signal</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Resolution quality snapshot</h2>
          </div>

          <div className="p-4">
            <div className="mx-auto flex w-full max-w-[180px] items-center justify-center">
              <div
                className="relative grid h-[180px] w-[180px] place-items-center rounded-full"
                style={{
                  backgroundImage: `conic-gradient(#4E5A7A 0% ${compliance}%, #e2e8f0 ${compliance}% 100%)`,
                }}
              >
                <div className="grid h-[112px] w-[112px] place-items-center rounded-full border border-white/60 bg-white/78 text-center shadow-inner backdrop-blur-md">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">SLA Met</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{compliance.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">support ETA success</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="rounded-2xl border border-white/60 bg-cyan-50/80 px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Actual Resolution</p>
                    <p className="text-xs text-slate-500">How long resolved work actually took</p>
                  </div>
                  <p className="text-base font-bold text-cyan-700">{formatHours(stats.sla_analysis.avg_actual_resolution_hours)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-emerald-50/80 px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Support Proposed</p>
                    <p className="text-xs text-slate-500">Average promise made by support</p>
                  </div>
                  <p className="text-base font-bold text-emerald-700">{formatHours(stats.sla_analysis.avg_support_expected_hours)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-amber-50/80 px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Customer Expected</p>
                    <p className="text-xs text-slate-500">Average expectation coming from requests</p>
                  </div>
                  <p className="text-base font-bold text-amber-700">{formatHours(stats.sla_analysis.avg_customer_expected_hours)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {[
          { title: 'Tickets by Company', subtitle: 'Top company workload', data: companyLeaders, tone: 'cyan' as const, icon: Building2 },
          { title: 'Tickets by Department', subtitle: 'Top department workload', data: departmentLeaders, tone: 'amber' as const, icon: Users },
        ].map(({ title, subtitle, data, tone, icon: Icon }) => (
          <section
            key={title}
            className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{subtitle}</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
              </div>
              <div
                className={clsx(
                  'grid h-10 w-10 place-items-center rounded-2xl',
                  tone === 'cyan' ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="px-2 pb-2 pt-1">
              <ResponsiveContainer width="100%" height={235}>
                <BarChart data={data} margin={{ top: 14, right: 8, left: 0, bottom: 0 }} layout="vertical">
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="shortName"
                    type="category"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 16,
                      borderColor: '#e2e8f0',
                      boxShadow: '0 14px 30px -18px rgba(15, 23, 42, 0.35)',
                    }}
                    formatter={(value) => [`${value ?? 0} tickets`, 'Volume']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                  />
                  <Bar dataKey="total" radius={[0, 10, 10, 0]} barSize={16}>
                    {data.map((_, index) => (
                      <Cell
                        key={index}
                        fill={tone === 'cyan' ? (index === 0 ? '#4E5A7A' : `hsl(${200 + index * 7}, 72%, ${48 + index * 3}%)`) : (index === 0 ? '#f59e0b' : `hsl(${35 + index * 6}, 88%, ${52 + index * 3}%)`)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ))}
      </div>

      <section className="overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Leaderboard</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Agent performance ranking</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <Users className="h-4 w-4 text-cyan-600" />
            Top responders by resolved volume
          </div>
        </div>

        {stats.agent_leaderboard.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400">No agent resolution data yet.</div>
        ) : (
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {stats.agent_leaderboard.slice(0, 4).map((agent, index) => (
              <div
                key={agent.id}
                className="rounded-[20px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(248,251,253,0.72)_100%)] p-3.5 shadow-sm backdrop-blur-lg transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Rank #{index + 1}</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{agent.name}</h3>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-cyan-50/80 px-3 py-2 text-right backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-600">Resolved</p>
                    <p className="mt-1 text-lg font-bold text-cyan-700">{agent.resolved}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-white/50 bg-white/65 p-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Avg Resolution</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{formatHours(agent.avg_resolution_hours)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/50 bg-emerald-50/80 p-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-600">Share</p>
                    <p className="mt-1 text-base font-bold text-emerald-700">{((agent.resolved / Math.max(resolvedCount, 1)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

