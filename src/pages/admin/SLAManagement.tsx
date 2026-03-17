import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, GaugeCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type TicketStats } from '@/services/ticketService'

const formatHours = (value: number | null) => (value ? `${value.toFixed(1)} hrs` : '--')
const clampPercent = (value: number) => `${Math.max(0, Math.min(100, value))}%`

export default function SLAManagement() {
  const [stats, setStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    void ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load SLA data'))
  }, [])

  const focusCompanies = useMemo(() => {
    if (!stats) return []
    return [...stats.company_breakdown]
      .sort((left, right) => right.overdue - left.overdue || left.sla_met_pct - right.sla_met_pct)
      .slice(0, 6)
  }, [stats])

  const focusDepartments = useMemo(() => {
    if (!stats) return []
    return [...stats.department_breakdown]
      .sort((left, right) => right.overdue - left.overdue || left.sla_met_pct - right.sla_met_pct)
      .slice(0, 4)
  }, [stats])

  if (!stats) return <PageLoader />

  const totalClosed = Math.max(stats.sla_analysis.total_closed, 1)
  const overdueShare = Math.round((stats.overdue / Math.max(stats.active, 1)) * 100)
  const performanceBars = [
    {
      label: 'Customer expectation met',
      value: stats.sla_analysis.met_customer_expectation_pct,
      tone: 'bg-[#163b63]',
    },
    {
      label: 'Support ETA met',
      value: stats.sla_analysis.met_support_proposal_pct,
      tone: 'bg-emerald-500',
    },
  ]

  const windowRows = [
    {
      label: 'Customer expected window',
      value: formatHours(stats.sla_analysis.avg_customer_expected_hours),
    },
    {
      label: 'Support proposed window',
      value: formatHours(stats.sla_analysis.avg_support_expected_hours),
    },
    {
      label: 'Actual resolution time',
      value: formatHours(stats.sla_analysis.avg_actual_resolution_hours),
    },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={
          <>
            <GaugeCircle className="h-3.5 w-3.5" />
            Service Levels
          </>
        }
        title="SLA Management"
        description="Track commitment windows, overdue pressure, and adherence trends with a tighter operational view."
        meta={
          <>
            <span className="page-meta-chip">{stats.overdue} overdue</span>
            <span className="page-meta-chip">{totalClosed} resolved sampled</span>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f7cb8]/10 text-[#163b63]">
            <Clock3 className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {formatHours(stats.sla_analysis.avg_support_expected_hours)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Avg Support ETA</p>
        </div>

        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Support ETA Met</p>
        </div>

        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <GaugeCircle className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {formatHours(stats.sla_analysis.avg_actual_resolution_hours)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Actual Resolution</p>
        </div>

        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{overdueShare}%</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Overdue Pressure</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <section className="glass-table">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">SLA Attainment</h2>
            <p className="mt-1 text-sm text-slate-500">Performance against captured customer and support commitments.</p>
          </div>

          <div className="space-y-5 px-5 py-5">
            {performanceBars.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-950">{item.value.toFixed(1)}%</p>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className={`h-2.5 rounded-full ${item.tone}`} style={{ width: clampPercent(item.value) }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-950">Average Windows</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {totalClosed} samples
              </span>
            </div>

            <div className="space-y-3">
              {windowRows.map((row) => (
                <div key={row.label} className="surface-muted flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-slate-600">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-950">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-950">Department Focus</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {focusDepartments.length} tracked
              </span>
            </div>

            <div className="space-y-3">
              {focusDepartments.length === 0 ? (
                <div className="surface-muted px-4 py-4 text-sm text-slate-500">No department SLA activity available yet.</div>
              ) : (
                focusDepartments.map((department) => (
                  <div key={department.name} className="surface-muted px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{department.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{department.sla_met_pct.toFixed(1)}% met</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>{department.open} open</span>
                      <span>{department.overdue} overdue</span>
                      <span>{department.resolved} resolved</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="glass-table">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Company SLA Health</h2>
              <p className="mt-1 text-sm text-slate-500">Highest-pressure companies appear first so review stays action-oriented.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {focusCompanies.length} shown
            </span>
          </div>
        </div>

        {focusCompanies.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">No company SLA records available yet.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Open</th>
                    <th className="px-4 py-3 text-left">Overdue</th>
                    <th className="px-4 py-3 text-left">Resolved</th>
                    <th className="px-4 py-3 text-left">SLA Met</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {focusCompanies.map((row) => (
                    <tr key={row.name} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-4 py-4 text-slate-600">{row.open}</td>
                      <td className="px-4 py-4 text-slate-600">{row.overdue}</td>
                      <td className="px-4 py-4 text-slate-600">{row.resolved}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {row.sla_met_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {focusCompanies.map((row) => (
                <div key={row.name} className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{row.open} open</span>
                        <span>{row.overdue} overdue</span>
                        <span>{row.resolved} resolved</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {row.sla_met_pct.toFixed(1)}%
                    </span>
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
