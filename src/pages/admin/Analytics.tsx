import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Building2, Gauge, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type TicketStats } from '@/services/ticketService'
import toast from 'react-hot-toast'

const formatHours = (value: number | null) => (value === null ? '--' : `${value.toFixed(1)}h`)

const shortenName = (value: string, max = 24) => (value.length <= max ? value : `${value.slice(0, max - 3)}...`)

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
  const companyLeaders = stats.company_breakdown.slice(0, 5).map((row) => ({
    ...row,
    shortName: shortenName(row.name),
  }))
  const departmentLeaders = stats.department_breakdown.slice(0, 5).map((row) => ({
    ...row,
    shortName: shortenName(row.name),
  }))

  const summaryCards = [
    {
      label: 'Total Volume',
      value: stats.total,
      helper: 'All tracked tickets',
      icon: Activity,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Active Queue',
      value: activeCount,
      helper: `${((activeCount / total) * 100).toFixed(1)}% of total`,
      icon: TrendingUp,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Resolved',
      value: resolvedCount,
      helper: `${((resolvedCount / total) * 100).toFixed(1)}% completed`,
      icon: ShieldCheck,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Overdue',
      value: overdueCount,
      helper: `${((overdueCount / total) * 100).toFixed(1)}% at risk`,
      icon: Gauge,
      tone: overdueCount > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
    },
  ] as const

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={
          <>
            <TrendingUp className="h-3.5 w-3.5" />
            Analytics Overview
          </>
        }
        title="Operational Analytics"
        description="A tighter reporting surface for queue movement, resolution pace, and company or department concentration."
        meta={
          <>
            <span className="page-meta-chip">SLA met: {compliance.toFixed(1)}%</span>
            <span className="page-meta-chip">
              Support ETA: {formatHours(stats.sla_analysis.avg_support_expected_hours)}
            </span>
            <span className="page-meta-chip">
              Actual resolution: {formatHours(stats.sla_analysis.avg_actual_resolution_hours)}
            </span>
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Trend Monitor</p>
            <h2 className="ui-section-title mt-1">Ticket movement over the last 7 days</h2>
          </div>

          <div className="px-2 pb-2 pt-1">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.daily_trend} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: '#e2e8f0',
                    boxShadow: '0 14px 30px -18px rgba(15, 23, 42, 0.28)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="created" name="Created" stroke="#163b63" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Department Focus</p>
            <h2 className="ui-section-title mt-1">Top departments by volume</h2>
          </div>

          <div className="px-2 pb-2 pt-1">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={departmentLeaders} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    borderColor: '#e2e8f0',
                    boxShadow: '0 14px 30px -18px rgba(15, 23, 42, 0.28)',
                  }}
                />
                <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="#0f7cb8" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Company Breakdown</p>
            <h2 className="ui-section-title mt-1">Busiest customer queues</h2>
          </div>

          <div className="space-y-3 p-4">
            {companyLeaders.map((row, index) => (
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    Open {row.open}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    Resolved {row.resolved}
                  </span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                    Overdue {row.overdue}
                  </span>
                  <span className="rounded-full bg-[#0f7cb8]/8 px-2.5 py-1 text-[11px] font-semibold text-[#163b63]">
                    SLA {row.sla_met_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Coverage Snapshot</p>
            <h2 className="ui-section-title mt-1">Quick operating signals</h2>
          </div>

          <div className="space-y-3 p-4">
            <div className="surface-muted flex items-start justify-between gap-3 p-4">
              <div>
                <p className="ui-data-label">Busiest Company</p>
                <p className="mt-2 font-semibold text-slate-950">
                  {companyLeaders[0]?.name || 'No company data yet'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {companyLeaders[0]
                    ? `${companyLeaders[0].total} tickets currently tracked`
                    : 'Queue concentration will appear here once data is available.'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f7cb8]/8 text-[#163b63]">
                <Building2 className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="surface-muted flex items-start justify-between gap-3 p-4">
              <div>
                <p className="ui-data-label">Agent Coverage</p>
                <p className="mt-2 font-semibold text-slate-950">{stats.agent_leaderboard.length} active agents</p>
                <p className="mt-1 text-sm text-slate-600">
                  Agents with measurable resolution history in the reporting set.
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="surface-muted p-4">
              <p className="ui-data-label">Average Timing Windows</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Customer expected</span>
                  <span className="font-semibold text-slate-900">
                    {formatHours(stats.sla_analysis.avg_customer_expected_hours)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Support proposed</span>
                  <span className="font-semibold text-slate-900">
                    {formatHours(stats.sla_analysis.avg_support_expected_hours)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Actual resolution</span>
                  <span className="font-semibold text-slate-900">
                    {formatHours(stats.sla_analysis.avg_actual_resolution_hours)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
