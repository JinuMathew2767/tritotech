import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetForm from '../components/AssetForm'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord } from '../data/mockAssets'
import assetService from '../services/assetService'
import { toAssetFormValues, type AssetFormValues } from '../utils/assetUtils'

export default function EditAsset() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [asset, setAsset] = useState<AssetRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const formValues = useMemo(() => (asset ? toAssetFormValues(asset) : undefined), [asset])

  useEffect(() => {
    if (!id) return

    assetService
      .getById(id)
      .then(setAsset)
      .catch(() => toast.error('Failed to load asset for editing'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmit = async (values: AssetFormValues) => {
    if (!id) return

    try {
      setSaving(true)
      await assetService.update(id, values)
      toast.success('Asset updated successfully')
      navigate(`/it-assets/${id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update asset')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />
  if (!asset) {
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
        badgeIcon={Pencil}
        badgeLabel="Edit Asset"
        title={`Update ${asset.name}`}
        description="Maintain lifecycle information, placement, and renewal dates so the asset record remains accurate across the module."
        actions={[
          { label: 'Back to Details', to: `/it-assets/${asset.id}`, icon: ArrowLeft, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Asset ID', value: asset.id },
          { label: 'Current status', value: asset.status },
          { label: 'Assigned to', value: asset.assignedTo || 'Unassigned' },
        ]}
      />

      <div className="card p-5">
        <AssetForm initialValues={formValues} submitLabel="Save Changes" saving={saving} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
