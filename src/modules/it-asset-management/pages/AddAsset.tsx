import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetForm from '../components/AssetForm'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import assetService from '../services/assetService'
import type { AssetFormValues } from '../utils/assetUtils'

export default function AddAsset() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (values: AssetFormValues) => {
    try {
      setSaving(true)
      const created = await assetService.create(values)
      toast.success('Asset created successfully')
      navigate(`/it-assets/${created.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={Plus}
        badgeLabel="Add Asset"
        title="Create Asset Record"
        description="Add a new inventory item, software renewal, or contract record, then manage its issue, return, and transfer lifecycle from the shared workspace."
        actions={[
          { label: 'Back to Asset Master', to: '/it-assets/master', icon: ArrowLeft, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Suggested status', value: 'In Stock' },
          { label: 'Next step', value: 'Save, then open details' },
        ]}
      />

      <div className="card p-5">
        <AssetForm submitLabel="Create Asset" saving={saving} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
