import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import type { AssetRecord } from '../data/mockAssets'
import { assetStatusTone, formatAssetDate, getExpiryPresentation } from '../utils/assetUtils'

interface AssetTableProps {
  assets: AssetRecord[]
  deletingId?: string | null
  onDelete: (asset: AssetRecord) => void
}

export default function AssetTable({ assets, deletingId, onDelete }: AssetTableProps) {
  return (
    <div className="glass-table">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Asset ID</th>
              <th className="px-4 py-3 text-left">Asset Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th className="px-4 py-3 text-left">Assigned To</th>
              <th className="px-4 py-3 text-left">Purchase Date</th>
              <th className="px-4 py-3 text-left">Expiry Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  No assets found for the current filters.
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const expiry = getExpiryPresentation(asset.expiryDate)
                const transactionMode = asset.assignedTo.trim() ? 'transfer' : 'issue'
                const transactionLabel = asset.assignedTo.trim() ? 'Transfer' : 'Issue'
                return (
                  <tr key={asset.id} className={clsx('transition-colors', expiry.rowTone)}>
                    <td className="px-4 py-3.5">
                      <span className="ui-list-id">{asset.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="ui-data-value text-[14px]">{asset.name}</p>
                        <p className="ui-data-note mt-1">
                          {asset.brandModel}
                          {asset.serialNumber ? ` - S/N ${asset.serialNumber}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="ui-data-value font-medium text-slate-700">{asset.category}</p>
                        <p className="ui-data-note mt-1">{asset.subcategory}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{asset.vendor}</td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="ui-data-value font-medium text-slate-700">{asset.assignedTo || 'Unassigned'}</p>
                        <p className="ui-data-note mt-1">
                          {asset.department || 'No department'} - {asset.location || 'No location'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{formatAssetDate(asset.purchaseDate)}</td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="ui-data-value font-medium text-slate-700">{formatAssetDate(asset.expiryDate)}</p>
                        <span className={clsx('mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', expiry.badgeTone)}>
                          {expiry.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', assetStatusTone[asset.status])}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/it-assets/transactions?mode=${transactionMode}&asset=${asset.id}`}
                          className={clsx(
                            asset.assignedTo.trim() ? 'btn-secondary' : 'btn-primary',
                            'gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap'
                          )}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          {transactionLabel}
                        </Link>
                        {asset.assignedTo.trim() && (
                          <Link to={`/it-assets/${asset.id}/transactions?mode=return`} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap">
                            <RotateCcw className="h-3.5 w-3.5" />
                            Return
                          </Link>
                        )}
                        <Link to={`/it-assets/${asset.id}`} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                        <Link to={`/it-assets/${asset.id}/edit`} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn-secondary gap-1.5 px-2.5 py-1 text-xs whitespace-nowrap text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(asset)}
                          disabled={deletingId === asset.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === asset.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
