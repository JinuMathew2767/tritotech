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
import PageHeader from '@/components/ui/PageHeader'
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
  const availableCount = useMemo(
    () => assets.filter((asset) => !asset.assignedTo.trim() || asset.status === 'In Stock').length,
    [assets]
  )
  const maintenanceCount = useMemo(
    () => assets.filter((asset) => asset.status === 'Maintenance' || asset.status === 'Retired').length,
    [assets]
  )
  const attentionAssets = useMemo(
    () =>
      assets
        .filter((asset) => {
          const status = getExpiryPresentation(asset.expiryDate).status
          return status === 'Expired' || status === 'Expiring Soon'
        })
        .slice(0, 5),
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
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'Available',
      value: availableCount,
      helper: 'Ready to issue',
      icon: ClipboardList,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Needs Attention',
      value: attentionCount,
      helper: attentionCount > 0 ? 'Renewals to review' : 'No active renewal risk',
      icon: ShieldAlert,
      tone: attentionCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Assigned',
      value: assignedCount,
      helper: 'Placed with teams',
      icon: FolderKanban,
      tone: 'bg-sky-50 text-sky-700',
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
    <div className="page-shell">
      <AssetModuleTabs />

      <PageHeader
        eyebrow={
          <>
            <Boxes className="h-3.5 w-3.5" />
            Asset Workspace
          </>
        }
        title="Asset Dashboard"
        description="A cleaner operational view of stock, assignments, renewals, and the next actions the asset team should take."
        actions={
          <>
            <Link to="/it-assets/master" className="btn-secondary">
              <FolderKanban className="h-4 w-4" />
              Open Master
            </Link>
            <Link to="/it-assets/add" className="btn-primary">
              <Plus className="h-4 w-4" />
              Add Asset
            </Link>
          </>
        }
        meta={
          <>
            <span className="page-meta-chip">Tracked: {summary.totalAssets}</span>
            <span className="page-meta-chip">Available: {availableCount}</span>
            <span className="page-meta-chip">Attention: {attentionCount}</span>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map(({ label, value, helper, icon: Icon, tone }) => (
          <div key={label} className="metric-tile">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-metric-label">{label}</p>
                <p className="mt-2 text-[1.75rem] font-bold tracking-[-0.04em] text-slate-950">{value}</p>
                <p className="mt-2 text-[12px] text-slate-500">{helper}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {workspaceLinks.map(({ title, body, to, icon: Icon }) => (
          <Link
            key={title}
            to={to}
            className="card flex items-center gap-3 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-slate-300"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f7cb8]/8 text-[#163b63]">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-[12px] text-slate-500">{body}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <section className="glass-table">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="ui-kicker">Attention Queue</p>
                <h2 className="ui-section-title mt-1">Assets needing follow-up</h2>
              </div>
              <Link to="/it-assets/analytics" className="btn-secondary gap-2 self-start px-3 py-2 text-[12px] md:self-auto">
                <CalendarClock className="h-4 w-4" />
                Open Renewals
              </Link>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {attentionAssets.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-500">No expiring or expired assets right now.</div>
            ) : (
              attentionAssets.map((asset) => {
                const expiry = getExpiryPresentation(asset.expiryDate)
                return (
                  <div key={asset.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="ui-list-id">{asset.id}</p>
                      <h3 className="ui-list-title mt-1">{asset.name}</h3>
                      <p className="ui-list-meta mt-1">
                        {asset.category} • {asset.vendor} • {asset.assignedTo || 'Unassigned'}
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
        </section>

        <section className="glass-table">
          <div className="border-b border-slate-200 px-4 py-4">
            <p className="ui-kicker">Register Mix</p>
            <h2 className="ui-section-title mt-1">Asset categories at a glance</h2>
          </div>

          <div className="space-y-3 p-4">
            {[
              {
                label: 'Hardware',
                value: summary.hardwareAssets,
                helper: 'Physical devices',
                icon: HardDrive,
                tone: 'text-sky-700 bg-sky-50',
              },
              {
                label: 'Software',
                value: summary.softwareAssets,
                helper: 'Licenses and subscriptions',
                icon: Repeat2,
                tone: 'text-violet-700 bg-violet-50',
              },
              {
                label: 'Maintenance',
                value: maintenanceCount,
                helper: 'Service or retired',
                icon: CalendarClock,
                tone: 'text-amber-700 bg-amber-50',
              },
              {
                label: 'Expired',
                value: summary.expired,
                helper: 'Past expiry date',
                icon: ShieldAlert,
                tone: 'text-red-700 bg-red-50',
              },
            ].map(({ label, value, helper, icon: Icon, tone }) => (
              <div key={label} className="surface-muted flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="ui-data-label">{label}</p>
                    <p className="mt-1 text-[12px] text-slate-500">{helper}</p>
                  </div>
                </div>
                <span className="text-[1.3rem] font-bold tracking-[-0.04em] text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
