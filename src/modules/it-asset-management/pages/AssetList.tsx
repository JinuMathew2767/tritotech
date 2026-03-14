import { useEffect, useMemo, useState } from 'react'
import { Boxes, LayoutDashboard, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetTable from '../components/AssetTable'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord, AssetStatus } from '../data/mockAssets'
import assetService from '../services/assetService'
import { assetStatuses, getExpiryStatus } from '../utils/assetUtils'

export default function AssetList() {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [category, setCategory] = useState<'All' | string>('All')
  const [status, setStatus] = useState<'All' | AssetStatus>('All')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadAssets = async () => {
    setLoading(true)
    try {
      const [assetRows, meta] = await Promise.all([assetService.list(), assetService.getMeta()])
      setAssets(assetRows)
      setCategoryOptions(meta.categories)
    } catch {
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
  }, [])

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory = category === 'All' || asset.category === category
      const matchesStatus = status === 'All' || asset.status === status
      const haystack = `${asset.id} ${asset.name} ${asset.serialNumber} ${asset.imeiNumber} ${asset.vendor} ${asset.assignedTo} ${asset.department} ${asset.location}`.toLowerCase()
      const matchesSearch = haystack.includes(search.trim().toLowerCase())
      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [assets, category, search, status])

  const assignedCount = useMemo(() => assets.filter((asset) => !!asset.assignedTo.trim()).length, [assets])
  const availableCount = useMemo(() => assets.filter((asset) => !asset.assignedTo.trim() || asset.status === 'In Stock').length, [assets])
  const attentionCount = useMemo(
    () =>
      assets.filter((asset) => {
        const status = getExpiryStatus(asset.expiryDate)
        return status === 'Expired' || status === 'Expiring Soon'
      }).length,
    [assets]
  )

  const filtersApplied = search.trim() || category !== 'All' || status !== 'All'

  const handleDelete = async (asset: AssetRecord) => {
    if (!window.confirm(`Delete asset "${asset.name}" (${asset.id})?`)) return

    try {
      setDeletingId(asset.id)
      await assetService.remove(asset.id)
      setAssets((current) => current.filter((item) => item.id !== asset.id))
      toast.success('Asset removed')
    } catch {
      toast.error('Failed to remove asset')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={Boxes}
        badgeLabel="Asset Master"
        title="Asset Master"
        description="Use the master register to create records, search inventory, and jump straight into asset details or transaction workflows."
        actions={[
          { label: 'Dashboard', to: '/it-assets/dashboard', icon: LayoutDashboard, tone: 'secondary' },
          { label: 'Add Asset', to: '/it-assets/add', icon: Plus, tone: 'primary' },
        ]}
        stats={[
          { label: 'Total assets', value: String(assets.length) },
          { label: 'Assigned', value: String(assignedCount) },
          { label: 'Ready to issue', value: String(availableCount), tone: 'success' },
          { label: 'Need renewal review', value: String(attentionCount), tone: attentionCount > 0 ? 'warning' : 'success' },
        ]}
      />

      <div className="card p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search by asset ID, name, vendor, assignee, department, or location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select className="input" value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
            <option value="All">All categories</option>
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select className="input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="All">All statuses</option>
            {assetStatuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              Showing {filteredAssets.length} of {assets.length}
            </span>
            {filtersApplied && (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                onClick={() => {
                  setSearch('')
                  setCategory('All')
                  setStatus('All')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      <AssetTable assets={filteredAssets} deletingId={deletingId} onDelete={handleDelete} />
    </div>
  )
}
