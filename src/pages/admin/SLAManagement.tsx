import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, GaugeCircle } from 'lucide-react'
import ticketService, { type TicketStats } from '@/services/ticketService'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const formatHours = (value: number | null) => (value ? `${value.toFixed(1)} hrs` : '—')

export default function SLAManagement() {
  const [stats, setStats] = useState<TicketStats | null>(null)

  useEffect(() => {
    ticketService.getStats().then(setStats).catch(() => toast.error('Failed to load SLA data'))
  }, [])

  if (!stats) return <PageLoader />

  const totalClosed = Math.max(stats.sla_analysis.total_closed, 1)

  const highlights = [
    {
      icon: Clock3,
      label: 'Avg Support ETA',
      value: formatHours(stats.sla_analysis.avg_support_expected_hours),
      helper: 'Average promised support resolution window',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      icon: CheckCircle2,
      label: 'Met Support ETA',
      value: `${stats.sla_analysis.met_support_proposal_pct.toFixed(1)}%`,
      helper: `${stats.sla_analysis.total_closed} resolved tickets analysed`,
      tone: 'bg-green-50 text-green-700',
    },
    {
      icon: AlertTriangle,
      label: 'Current Overdue',
      value: String(stats.overdue),
      helper: 'Open or in-progress tickets past support ETA',
      tone: 'bg-red-50 text-red-700',
    },
  ]

  return (
    <div className="page-shell">
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]">
              <GaugeCircle className="h-3.5 w-3.5" />
              SLA Control
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">SLA Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Keep support timing visible from commitment through closure, with company-level health and overdue pressure in one place.
            </p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/82 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Resolved Sample</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalClosed}</p>
            <p className="text-sm text-slate-500">tickets contributing to the current SLA picture</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {highlights.map(({ icon: Icon, label, value, helper, tone }) => (
          <div key={label} className="metric-tile">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tone}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            <p className="text-[11px] text-slate-400 mt-2">{helper}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">SLA Outcome Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'Met customer expectation', value: stats.sla_analysis.met_customer_expectation_pct, color: 'bg-[#4E5A7A]' },
              { label: 'Met support proposal', value: stats.sla_analysis.met_support_proposal_pct, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-semibold text-slate-800">{item.value.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${Math.min(100, item.value)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">Calculated from {totalClosed} resolved tickets with captured SLA dates.</p>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Average SLA Windows</h2>
          <div className="space-y-4">
            {[
              { label: 'Customer Expected Resolution', value: formatHours(stats.sla_analysis.avg_customer_expected_hours) },
              { label: 'Support Proposed Resolution', value: formatHours(stats.sla_analysis.avg_support_expected_hours) },
              { label: 'Actual Resolution', value: formatHours(stats.sla_analysis.avg_actual_resolution_hours) },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm text-slate-600">{row.label}</span>
                <span className="font-semibold text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-table">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Company SLA Health</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Company</th>
              <th className="text-left px-4 py-3">Open</th>
              <th className="text-left px-4 py-3">Overdue</th>
              <th className="text-left px-4 py-3">Resolved</th>
              <th className="text-left px-4 py-3">SLA Met</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.company_breakdown.slice(0, 8).map((row) => (
              <tr key={row.name} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.open}</td>
                <td className="px-4 py-3 text-slate-600">{row.overdue}</td>
                <td className="px-4 py-3 text-slate-600">{row.resolved}</td>
                <td className="px-4 py-3 text-slate-600">{row.sla_met_pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

