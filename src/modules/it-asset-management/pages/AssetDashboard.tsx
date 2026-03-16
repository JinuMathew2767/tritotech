import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  HardDrive,
  Package2,
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

  const summaryStrip = [
    { label: 'Tracked', value: summary.totalAssets, tone: 'default' },
    { label: 'Available', value: availableCount, tone: 'success' },
    { label: 'Attention', value: attentionCount, tone: attentionCount > 0 ? 'warning' : 'success' },
    { label: 'Assigned', value: assignedCount, tone: 'default' },
    { label: 'Hardware', value: summary.hardwareAssets, tone: 'default' },
    { label: 'Software', value: summary.softwareAssets, tone: 'default' },
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
    <div className="page-shell">
      <AssetModuleTabs />

      <section className="card p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4E5A7A]/10 bg-[#4E5A7A]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4E5A7A]">
              <Boxes className="h-3 w-3" />
              Asset Hub
            </div>
            <h1 className="mt-3 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-900">
              Asset Overview
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Link to="/it-assets/master" className="btn-secondary gap-2 px-3 py-2 text-[12px]">
              <FolderKanban className="h-4 w-4" />
              Open Asset Master
            </Link>
            <Link to="/it-assets/add" className="btn-primary gap-2 px-3 py-2 text-[12px]">
              <Plus className="h-4 w-4" />
              Add Asset
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {summaryStrip.map(({ label, value, tone }) => (
            <div
              key={label}
              className={[
                'rounded-2xl border px-3 py-2.5 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)]',
                tone === 'success'
                  ? 'border-emerald-100 bg-emerald-50/90'
                  : tone === 'warning'
                    ? 'border-amber-100 bg-amber-50/90'
                    : 'border-slate-200 bg-white/90',
              ].join(' ')}
            >
              <p className="ui-data-label">{label}</p>
              <p className="mt-1 text-[1.45rem] font-extrabold leading-none tracking-[-0.05em] text-slate-900">{value}</p>
            </div>
          ))}
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
              <h2 className="ui-section-title">Workspaces</h2>
              <span className="ui-data-note text-[12px]">Choose where to go</span>
            </div>
            <div className="mt-4 space-y-3">
              {workspaceLinks.map(({ title, body, to, icon: Icon }) => (
                <Link
                  key={title}
                  to={to}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-3 transition-all hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-[#4E5A7A] shadow-sm">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="ui-tile-title">{title}</p>
                    <p className="ui-tile-body mt-1">{body}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="ui-section-title">Snapshot</h2>
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {[
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
                  icon: Package2,
                  tone: 'text-violet-700',
                  bg: 'bg-violet-50',
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
