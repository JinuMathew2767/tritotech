import { ClipboardList } from 'lucide-react'
import type { AssetAssignmentEvent } from '../data/mockAssets'
import { formatAssetDate } from '../utils/assetUtils'

interface AssignmentHistoryProps {
  history: AssetAssignmentEvent[]
}

const typeTone: Record<AssetAssignmentEvent['type'], string> = {
  Issue: 'bg-blue-50 text-blue-700',
  Return: 'bg-amber-50 text-amber-700',
  Transfer: 'bg-violet-50 text-violet-700',
  Update: 'bg-slate-100 text-slate-700',
}

export default function AssignmentHistory({ history }: AssignmentHistoryProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <ClipboardList className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="ui-section-title">Assignment History</h2>
          <p className="ui-data-note">Track ownership changes and handovers over the asset lifecycle.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-400">
            No assignment changes recorded yet.
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="ui-data-value text-[14px]">{entry.assignedTo}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeTone[entry.type]}`}>
                      {entry.type}
                    </span>
                  </div>
                  <p className="ui-data-note mt-1">
                    {entry.department} - {entry.location}
                  </p>
                  {entry.fromAssignedTo && (
                    <p className="mt-1 text-[11px] font-medium text-slate-400">
                      From {entry.fromAssignedTo} - {entry.fromDepartment || 'No department'} - {entry.fromLocation || 'No location'}
                    </p>
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-400 sm:text-right">
                  <p>Assigned {formatAssetDate(entry.assignedAt)}</p>
                  {entry.returnedAt && <p className="mt-1">Returned {formatAssetDate(entry.returnedAt)}</p>}
                </div>
              </div>
              <p className="ui-page-intro mt-3 text-[13px]">{entry.note}</p>
              <p className="ui-data-label mt-2">
                Recorded by {entry.assignedBy}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
