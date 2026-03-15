import { useEffect, useState } from 'react'
import { ArrowLeft, FileText, FolderKanban } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord } from '../data/mockAssets'
import assetService from '../services/assetService'
import { formatAssetDate } from '../utils/assetUtils'
import { findHistoryTransactionDocument, type HistoryTransactionDocument } from '../utils/transactionDocuments'

export default function AssetTransactionDocument() {
  const { transactionNumber } = useParams<{ transactionNumber: string }>()
  const [document, setDocument] = useState<HistoryTransactionDocument | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!transactionNumber) return

    assetService
      .list()
      .then((assets: AssetRecord[]) => setDocument(findHistoryTransactionDocument(assets, transactionNumber)))
      .catch(() => toast.error('Failed to load transaction document'))
      .finally(() => setLoading(false))
  }, [transactionNumber])

  if (loading) return <PageLoader />

  if (!document) {
    return (
      <div className="page-shell">
        <div className="card p-8 text-center text-slate-400">Transaction document not found.</div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <AssetModuleTabs />

      <AssetWorkspaceHeader
        badgeIcon={FileText}
        badgeLabel="Transaction Document"
        title={document.transactionNumber}
        description="Review the recorded transaction header and the full asset line details for this document."
        actions={[
          { label: 'Back to Transactions', to: '/it-assets/transactions', icon: ArrowLeft, tone: 'secondary' },
          { label: 'Open Asset Master', to: '/it-assets/master', icon: FolderKanban, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Transaction date', value: formatAssetDate(document.transactionDate) },
          { label: 'Asset count', value: String(document.assetCount) },
          { label: 'Issued to', value: document.issuedTo },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="card p-5">
          <h2 className="ui-section-title">Document Header</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="ui-data-label">Transaction Type</p>
              <p className="ui-data-value mt-1 capitalize">{document.transactionType}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="ui-data-label">Department</p>
              <p className="ui-data-value mt-1">{document.department}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="ui-data-label">Location</p>
              <p className="ui-data-value mt-1">{document.location}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="ui-data-label">Issued To</p>
              <p className="ui-data-value mt-1">{document.issuedTo}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="ui-data-label">Recorded By</p>
              <p className="ui-data-value mt-1">{document.createdBy}</p>
            </div>
            {document.note ? (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="ui-data-label">Note</p>
                <p className="ui-page-intro mt-1 text-slate-700">{document.note}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card p-5">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="ui-section-title">Transaction Items</h2>
            <p className="ui-page-intro mt-2">Each asset that was included in this document is listed below.</p>
          </div>

          <div className="mt-4 space-y-3">
            {document.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="ui-list-id">{item.assetId}</p>
                      <Link to={`/it-assets/${item.assetId}`} className="ui-data-note text-[#4E5A7A] underline-offset-2 hover:underline">
                        Open asset
                      </Link>
                    </div>
                    <p className="ui-data-value mt-1 text-[14px]">{item.assetName}</p>
                    <p className="ui-data-note mt-1">
                      To {item.assignedTo} - {item.department} - {item.location}
                    </p>
                    {(item.fromAssignedTo || item.fromDepartment || item.fromLocation) && (
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        From {item.fromAssignedTo || 'Unassigned'} - {item.fromDepartment || 'No department'} - {item.fromLocation || 'No location'}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px] font-medium text-slate-400">
                    <p>{formatAssetDate(item.assignedAt)}</p>
                    <p className="mt-1">By {item.assignedBy}</p>
                  </div>
                </div>
                {item.note ? <p className="ui-page-intro mt-3 text-[13px] text-slate-600">{item.note}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
