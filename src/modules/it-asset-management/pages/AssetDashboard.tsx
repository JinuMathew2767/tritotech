import { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  CalendarClock,
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
import AssetCard from '../components/AssetCard'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
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

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={Boxes}
        badgeLabel="IT Asset Management"
        title="Asset Dashboard"
        description="Get a clear operational view of the asset register, jump into the right workspace quickly, and spot items that need renewal or ownership action."
        actions={[
          { label: 'Open Asset Master', to: '/it-assets/master', icon: FolderKanban, tone: 'secondary' },
          { label: 'Add Asset', to: '/it-assets/add', icon: Plus, tone: 'primary' },
        ]}
        stats={[
          { label: 'Tracked assets', value: String(summary.totalAssets) },
          { label: 'Need attention', value: String(attentionCount), tone: attentionCount > 0 ? 'warning' : 'success' },
          { label: 'Available stock', value: String(availableCount), tone: 'success' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AssetCard title="Total Assets" value={summary.totalAssets} helper="All tracked records across the module." icon={Package2} iconTone="text-slate-700" iconBg="bg-slate-100" />
        <AssetCard title="Hardware Assets" value={summary.hardwareAssets} helper="Physical devices and equipment." icon={HardDrive} iconTone="text-blue-700" iconBg="bg-blue-50" />
        <AssetCard title="Software Assets" value={summary.softwareAssets} helper="Licensing, subscriptions, and platforms." icon={Boxes} iconTone="text-violet-700" iconBg="bg-violet-50" />
        <AssetCard title="Expiring Soon" value={summary.expiringSoon} helper="Renewals due within the next 30 days." icon={CalendarClock} iconTone="text-amber-700" iconBg="bg-amber-50" />
        <AssetCard title="Expired Assets" value={summary.expired} helper="Assets already past their expiry date." icon={ShieldAlert} iconTone="text-red-700" iconBg="bg-red-50" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="glass-table">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="ui-section-title">Priority Queue</h2>
            <p className="ui-page-intro mt-2">Assets that need renewal planning or immediate follow-up from the team.</p>
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
                        View Details
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
            <h2 className="ui-section-title">Quick Start</h2>
            <p className="ui-page-intro mt-2">Pick the workspace that matches what you need to do next.</p>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: 'Open Asset Master',
                  body: 'Search, review, edit, or create asset records.',
                  to: '/it-assets/master',
                  icon: FolderKanban,
                },
                {
                  title: 'Record Transactions',
                  body: 'Issue, return, or transfer assets from one hub.',
                  to: '/it-assets/transactions',
                  icon: Repeat2,
                },
                {
                  title: 'Review Renewals',
                  body: 'Check what is expiring soon and what is already overdue.',
                  to: '/it-assets/analytics',
                  icon: CalendarClock,
                },
              ].map(({ title, body, to, icon: Icon }) => (
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
            <h2 className="ui-section-title">Operational Snapshot</h2>
            <p className="ui-page-intro mt-2">A quick read on ownership and asset availability.</p>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Currently assigned', value: assignedCount },
                { label: 'Ready to issue', value: availableCount },
                { label: 'Maintenance or retired', value: maintenanceCount },
                { label: 'Renewal attention', value: attentionCount },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="ui-data-note text-[12px]">{item.label}</span>
                  <span className="ui-data-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
