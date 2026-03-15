import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  ClipboardCheck,
  Pencil,
  Repeat2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssignmentHistory from '../components/AssignmentHistory'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord } from '../data/mockAssets'
import assetService from '../services/assetService'
import {
  assetStatusTone,
  formatAssetCurrency,
  formatAssetDate,
  getDaysUntilExpiry,
  getExpiryPresentation,
} from '../utils/assetUtils'

const detailRows = (asset: AssetRecord) => [
  { label: 'Asset ID', value: asset.id },
  { label: 'Category', value: `${asset.category} - ${asset.subcategory}` },
  { label: 'Serial Number', value: asset.serialNumber || 'Not recorded' },
  { label: 'IMEI Number', value: asset.imeiNumber || 'Not recorded' },
  { label: 'Brand / Model', value: asset.brandModel },
  { label: 'Vendor', value: asset.vendor },
  { label: 'Purchase Date', value: formatAssetDate(asset.purchaseDate) },
  { label: 'Purchase Cost', value: formatAssetCurrency(asset.purchaseCost) },
]

export default function AssetDetails() {
  const { id } = useParams<{ id: string }>()
  const [asset, setAsset] = useState<AssetRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    assetService
      .getById(id)
      .then(setAsset)
      .catch(() => toast.error('Failed to load asset details'))
      .finally(() => setLoading(false))
  }, [id])

  const expiry = useMemo(() => (asset ? getExpiryPresentation(asset.expiryDate) : null), [asset])
  const warranty = useMemo(() => (asset ? getExpiryPresentation(asset.warrantyExpiry) : null), [asset])

  if (loading) return <PageLoader />
  if (!asset || !expiry || !warranty) {
    return (
      <div className="page-shell">
        <div className="card p-8 text-center text-slate-400">Asset not found.</div>
      </div>
    )
  }

  const expiryDelta = getDaysUntilExpiry(asset.expiryDate)
  const warrantyDelta = getDaysUntilExpiry(asset.warrantyExpiry)
  const isAssigned = !!asset.assignedTo.trim()

  const recommendedAction =
    expiry.status === 'Expired'
      ? 'Review renewal immediately'
      : expiry.status === 'Expiring Soon'
        ? 'Plan renewal'
        : expiry.status === 'Not Tracked'
          ? 'Keep identity and assignment updated'
        : isAssigned
          ? 'Keep assignment updated'
          : 'Issue from stock when ready'

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={ClipboardCheck}
        badgeLabel="Asset Details"
        title={asset.name}
        description={`${asset.category} - ${asset.subcategory} - ${asset.vendor}`}
        actions={[
          { label: 'Back to Asset Master', to: '/it-assets/master', icon: ArrowLeft, tone: 'secondary' },
          ...(isAssigned
            ? [
                { label: 'Transfer Asset', to: `/it-assets/transactions?mode=transfer&asset=${asset.id}`, icon: Repeat2, tone: 'primary' as const },
                { label: 'Return Asset', to: `/it-assets/${asset.id}/transactions?mode=return`, icon: RotateCcw, tone: 'secondary' as const },
              ]
            : [{ label: 'Issue Asset', to: `/it-assets/transactions?mode=issue&asset=${asset.id}`, icon: ArrowRightLeft, tone: 'primary' as const }]),
          { label: 'Edit Asset', to: `/it-assets/${asset.id}/edit`, icon: Pencil, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Asset ID', value: asset.id },
          { label: 'Current owner', value: asset.assignedTo || 'Unassigned', tone: isAssigned ? 'default' : 'success' },
          {
            label: 'Next focus',
            value: recommendedAction,
            tone: expiry.status === 'Expired' || expiry.status === 'Expiring Soon' ? 'warning' : 'success',
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="ui-data-label">Owner</p>
          <p className="mt-2 text-[1.2rem] font-bold leading-[1.05] tracking-[-0.03em] text-slate-900">{asset.assignedTo || 'Unassigned'}</p>
          <p className="ui-data-note mt-2">{asset.department || 'No department'}</p>
        </div>
        <div className="card p-4">
          <p className="ui-data-label">Location</p>
          <p className="mt-2 text-[1.2rem] font-bold leading-[1.05] tracking-[-0.03em] text-slate-900">{asset.location || 'Not set'}</p>
          <p className="ui-data-note mt-2">{asset.status}</p>
        </div>
        <div className="card p-4">
          <p className="ui-data-label">Expiry Window</p>
          <p className="mt-2 text-[1.2rem] font-bold leading-[1.05] tracking-[-0.03em] text-slate-900">{formatAssetDate(asset.expiryDate)}</p>
          <p className="ui-data-note mt-2">
            {expiry.status === 'Expired'
              ? `${Math.abs(expiryDelta)} days overdue`
              : expiry.status === 'Expiring Soon'
                ? `${expiryDelta} days remaining`
                : expiry.status === 'Not Tracked'
                  ? 'Expiry not tracked'
                  : 'Coverage active'}
          </p>
        </div>
        <div className="card p-4">
          <p className="ui-data-label">Warranty</p>
          <p className="mt-2 text-[1.2rem] font-bold leading-[1.05] tracking-[-0.03em] text-slate-900">{formatAssetDate(asset.warrantyExpiry)}</p>
          <p className="ui-data-note mt-2">
            {warranty.status === 'Expired'
              ? `${Math.abs(warrantyDelta)} days overdue`
              : warranty.status === 'Expiring Soon'
                ? `${warrantyDelta} days remaining`
                : 'Warranty active'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="ui-section-title">Asset Profile</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {detailRows(asset).map((row) => (
                <div key={row.label} className="rounded-2xl bg-slate-50 p-3">
                  <p className="ui-data-label">{row.label}</p>
                  <p className="ui-data-value mt-1">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="ui-section-title">Placement And Ownership</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="ui-data-label">Assigned To</p>
                <p className="ui-data-value mt-1">{asset.assignedTo || 'Unassigned'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="ui-data-label">Department</p>
                <p className="ui-data-value mt-1">{asset.department || 'Not set'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="ui-data-label">Location</p>
                <p className="ui-data-value mt-1">{asset.location || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="ui-section-title">Notes</h2>
            <p className="ui-page-intro mt-3">{asset.notes || 'No additional asset notes recorded yet.'}</p>
          </div>

          <AssignmentHistory history={asset.assignmentHistory} />
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="ui-section-title">Coverage Status</h2>
                <p className="text-xs text-slate-500">Operational and renewal health for this record.</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-data-label">Asset Expiry</p>
                    <p className="ui-data-value mt-1">{formatAssetDate(asset.expiryDate)}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${expiry.badgeTone}`}>{expiry.status}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-data-label">Warranty Expiry</p>
                    <p className="ui-data-value mt-1">{formatAssetDate(asset.warrantyExpiry)}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${warranty.badgeTone}`}>{warranty.status}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="ui-data-label">Current Record Status</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${assetStatusTone[asset.status]}`}>
                  {asset.status}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <CalendarDays className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="ui-section-title">Recommended Actions</h2>
                <p className="text-xs text-slate-500">The clearest next steps based on this asset's current state.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {[
                ...(isAssigned
                  ? [
                      { label: 'Transfer this asset', to: `/it-assets/transactions?mode=transfer&asset=${asset.id}` },
                      { label: 'Return this asset', to: `/it-assets/${asset.id}/transactions?mode=return` },
                    ]
                  : [{ label: 'Issue this asset from stock', to: `/it-assets/transactions?mode=issue&asset=${asset.id}` }]),
                { label: 'Edit record details', to: `/it-assets/${asset.id}/edit` },
                ...(expiry.status === 'Expired' || expiry.status === 'Expiring Soon' || warranty.status !== 'Active'
                  ? [{ label: 'Review expiry and warranty analytics', to: '/it-assets/analytics' }]
                  : []),
              ].map((item) => (
                <Link key={item.label} to={item.to} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-600 transition-colors hover:bg-slate-100">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4E5A7A]" />
                  <span className="ui-tile-body text-[13px]">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
