import { useEffect, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import type { AssetRecord, AssetStatus } from '../data/mockAssets'
import type { AssetTransactionMode, AssetTransactionValues } from '../services/assetService'

interface AssetTransactionFormProps {
  asset: AssetRecord
  processedBy: string
  initialMode?: AssetTransactionMode
  saving?: boolean
  onSubmit: (values: AssetTransactionValues) => Promise<void> | void
}

interface TransactionFormState {
  type: AssetTransactionMode
  assignedTo: string
  department: string
  location: string
  status: AssetStatus
  note: string
}

type TransactionFormErrors = Partial<Record<keyof TransactionFormState, string>>

const transactionOptions: Array<{ id: AssetTransactionMode; label: string; helper: string; context: string }> = [
  {
    id: 'issue',
    label: 'Issue',
    helper: 'Allocate the asset to a person, team, or shared pool.',
    context: 'Best for assets currently in stock or unassigned.',
  },
  {
    id: 'return',
    label: 'Return',
    helper: 'Bring the asset back into stock, maintenance, or retirement.',
    context: 'Best for assets coming back to IT or storage.',
  },
  {
    id: 'transfer',
    label: 'Transfer',
    helper: 'Move ownership directly from one holder to another.',
    context: 'Best for handovers between users, teams, or locations.',
  },
]

const statusOptionsByType: Record<AssetTransactionMode, AssetStatus[]> = {
  issue: ['Assigned', 'In Use'],
  return: ['In Stock', 'Maintenance', 'Retired'],
  transfer: ['Assigned', 'In Use', 'Maintenance'],
}

const defaultStatusByType = (type: AssetTransactionMode, asset: AssetRecord): AssetStatus => {
  if (type === 'return') return asset.status === 'Retired' ? 'Retired' : 'In Stock'
  if (type === 'issue') return asset.status === 'In Use' ? 'In Use' : 'Assigned'
  if (asset.status === 'In Stock') return 'Assigned'
  return asset.status === 'Retired' ? 'Assigned' : asset.status
}

const createInitialState = (asset: AssetRecord, requestedMode?: AssetTransactionMode): TransactionFormState => {
  const defaultMode = requestedMode ?? (asset.assignedTo.trim() ? 'transfer' : 'issue')

  return {
    type: defaultMode,
    assignedTo: defaultMode === 'return' ? '' : asset.assignedTo,
    department: asset.department,
    location: asset.location,
    status: defaultStatusByType(defaultMode, asset),
    note: '',
  }
}

const fieldClass = (hasError?: boolean) =>
  clsx('input', hasError && 'border-red-300 focus:border-red-400 focus:ring-red-100')

export default function AssetTransactionForm({
  asset,
  processedBy,
  initialMode,
  saving,
  onSubmit,
}: AssetTransactionFormProps) {
  const [values, setValues] = useState<TransactionFormState>(() => createInitialState(asset, initialMode))
  const [errors, setErrors] = useState<TransactionFormErrors>({})

  useEffect(() => {
    setValues(createInitialState(asset, initialMode))
    setErrors({})
  }, [asset, initialMode])

  const setTransactionType = (type: AssetTransactionMode) => {
    setValues((current) => ({
      ...current,
      type,
      assignedTo: type === 'return' ? '' : current.assignedTo,
      department: current.department || asset.department,
      location: current.location || asset.location,
      status: statusOptionsByType[type].includes(current.status) ? current.status : defaultStatusByType(type, asset),
      note: '',
    }))
    setErrors({})
  }

  const updateField = <Key extends keyof TransactionFormState>(field: Key, value: TransactionFormState[Key]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = (): TransactionFormErrors => {
    const nextErrors: TransactionFormErrors = {}

    if (values.type !== 'return' && !values.assignedTo.trim()) {
      nextErrors.assignedTo = 'Assignee is required for issue and transfer transactions.'
    }

    if (!values.department.trim()) nextErrors.department = 'Department is required.'
    if (!values.location.trim()) nextErrors.location = 'Location is required.'

    if (
      values.type === 'transfer' &&
      asset.assignedTo.trim() &&
      values.assignedTo.trim() === asset.assignedTo.trim() &&
      values.department.trim() === asset.department.trim() &&
      values.location.trim() === asset.location.trim()
    ) {
      nextErrors.assignedTo = 'Change the assignee, department, or location to record a transfer.'
    }

    if (values.type === 'return' && !asset.assignedTo.trim()) {
      nextErrors.note = 'This asset is already unassigned. Use issue if you want to allocate it instead.'
    }

    return nextErrors
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validation = validate()

    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    await onSubmit({
      type: values.type,
      assignedTo: values.assignedTo,
      department: values.department,
      location: values.location,
      status: values.status,
      note: values.note,
      processedBy,
    })
  }

  const isReturn = values.type === 'return'
  const outcomePreview = useMemo(
    () => ({
      owner: isReturn ? 'Unassigned' : values.assignedTo.trim() || 'Pending assignee',
      department: values.department.trim() || 'Pending department',
      location: values.location.trim() || 'Pending location',
      status: values.status,
    }),
    [isReturn, values.assignedTo, values.department, values.location, values.status]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-slate-50/85 p-4">
        <div className="border-b border-slate-200 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step 1</p>
          <h2 className="text-base font-semibold text-slate-900">Choose Transaction Type</h2>
          <p className="text-sm text-slate-500">Select the workflow that best matches what is happening to this asset now.</p>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {transactionOptions.map((option) => {
            const active = values.type === option.id
            return (
              <button
                key={option.id}
                type="button"
                className={clsx(
                  'rounded-2xl border px-4 py-3 text-left transition-all',
                  active
                    ? 'border-[#4E5A7A]/30 bg-[#4E5A7A]/8 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                )}
                onClick={() => setTransactionType(option.id)}
              >
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{option.helper}</p>
                <p className="mt-2 text-[11px] font-medium text-slate-400">{option.context}</p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/85 p-4">
        <div className="border-b border-slate-200 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step 2</p>
          <h2 className="text-base font-semibold text-slate-900">Current Vs Resulting State</h2>
          <p className="text-sm text-slate-500">Review what the asset looks like now and what will be saved after this transaction.</p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Current State</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-slate-400">Owner</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.assignedTo || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Department</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.department || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Location</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.location || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{asset.status}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#4E5A7A]/12 bg-white/85 p-4 shadow-[0_14px_30px_-24px_rgba(78,90,122,0.4)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Result After Save</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-slate-400">Owner</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{outcomePreview.owner}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Department</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{outcomePreview.department}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Location</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{outcomePreview.location}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{outcomePreview.status}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50/85 p-4">
        <div className="border-b border-slate-200 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step 3</p>
          <h2 className="text-base font-semibold text-slate-900">Enter Transaction Details</h2>
          <p className="text-sm text-slate-500">Complete the destination, location, and note fields so the history stays clear for the next person.</p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {!isReturn && (
            <div>
              <label className="label">{values.type === 'issue' ? 'Issue To' : 'Transfer To'}</label>
              <input
                className={fieldClass(!!errors.assignedTo)}
                value={values.assignedTo}
                onChange={(event) => updateField('assignedTo', event.target.value)}
                placeholder="Enter user name, team, or shared pool"
              />
              {errors.assignedTo && <p className="mt-1 text-xs text-red-600">{errors.assignedTo}</p>}
            </div>
          )}

          <div>
            <label className="label">{isReturn ? 'Receiving Department' : 'Department'}</label>
            <input
              className={fieldClass(!!errors.department)}
              value={values.department}
              onChange={(event) => updateField('department', event.target.value)}
              placeholder={isReturn ? 'Where the asset is being returned' : 'Owning department'}
            />
            {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{isReturn ? 'Return Location' : 'Location'}</label>
            <input
              className={fieldClass(!!errors.location)}
              value={values.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder={isReturn ? 'Storage room, warehouse, or service desk' : 'Current location'}
            />
            {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
          </div>

          <div>
            <label className="label">Resulting Status</label>
            <select
              className="input"
              value={values.status}
              onChange={(event) => updateField('status', event.target.value as AssetStatus)}
            >
              {statusOptionsByType[values.type].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Transaction Note</label>
          <textarea
            rows={4}
            className={fieldClass(!!errors.note)}
            value={values.note}
            onChange={(event) => updateField('note', event.target.value)}
            placeholder="Add handover details, approval context, return condition, or any note that explains why this movement is happening."
          />
          {errors.note && <p className="mt-1 text-xs text-red-600">{errors.note}</p>}
        </div>
      </section>

      <div className="rounded-2xl border border-[#4E5A7A]/10 bg-white/85 px-4 py-3 text-sm text-slate-600">
        Recorded by:
        <span className="ml-1 font-semibold text-slate-800">{processedBy}</span>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : values.type === 'issue' ? 'Issue Asset' : values.type === 'return' ? 'Return Asset' : 'Transfer Asset'}
        </button>
      </div>
    </form>
  )
}
