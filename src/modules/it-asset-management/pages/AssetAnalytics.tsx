import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssetCard from '../components/AssetCard'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord } from '../data/mockAssets'
import assetService from '../services/assetService'
import { formatAssetDate, getDaysUntilExpiry, getExpiryPresentation, getExpiryStatus } from '../utils/assetUtils'

const sortByDate = (assets: AssetRecord[], key: 'expiryDate' | 'warrantyExpiry') =>
  [...assets].sort((left, right) => left[key].localeCompare(right[key]))

export default function AssetAnalytics() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    assetService
      .list()
      .then(setAssets)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  const expirySoon = useMemo(() => assets.filter((asset) => getExpiryStatus(asset.expiryDate) === 'Expiring Soon'), [assets])
  const expiryExpired = useMemo(() => assets.filter((asset) => getExpiryStatus(asset.expiryDate) === 'Expired'), [assets])
  const warrantySoon = useMemo(() => assets.filter((asset) => getExpiryStatus(asset.warrantyExpiry) === 'Expiring Soon'), [assets])
  const warrantyExpired = useMemo(() => assets.filter((asset) => getExpiryStatus(asset.warrantyExpiry) === 'Expired'), [assets])
  const healthyCoverage = useMemo(
    () =>
      assets.filter(
        (asset) => getExpiryStatus(asset.expiryDate) === 'Active' && getExpiryStatus(asset.warrantyExpiry) === 'Active'
      ).length,
    [assets]
  )

  const priorityQueue = useMemo(() => {
    return assets
      .map((asset) => {
        const expiryStatus = getExpiryStatus(asset.expiryDate)
        const warrantyStatus = getExpiryStatus(asset.warrantyExpiry)
        const reasons: string[] = []

        if (expiryStatus === 'Expired') reasons.push('Asset expiry overdue')
        if (expiryStatus === 'Expiring Soon') reasons.push('Asset expiry due soon')
        if (warrantyStatus === 'Expired') reasons.push('Warranty expired')
        if (warrantyStatus === 'Expiring Soon') reasons.push('Warranty due soon')

        const urgencyScore = Math.min(getDaysUntilExpiry(asset.expiryDate), getDaysUntilExpiry(asset.warrantyExpiry))
        return { asset, reasons, urgencyScore }
      })
      .filter((item) => item.reasons.length > 0)
      .sort((left, right) => left.urgencyScore - right.urgencyScore)
      .slice(0, 6)
  }, [assets])

  const nextSevenDaysCount = useMemo(
    () =>
      assets.filter((asset) => {
        const expiryDays = getDaysUntilExpiry(asset.expiryDate)
        const warrantyDays = getDaysUntilExpiry(asset.warrantyExpiry)
        return (expiryDays >= 0 && expiryDays <= 7) || (warrantyDays >= 0 && warrantyDays <= 7)
      }).length,
    [assets]
  )

  const totalAttention = priorityQueue.length

  if (loading) return <PageLoader />

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={CalendarClock}
        badgeLabel="Expiry And Warranty Analytics"
        title="Renewal Watch"
        description="Use this workspace to review expiry risk, warranty coverage, and the exact assets that need renewal planning or follow-up next."
        actions={[
          { label: 'Open Asset Master', to: '/it-assets/master', icon: FolderKanban, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Attention queue', value: String(totalAttention), tone: totalAttention > 0 ? 'warning' : 'success' },
          { label: 'Due in 7 days', value: String(nextSevenDaysCount), tone: nextSevenDaysCount > 0 ? 'danger' : 'success' },
          { label: 'Healthy coverage', value: String(healthyCoverage), tone: 'success' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AssetCard title="Expiry Soon" value={expirySoon.length} helper="Assets expiring within 30 days." icon={AlertTriangle} iconTone="text-amber-700" iconBg="bg-amber-50" />
        <AssetCard title="Expired Assets" value={expiryExpired.length} helper="Assets already past their asset expiry." icon={ShieldAlert} iconTone="text-red-700" iconBg="bg-red-50" />
        <AssetCard title="Warranty Soon" value={warrantySoon.length} helper="Warranty coverage ending within 30 days." icon={CalendarClock} iconTone="text-blue-700" iconBg="bg-blue-50" />
        <AssetCard title="Warranty Expired" value={warrantyExpired.length} helper="Assets with lapsed warranty coverage." icon={ShieldCheck} iconTone="text-violet-700" iconBg="bg-violet-50" />
        <AssetCard title="Healthy Coverage" value={healthyCoverage} helper="Assets active on both expiry and warranty." icon={CheckCircle2} iconTone="text-emerald-700" iconBg="bg-emerald-50" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-4">
          <div className="glass-table">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="ui-section-title">Expiry Watchlist</h2>
              <p className="ui-page-intro mt-2">Assets that need renewal planning based on the primary expiry date.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {sortByDate([...expiryExpired, ...expirySoon], 'expiryDate').length === 0 ? (
                <div className="px-5 py-10 text-center text-slate-400">No expiry risks detected right now.</div>
              ) : (
                sortByDate([...expiryExpired, ...expirySoon], 'expiryDate').map((asset) => {
                  const presentation = getExpiryPresentation(asset.expiryDate)
                  const days = getDaysUntilExpiry(asset.expiryDate)
                  return (
                    <div key={`expiry-${asset.id}`} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="ui-list-id">{asset.id}</p>
                        <h3 className="ui-list-title mt-1">{asset.name}</h3>
                        <p className="ui-list-meta mt-1">{asset.vendor} - {asset.category}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.badgeTone}`}>
                          {presentation.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {presentation.status === 'Expired' ? `${Math.abs(days)} days overdue` : `${Math.max(days, 0)} days left`}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {formatAssetDate(asset.expiryDate)}
                        </span>
                        <Link to={`/it-assets/${asset.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                          View Asset
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="glass-table">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="ui-section-title">Warranty Watchlist</h2>
              <p className="ui-page-intro mt-2">Coverage status derived from warranty expiry dates.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {sortByDate([...warrantyExpired, ...warrantySoon], 'warrantyExpiry').length === 0 ? (
                <div className="px-5 py-10 text-center text-slate-400">No warranty attention items right now.</div>
              ) : (
                sortByDate([...warrantyExpired, ...warrantySoon], 'warrantyExpiry').map((asset) => {
                  const presentation = getExpiryPresentation(asset.warrantyExpiry)
                  const days = getDaysUntilExpiry(asset.warrantyExpiry)
                  return (
                    <div key={`warranty-${asset.id}`} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="ui-list-id">{asset.id}</p>
                        <h3 className="ui-list-title mt-1">{asset.name}</h3>
                        <p className="ui-list-meta mt-1">{asset.brandModel}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${presentation.badgeTone}`}>
                          {presentation.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {presentation.status === 'Expired' ? `${Math.abs(days)} days overdue` : `${Math.max(days, 0)} days left`}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {formatAssetDate(asset.warrantyExpiry)}
                        </span>
                        <Link to={`/it-assets/${asset.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                          View Asset
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="ui-section-title">Priority Actions</h2>
            <p className="ui-page-intro mt-2">The assets that should be reviewed first based on the nearest risk window.</p>
            <div className="mt-4 space-y-3">
              {priorityQueue.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">No priority assets need follow-up right now.</div>
              ) : (
                priorityQueue.map(({ asset, reasons }) => (
                  <Link key={asset.id} to={`/it-assets/${asset.id}`} className="block rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-slate-100">
                    <p className="ui-list-id">{asset.id}</p>
                    <p className="ui-list-title mt-1">{asset.name}</p>
                    <p className="ui-tile-body mt-2">{reasons.join(' | ')}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="ui-section-title">Coverage Health</h2>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Assets requiring attention', value: totalAttention },
                { label: 'Expiry risk items', value: expirySoon.length + expiryExpired.length },
                { label: 'Warranty risk items', value: warrantySoon.length + warrantyExpired.length },
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
