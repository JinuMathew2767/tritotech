import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRightLeft, FolderKanban } from 'lucide-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import AssignmentHistory from '../components/AssignmentHistory'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetTransactionForm from '../components/AssetTransactionForm'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord } from '../data/mockAssets'
import assetService, { type AssetTransactionMode, type AssetTransactionValues } from '../services/assetService'
import { assetStatusTone, formatAssetDate, getExpiryPresentation } from '../utils/assetUtils'

const actorNameFromUser = (firstName?: string, lastName?: string) => {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim()
  return name || 'System'
}

const isValidMode = (value: string | null): value is AssetTransactionMode =>
  value === 'issue' || value === 'return' || value === 'transfer'

export default function AssetTransactions() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [asset, setAsset] = useState<AssetRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return

    assetService
      .getById(id)
      .then(setAsset)
      .catch(() => toast.error('Failed to load asset transactions'))
      .finally(() => setLoading(false))
  }, [id])

  const modeParam = searchParams.get('mode')
  const initialMode = isValidMode(modeParam) ? modeParam : undefined
  const expiry = useMemo(() => (asset ? getExpiryPresentation(asset.expiryDate) : null), [asset])

  if (id && (initialMode === 'issue' || initialMode === 'transfer')) {
    return <Navigate to={`/it-assets/transactions?mode=${initialMode}&asset=${id}`} replace />
  }

  const handleSubmit = async (values: AssetTransactionValues) => {
    if (!id) return

    try {
      setSaving(true)
      await assetService.transact(id, values)
      toast.success('Asset transaction recorded')
      navigate(`/it-assets/${id}`)
    } catch {
      toast.error('Failed to save asset transaction')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!asset || !expiry) {
    return (
      <div className="page-shell">
        <div className="card p-8 text-center text-slate-400">Asset not found.</div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={ArrowRightLeft}
        badgeLabel="Asset Transactions"
        title={`Transact ${asset.name}`}
        description="Complete issue, return, or transfer actions from one screen, with a clear before-and-after view before you save."
        actions={[
          { label: 'Back to Details', to: `/it-assets/${asset.id}`, icon: ArrowLeft, tone: 'secondary' },
          { label: 'Transaction Center', to: '/it-assets/transactions', icon: FolderKanban, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Asset ID', value: asset.id },
          { label: 'Current owner', value: asset.assignedTo || 'Unassigned', tone: asset.assignedTo ? 'default' : 'success' },
          {
            label: 'Coverage state',
            value: expiry.status,
            tone: expiry.status === 'Expired' || expiry.status === 'Expiring Soon' ? 'warning' : 'success',
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_380px]">
        <div className="card p-5">
          <AssetTransactionForm
            asset={asset}
            processedBy={actorNameFromUser(user?.first_name, user?.last_name)}
            initialMode={initialMode}
            saving={saving}
            onSubmit={handleSubmit}
          />
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="ui-section-title">Current Snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Assigned To</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.assignedTo || 'Unassigned'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Department</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.department || 'Not set'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Location</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.location || 'Not set'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">Status</p>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${assetStatusTone[asset.status]}`}>
                  {asset.status}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="ui-section-title">Helpful Rules</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="rounded-2xl bg-slate-50 px-4 py-3">Issue is best for stock or unassigned items that are being allocated now.</p>
              <p className="rounded-2xl bg-slate-50 px-4 py-3">Return is best when an asset is coming back into storage, maintenance, or retirement.</p>
              <p className="rounded-2xl bg-slate-50 px-4 py-3">Transfer is best when ownership changes directly between users, teams, or locations.</p>
              <p className="rounded-2xl bg-slate-50 px-4 py-3">After saving, the assignment history below will update automatically with the movement you recorded.</p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="ui-section-title">Coverage Reminder</h2>
            <p className="mt-2 text-sm text-slate-600">
              Asset expiry:
              <span className="ml-1 font-semibold text-slate-900">{formatAssetDate(asset.expiryDate)}</span>
            </p>
          </div>
        </div>
      </div>

      <AssignmentHistory history={asset.assignmentHistory} />
    </div>
  )
}
