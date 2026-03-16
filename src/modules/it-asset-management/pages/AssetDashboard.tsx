import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  HardDrive,
  Plus,
  Repeat2,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssetModuleTabs from '../components/AssetModuleTabs'
import type { AssetRecord } from '../data/mockAssets'
import assetService from '../services/assetService'
import { getExpiryPresentation, summarizeAssets } from '../utils/assetUtils'

export default function AssetDashboard() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    assetService
      .list()
      .then(setAssets)
      .catch(() => toast.error('Failed to load asset dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => summarizeAssets(assets), [assets])
  const assignedCount = useMemo(() => assets.filter((asset) => !!asset.assignedTo.trim()).length, [assets])
  const availableCount = useMemo(() => assets.filter((asset) => !asset.assignedTo.trim() || asset.status === 'In Stock').length, [assets])
  const maintenanceCount = useMemo(
    () => assets.filter((asset) => asset.status === 'Maintenance' || asset.status === 'Retired').length,
    [assets]
  )
  const attentionAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const status = getExpiryPresentation(asset.expiryDate).status
        return status === 'Expired' || status === 'Expiring Soon'
      }).slice(0, 5),
    [assets]
  )
  const attentionCount = summary.expiringSoon + summary.expired

  if (loading) return <PageLoader />

  const primaryMetrics = [
    {
      label: 'Tracked Assets',
      value: summary.totalAssets,
      helper: 'Full register',
      icon: Boxes,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
    },
    {
      label: 'Available',
      value: availableCount,
      helper: 'Ready to issue',
      icon: ClipboardList,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Needs Attention',
      value: attentionCount,
      helper: attentionCount > 0 ? 'Renewals to review' : 'No active renewal risk',
      icon: ShieldAlert,
      color: attentionCount > 0 ? 'text-amber-700' : 'text-emerald-700',
      bg: attentionCount > 0 ? 'bg-amber-50' : 'bg-emerald-50',
    },
    {
      label: 'Assigned',
      value: assignedCount,
      helper: 'Placed with teams',
      icon: FolderKanban,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
  ] as const

  const workspaceLinks = [
    {
      title: 'Asset Master',
      body: 'Browse and edit records',
      to: '/it-assets/master',
      icon: FolderKanban,
    },
    {
      title: 'Transactions',
      body: 'Issue, return, transfer',
      to: '/it-assets/transactions',
      icon: Repeat2,
    },
    {
      title: 'Renewals',
      body: 'Expiry and warranty watch',
      to: '/it-assets/analytics',
      icon: CalendarClock,
    },
  ]

  return (
    <div className="page-shell space-y-3">
      <AssetModuleTabs />

      <section className="card p-4 md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4E5A7A]/10 bg-[#4E5A7A]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4E5A7A]">
                <Boxes className="h-3 w-3" />
                Asset Dashboard
              </div>
              <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight text-slate-950">Asset Desk</h1>
              <p className="mt-1 text-[12px] font-medium text-slate-500">Stock, renewals, and next actions in one place.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/it-assets/master" className="btn-secondary gap-2 px-3 py-2 text-[12px]">
                <FolderKanban className="h-4 w-4" />
                Open Master
              </Link>
              <Link to="/it-assets/add" className="btn-primary gap-2 px-3 py-2 text-[12px]">
                <Plus className="h-4 w-4" />
                Add Asset
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {primaryMetrics.map(({ label, value, helper, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="rounded-[18px] border border-slate-200 bg-slate-50/85 px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                      <p className="mt-2 text-[1.55rem] font-bold leading-none tracking-tight text-slate-950">{value}</p>
                      <p className="mt-2 text-[11px] text-slate-500">{helper}</p>
                    </div>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9fc_100%)] px-4 py-3 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.12)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Renewal Watch</p>
                  <p className="mt-1 text-[14px] font-semibold tracking-tight text-slate-900">Immediate review items</p>
                </div>
                <Link to="/it-assets/analytics" className="text-[11px] font-semibold text-[#4E5A7A]">
                  Open
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Expiring', value: summary.expiringSoon },
                  { label: 'Expired', value: summary.expired },
                  { label: 'Maintenance', value: maintenanceCount },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white px-3 py-3 text-center shadow-[0_10px_22px_-20px_rgba(15,23,42,0.16)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-[1.3rem] font-bold leading-none text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {workspaceLinks.map(({ title, body, to, icon: Icon }) => (
              <Link
                key={title}
                to={to}
                className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-0.5 hover:border-slate-300"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#4E5A7A]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{body}</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="glass-table">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="ui-section-title">Attention Queue</h2>
                <p className="ui-data-note mt-1">
                  {attentionAssets.length > 0 ? `${attentionAssets.length} assets need follow-up now.` : 'No assets need immediate follow-up.'}
                </p>
              </div>
              <Link to="/it-assets/analytics" className="btn-secondary gap-2 self-start px-3 py-2 text-[12px] md:self-auto">
                <CalendarClock className="h-4 w-4" />
                Open Renewals
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {attentionAssets.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400">No expiring or expired assets right now.</div>
            ) : (
              attentionAssets.map((asset) => {
                const expiry = getExpiryPresentation(asset.expiryDate)
                return (
                  <div key={asset.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="ui-list-id">{asset.id}</p>
                      <h3 className="ui-list-title mt-1">{asset.name}</h3>
                      <p className="ui-list-meta mt-1">
                        {asset.category} - {asset.vendor} - {asset.assignedTo || 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${expiry.badgeTone}`}>
                        {expiry.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {asset.expiryDate ? `Expires ${asset.expiryDate}` : 'Expiry not tracked'}
                      </span>
                      <Link to={`/it-assets/${asset.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                        Open Asset <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Register Mix</h2>
              <Boxes className="h-4.5 w-4.5 text-[#4E5A7A]" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
                {
                  label: 'Hardware',
                  value: summary.hardwareAssets,
                  helper: 'Physical devices',
                  icon: HardDrive,
                  tone: 'text-blue-700',
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Software',
                  value: summary.softwareAssets,
                  helper: 'Licenses and subs',
                  icon: Repeat2,
                  tone: 'text-violet-700',
                  bg: 'bg-violet-50',
                },
                {
                  label: 'Maintenance',
                  value: maintenanceCount,
                  helper: 'Service or retired',
                  icon: CalendarClock,
                  tone: 'text-amber-700',
                  bg: 'bg-amber-50',
                },
                {
                  label: 'Expired',
                  value: summary.expired,
                  helper: 'Past expiry date',
                  icon: ShieldAlert,
                  tone: 'text-red-700',
                  bg: 'bg-red-50',
                },
              ].map(({ label, value, helper, icon: Icon, tone, bg }) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${tone}`} />
                    </div>
                    <div>
                      <p className="ui-data-label">{label}</p>
                      <p className="mt-1 text-[12px] font-medium text-slate-500">{helper}</p>
                    </div>
                  </div>
                  <span className="text-[1.35rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
