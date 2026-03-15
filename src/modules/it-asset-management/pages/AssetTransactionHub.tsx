import { useEffect, useMemo, useState, type FormEvent } from 'react'
import clsx from 'clsx'
import axios from 'axios'
import { ArrowRightLeft, Check, FolderKanban, Repeat2, RotateCcw, Search, Warehouse } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import DropdownSelect from '@/components/ui/DropdownSelect'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/contexts/AuthContext'
import AssetModuleTabs from '../components/AssetModuleTabs'
import AssetWorkspaceHeader from '../components/AssetWorkspaceHeader'
import type { AssetRecord, AssetStatus } from '../data/mockAssets'
import assetService, {
  type AssetDepartmentMaster,
  type AssetEmployeeMaster,
} from '../services/assetService'
import { assetStatusTone, formatAssetDate, getExpiryPresentation } from '../utils/assetUtils'
import { buildHistoryTransactionDocuments } from '../utils/transactionDocuments'

type TransactionWorkspaceMode = 'issue' | 'transfer'

interface TransactionFormState {
  assignedTo: string
  department: string
  location: string
  status: AssetStatus
  note: string
}

type TransactionFormErrors = Partial<Record<'asset' | keyof TransactionFormState, string>>

const modeOptions: Array<{
  id: TransactionWorkspaceMode
  label: string
  icon: typeof Warehouse
  helper: string
  tone: string
}> = [
  {
    id: 'issue',
    label: 'New Issue',
    icon: Warehouse,
    helper: 'Allocate one or more available assets to the same employee, team, or shared pool.',
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: Repeat2,
    helper: 'Move one or more assigned assets from the current owner or location to a new destination.',
    tone: 'bg-violet-50 text-violet-700',
  },
]

const statusOptionsByMode: Record<TransactionWorkspaceMode, AssetStatus[]> = {
  issue: ['Assigned', 'In Use'],
  transfer: ['Assigned', 'In Use', 'Maintenance'],
}

const actorNameFromUser = (firstName?: string, lastName?: string) => {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim()
  return name || 'System'
}

const isReadyToIssue = (asset: AssetRecord) => !asset.assignedTo.trim() && asset.status !== 'Retired'
const isReadyToTransfer = (asset: AssetRecord) => !!asset.assignedTo.trim()

const createInitialFormState = (mode: TransactionWorkspaceMode): TransactionFormState => ({
  assignedTo: '',
  department: '',
  location: '',
  status: mode === 'issue' ? 'Assigned' : 'Assigned',
  note: '',
})

const areSelectionsEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const formatScopeSummary = (values: string[], emptyLabel: string) => {
  const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  )

  if (uniqueValues.length === 0) return emptyLabel
  if (uniqueValues.length === 1) return uniqueValues[0]
  if (uniqueValues.length === 2) return `${uniqueValues[0]} + ${uniqueValues[1]}`
  return `${uniqueValues.length} selected`
}

const getTransactionErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return 'Failed to save asset transaction.'
}

const transactionToneByType: Record<string, string> = {
  Issue: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Transfer: 'bg-violet-50 text-violet-700 border-violet-100',
}

export default function AssetTransactionHub() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [values, setValues] = useState<TransactionFormState>(createInitialFormState('issue'))
  const [errors, setErrors] = useState<TransactionFormErrors>({})
  const [departments, setDepartments] = useState<AssetDepartmentMaster[]>([])
  const [employees, setEmployees] = useState<AssetEmployeeMaster[]>([])

  useEffect(() => {
    Promise.all([assetService.list(), assetService.getMeta()])
      .then(([assetRows, meta]) => {
        setAssets(assetRows)
        setDepartments(meta.departments)
        setEmployees(meta.employees)
      })
      .catch(() => toast.error('Failed to load asset transactions'))
      .finally(() => setLoading(false))
  }, [])

  const mode: TransactionWorkspaceMode = searchParams.get('mode') === 'transfer' ? 'transfer' : 'issue'
  const requestedAssetId = searchParams.get('asset') ?? ''

  const issueReadyAssets = useMemo(() => assets.filter(isReadyToIssue), [assets])
  const transferReadyAssets = useMemo(() => assets.filter(isReadyToTransfer), [assets])
  const transactionDocuments = useMemo(
    () =>
      buildHistoryTransactionDocuments(assets).filter(
        (document) => document.transactionType === (mode === 'issue' ? 'Issue' : 'Transfer')
      ),
    [assets, mode]
  )

  const eligibleAssets = useMemo(() => {
    const sourceAssets = mode === 'issue' ? issueReadyAssets : transferReadyAssets
    const needle = search.trim().toLowerCase()

    if (!needle) {
      return sourceAssets
    }

    return sourceAssets.filter((asset) => {
      const haystack = `${asset.id} ${asset.name} ${asset.assignedTo} ${asset.department} ${asset.location} ${asset.vendor}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [issueReadyAssets, mode, search, transferReadyAssets])

  const selectedAssets = useMemo(
    () => eligibleAssets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [eligibleAssets, selectedAssetIds]
  )
  const primarySelectedAsset = selectedAssets[0] ?? null

  useEffect(() => {
    if (loading) return

    const eligibleAssetIds = new Set(eligibleAssets.map((asset) => asset.id))
    setSelectedAssetIds((current) => {
      const filteredSelection = current.filter((assetId) => eligibleAssetIds.has(assetId))
      const nextSelection =
        filteredSelection.length > 0
          ? filteredSelection
          : requestedAssetId && eligibleAssetIds.has(requestedAssetId)
            ? [requestedAssetId]
            : []

      return areSelectionsEqual(current, nextSelection) ? current : nextSelection
    })
  }, [eligibleAssets, loading, requestedAssetId])

  useEffect(() => {
    setValues(createInitialFormState(mode))
    setErrors({})
  }, [mode])

  const updateField = <Key extends keyof TransactionFormState>(field: Key, value: TransactionFormState[Key]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.name === values.department) ?? null,
    [departments, values.department]
  )

  const departmentOptions = useMemo(() => {
    const optionMap = new Map<string, AssetDepartmentMaster>()
    for (const department of departments) {
      optionMap.set(department.name, department)
    }

    if (values.department.trim() && !optionMap.has(values.department.trim())) {
      optionMap.set(values.department.trim(), {
        id: 0,
        name: values.department.trim(),
        location: values.location,
      })
    }

    return Array.from(optionMap.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [departments, values.department, values.location])

  const locationOptions = useMemo(() => {
    const nextOptions = new Set<string>()

    if (selectedDepartment?.location.trim()) {
      nextOptions.add(selectedDepartment.location.trim())
    }

    for (const department of departments) {
      if (department.location.trim()) {
        nextOptions.add(department.location.trim())
      }
    }

    if (values.location.trim()) {
      nextOptions.add(values.location.trim())
    }

    return Array.from(nextOptions).sort((left, right) => left.localeCompare(right))
  }, [departments, selectedDepartment, values.location])

  const employeeOptions = useMemo(() => {
    const optionMap = new Map<string, AssetEmployeeMaster>()
    for (const employee of employees) {
      optionMap.set(employee.name, employee)
    }

    if (values.assignedTo.trim() && !optionMap.has(values.assignedTo.trim())) {
      optionMap.set(values.assignedTo.trim(), {
        id: 0,
        employeeCode: 'CURRENT',
        name: values.assignedTo.trim(),
        email: '',
        departmentId: null,
        department: values.department,
        location: values.location,
        isActive: true,
      })
    }

    return Array.from(optionMap.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [employees, values.assignedTo, values.department, values.location])

  const handleAssigneeChange = (assigneeName: string) => {
    const matchedEmployee = employees.find((employee) => employee.name === assigneeName)

    setValues((current) => ({
      ...current,
      assignedTo: assigneeName,
      department: matchedEmployee?.department || current.department,
      location: matchedEmployee?.location || current.location,
    }))

    setErrors((current) => ({ ...current, assignedTo: undefined, department: undefined, location: undefined }))
  }

  const handleDepartmentChange = (departmentName: string) => {
    const matchedDepartment = departments.find((department) => department.name === departmentName)

    setValues((current) => ({
      ...current,
      department: departmentName,
      location: matchedDepartment?.location || current.location,
    }))

    setErrors((current) => ({ ...current, department: undefined, location: undefined }))
  }

  const handleModeChange = (nextMode: TransactionWorkspaceMode) => {
    if (nextMode === mode) return

    setSelectedAssetIds([])

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('mode', nextMode)
    nextParams.delete('asset')
    setSearchParams(nextParams, { replace: true })
  }

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((currentId) => currentId !== assetId) : [...current, assetId]
    )
    setErrors((current) => ({ ...current, asset: undefined }))
  }

  const validate = () => {
    const nextErrors: TransactionFormErrors = {}

    if (selectedAssets.length === 0) {
      nextErrors.asset =
        mode === 'issue'
          ? 'Choose at least one asset that is ready to issue.'
          : 'Choose at least one asset that is ready to transfer.'
      return nextErrors
    }

    if (!values.assignedTo.trim()) {
      nextErrors.assignedTo =
        mode === 'issue'
          ? 'Choose who these assets are being issued to.'
          : 'Choose who these assets are being transferred to.'
    }

    if (!values.department.trim()) nextErrors.department = 'Department is required.'
    if (!values.location.trim()) nextErrors.location = 'Location is required.'

    if (
      mode === 'transfer' &&
      selectedAssets.every(
        (asset) =>
          values.assignedTo.trim() === asset.assignedTo.trim() &&
          values.department.trim() === asset.department.trim() &&
          values.location.trim() === asset.location.trim()
      )
    ) {
      nextErrors.assignedTo = 'Change the owner, department, or location before saving this transfer.'
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

    try {
      setSaving(true)

      const assetsToProcess =
        mode === 'transfer'
          ? selectedAssets.filter(
              (asset) =>
                values.assignedTo.trim() !== asset.assignedTo.trim() ||
                values.department.trim() !== asset.department.trim() ||
                values.location.trim() !== asset.location.trim()
            )
          : selectedAssets

      if (assetsToProcess.length === 0) {
        setErrors({ assignedTo: 'All selected assets already match this destination.' })
        return
      }

      const transactionPayload = {
        type: mode,
        assetCodes: assetsToProcess.map((asset) => asset.id),
        assignedTo: values.assignedTo,
        department: values.department,
        location: values.location,
        status: values.status,
        note: values.note,
        processedBy: actorNameFromUser(user?.first_name, user?.last_name),
      }

      const document = await assetService.transactBatch(transactionPayload)
      const skippedCount = selectedAssets.length - assetsToProcess.length

      const refreshedAssets = await assetService.list()
      setAssets(refreshedAssets)

      toast.success(
        mode === 'issue'
          ? `Issued ${document.assetCount} asset${document.assetCount === 1 ? '' : 's'} under ${document.transactionNumber}${skippedCount ? `, skipped ${skippedCount}` : ''}.`
          : `Transferred ${document.assetCount} asset${document.assetCount === 1 ? '' : 's'} under ${document.transactionNumber}${skippedCount ? `, skipped ${skippedCount}` : ''}.`
      )

      setSelectedAssetIds([])
    } catch (error) {
      toast.error(getTransactionErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const selectedAssetExpiry = primarySelectedAsset ? getExpiryPresentation(primarySelectedAsset.expiryDate) : null
  const fromOwner = formatScopeSummary(selectedAssets.map((asset) => asset.assignedTo || 'Unassigned'), 'No assets selected')
  const fromDepartment = formatScopeSummary(selectedAssets.map((asset) => asset.department || 'Not set'), 'No assets selected')
  const fromLocation = formatScopeSummary(selectedAssets.map((asset) => asset.location || 'Not set'), 'No assets selected')
  const nextOwner = values.assignedTo.trim() || 'Pending owner'
  const nextDepartment = values.department.trim() || 'Pending department'
  const nextLocation = values.location.trim() || 'Pending location'
  const selectedCountLabel =
    selectedAssets.length > 0
      ? `${selectedAssets.length} Asset${selectedAssets.length === 1 ? '' : 's'}`
      : 'Assets'
  const buttonLabel = mode === 'issue' ? `Issue ${selectedCountLabel}` : `Transfer ${selectedCountLabel}`

  if (loading) return <PageLoader />

  return (
    <div className="page-shell">
      <AssetModuleTabs compact />

      <AssetWorkspaceHeader
        compact
        badgeIcon={ArrowRightLeft}
        badgeLabel="Asset Transactions"
        title="Issue And Transfer Workspace"
        description="Choose assets, set one destination, and save the movement."
        actions={[
          { label: 'Open Asset Master', to: '/it-assets/master', icon: FolderKanban, tone: 'secondary' },
        ]}
        stats={[
          { label: 'Ready to issue', value: String(issueReadyAssets.length), tone: 'success' },
          { label: 'Ready to transfer', value: String(transferReadyAssets.length) },
          { label: 'Filtered assets', value: String(eligibleAssets.length), tone: eligibleAssets.length > 0 ? 'default' : 'warning' },
          { label: 'Selected assets', value: String(selectedAssets.length), tone: selectedAssets.length > 0 ? 'default' : 'warning' },
        ]}
      />

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <section className="card p-3">
            <div className="border-b border-slate-200 pb-2">
              <p className="ui-kicker">Step 1</p>
              <h2 className="ui-section-title mt-0.5">Choose Action</h2>
            </div>

            <div className="mt-2.5 grid gap-2 md:grid-cols-2">
              {modeOptions.map((option) => {
                const Icon = option.icon
                const active = mode === option.id

                return (
                  <button key={option.id} type="button" onClick={() => handleModeChange(option.id)} className={clsx('rounded-xl border px-3 py-2.5 text-left transition-all', active ? 'border-[#4E5A7A]/28 bg-[#4E5A7A]/8 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#4E5A7A]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${option.tone}`}>
                          {option.label}
                        </div>
                        <p className="ui-data-note mt-1">{option.helper}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="card p-3">
            <div className="border-b border-slate-200 pb-2">
              <p className="ui-kicker">Step 2</p>
              <h2 className="ui-section-title mt-0.5">Choose Assets</h2>
              <p className="ui-data-note mt-1">
                {mode === 'issue'
                  ? 'Select one or more assets that are currently available to issue to the same employee.'
                  : 'Select one or more assets that already have an active owner and are ready to transfer together.'}
              </p>
            </div>

            <div className="mt-2.5 space-y-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder={mode === 'issue' ? 'Search issue-ready assets' : 'Search transfer-ready assets'} value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>

              {errors.asset && <p className="text-xs text-red-600">{errors.asset}</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-600">
                <p>
                  <span className="ui-data-value text-[13px]">{selectedAssets.length}</span>
                  <span className="ml-1">asset{selectedAssets.length === 1 ? '' : 's'} selected</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setSelectedAssetIds(eligibleAssets.map((asset) => asset.id))} disabled={eligibleAssets.length === 0}>
                    Select all filtered
                  </button>
                  <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setSelectedAssetIds([])} disabled={selectedAssets.length === 0}>
                    Clear selection
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5">
                {eligibleAssets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                    {mode === 'issue'
                      ? 'No assets are currently ready to issue with the active filters.'
                      : 'No assets are currently ready to transfer with the active filters.'}
                  </div>
                ) : (
                  eligibleAssets.map((asset) => {
                    const active = selectedAssetIds.includes(asset.id)
                    const expiry = getExpiryPresentation(asset.expiryDate)

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleAssetSelect(asset.id)}
                        className={clsx(
                          'rounded-lg border px-2.5 py-2.5 text-left transition-all',
                          active
                            ? 'border-[#4E5A7A]/30 bg-[#4E5A7A]/8 shadow-[0_14px_34px_-28px_rgba(78,90,122,0.45)]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span
                              className={clsx(
                                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                                active
                                  ? 'border-[#4E5A7A] bg-[#4E5A7A] text-white'
                                  : 'border-slate-300 bg-white text-transparent'
                              )}
                            >
                              <Check className="h-2.5 w-2.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="ui-list-id">{asset.id}</p>
                              <p className="ui-data-value mt-0.5 truncate text-[14px]">{asset.name}</p>
                              <p className="ui-data-note truncate">
                                {asset.category} - {asset.subcategory} - {asset.vendor}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-1.5">
                            <span className={clsx('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', assetStatusTone[asset.status])}>
                              {asset.status}
                            </span>
                            <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold', expiry.badgeTone)}>
                              {expiry.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-slate-500">
                          <span className="min-w-0 truncate">
                            <span className="ui-data-label mr-1">Owner</span>
                            {asset.assignedTo || 'Unassigned'}
                          </span>
                          <span className="min-w-0 truncate">
                            <span className="ui-data-label mr-1">Dept</span>
                            {asset.department || 'Not set'}
                          </span>
                          <span className="min-w-0 truncate">
                            <span className="ui-data-label mr-1">Loc</span>
                            {asset.location || 'Not set'}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          <section className="card p-3">
            <div className="border-b border-slate-200 pb-2">
              <p className="ui-kicker">Step 3</p>
              <h2 className="ui-section-title mt-0.5">Choose From And To</h2>
            </div>

            <div className="mt-2.5 grid gap-2.5 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="ui-kicker">From</p>
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="ui-data-label">Selected Assets</p>
                    <p className="ui-data-value mt-1">
                      {selectedAssets.length > 0 ? `${selectedAssets.length} asset${selectedAssets.length === 1 ? '' : 's'}` : 'None selected'}
                    </p>
                  </div>
                  <div>
                    <p className="ui-data-label">Owner</p>
                    <p className="ui-data-value mt-1">{fromOwner}</p>
                  </div>
                  <div>
                    <p className="ui-data-label">Department</p>
                    <p className="ui-data-value mt-1">{fromDepartment}</p>
                  </div>
                  <div>
                    <p className="ui-data-label">Location</p>
                    <p className="ui-data-value mt-1">{fromLocation}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#4E5A7A]/12 bg-white/85 p-3 shadow-[0_14px_34px_-28px_rgba(78,90,122,0.45)]">
                <p className="ui-kicker">To</p>
                <div className="mt-2.5 grid gap-2.5">
                  <div>
                    <label className="label">{mode === 'issue' ? 'Issue To' : 'Transfer To'}</label>
                    <DropdownSelect
                      value={values.assignedTo}
                      onChange={handleAssigneeChange}
                      placeholder="Select asset employee"
                      disabled={selectedAssets.length === 0}
                      buttonClassName={clsx(!!errors.assignedTo && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                      options={employeeOptions.map((employee) => ({
                        value: employee.name,
                        label: employee.name,
                        description: employee.department || undefined,
                      }))}
                    />
                    {errors.assignedTo && <p className="mt-1 text-xs text-red-600">{errors.assignedTo}</p>}
                    <p className="ui-data-note mt-1">Source: Settings - Masters - Asset Employees.</p>
                  </div>

                  <div className="grid gap-2.5 md:grid-cols-2">
                    <div>
                      <label className="label">Department</label>
                      <DropdownSelect
                        value={values.department}
                        onChange={handleDepartmentChange}
                        placeholder="Select department"
                        disabled={selectedAssets.length === 0}
                        buttonClassName={clsx(!!errors.department && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                        options={departmentOptions.map((department) => ({
                          value: department.name,
                          label: department.name,
                          description: department.location || undefined,
                        }))}
                      />
                      {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
                    </div>

                    <div>
                      <label className="label">Location</label>
                      <DropdownSelect
                        value={values.location}
                        onChange={(value) => updateField('location', value)}
                        placeholder="Select location"
                        disabled={selectedAssets.length === 0}
                        buttonClassName={clsx(!!errors.location && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
                        options={locationOptions.map((location) => ({ value: location, label: location }))}
                      />
                      {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
                      {selectedDepartment?.location ? <p className="ui-data-note mt-1">Linked from department master.</p> : null}
                    </div>
                  </div>

                  <div>
                    <label className="label">Resulting Status</label>
                    <DropdownSelect
                      value={values.status}
                      onChange={(value) => updateField('status', value as AssetStatus)}
                      disabled={selectedAssets.length === 0}
                      options={statusOptionsByMode[mode].map((status) => ({ value: status, label: status }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="card p-3">
            <div className="border-b border-slate-200 pb-2">
              <p className="ui-kicker">Step 4</p>
              <h2 className="ui-section-title mt-0.5">Additional Details</h2>
            </div>

            <div className="mt-2.5 space-y-2.5">
              <div>
                <label className="label">Transaction Note</label>
                <textarea
                  rows={2}
                  className="input"
                  value={values.note}
                  onChange={(event) => updateField('note', event.target.value)}
                  placeholder="Add approval notes, handover context, stock comments, or anything the next person should know."
                  disabled={selectedAssets.length === 0}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                <div className="ui-data-note">
                  Recorded by:
                  <span className="ml-1 font-semibold text-slate-900">{actorNameFromUser(user?.first_name, user?.last_name)}</span>
                </div>
                <button type="submit" className="btn-primary" disabled={saving || selectedAssets.length === 0}>
                  {saving ? 'Saving...' : buttonLabel}
                </button>
              </div>
            </div>
          </section>
        </form>

        <div className="space-y-2">
          <div className="card p-3">
            <h2 className="ui-section-title">Selected Assets</h2>
            {selectedAssets.length === 0 ? (
              <div className="mt-2.5 rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
                Choose one or more eligible assets to start the transaction.
              </div>
            ) : (
              <div className="mt-2.5 space-y-2">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="ui-data-label">Batch Summary</p>
                  <p className="ui-data-value mt-1">
                    {selectedAssets.length} asset{selectedAssets.length === 1 ? '' : 's'} ready for {mode}
                  </p>
                  <p className="ui-data-note mt-1">
                    {selectedAssets.slice(0, 3).map((asset) => asset.id).join(', ')}
                    {selectedAssets.length > 3 ? ` + ${selectedAssets.length - 3} more` : ''}
                  </p>
                </div>

                {primarySelectedAsset && (
                  <div className="rounded-xl bg-slate-50 p-2.5">
                    <p className="ui-data-label">Primary Preview Asset</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="ui-data-value">{primarySelectedAsset.name}</p>
                        <p className="ui-data-note mt-1">{formatAssetDate(primarySelectedAsset.expiryDate)}</p>
                      </div>
                      {selectedAssetExpiry && (
                        <span className={clsx('rounded-full border px-2.5 py-1 text-[11px] font-semibold', selectedAssetExpiry.badgeTone)}>
                          {selectedAssetExpiry.status}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="ui-data-label">Live Preview</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <p className="ui-data-label">To Owner</p>
                      <p className="ui-data-value mt-1">{nextOwner}</p>
                    </div>
                    <div>
                      <p className="ui-data-label">To Department</p>
                      <p className="ui-data-value mt-1">{nextDepartment}</p>
                    </div>
                    <div>
                      <p className="ui-data-label">To Location</p>
                      <p className="ui-data-value mt-1">{nextLocation}</p>
                    </div>
                    <div>
                      <p className="ui-data-label">Resulting Status</p>
                      <span className={clsx('mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', assetStatusTone[values.status])}>
                        {values.status}
                      </span>
                    </div>
                  </div>
                </div>

                {primarySelectedAsset && (
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/it-assets/${primarySelectedAsset.id}`} className="btn-secondary flex-1 px-3 py-2 text-xs">
                      View First Asset
                    </Link>
                    {primarySelectedAsset.assignedTo.trim() && (
                      <Link to={`/it-assets/${primarySelectedAsset.id}/transactions?mode=return`} className="btn-secondary flex-1 gap-1.5 px-3 py-2 text-xs">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Return
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {primarySelectedAsset && primarySelectedAsset.assignmentHistory.length > 0 && (
            <div className="card p-3">
              <h2 className="ui-section-title">Recent Movement</h2>
              <p className="ui-data-note mt-1">Latest history for the first selected asset.</p>
              <div className="mt-2.5 space-y-2">
                {primarySelectedAsset.assignmentHistory.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-slate-50 p-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="ui-data-value">{entry.assignedTo}</p>
                        <p className="ui-data-note mt-1">
                          {entry.department} - {entry.location}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                        {entry.type}
                      </span>
                    </div>
                    <p className="ui-data-note mt-3 text-slate-400">
                      {formatAssetDate(entry.assignedAt)} by {entry.assignedBy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="card mt-2.5 p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-2.5">
          <div>
            <p className="ui-kicker">Transaction List</p>
            <h2 className="ui-section-title mt-0.5">
              {mode === 'issue' ? 'Issued Asset Records' : 'Transferred Asset Records'}
            </h2>
            <p className="ui-data-note mt-1">
              Every recorded issue or transfer document remains visible here for quick review without leaving the workspace.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {transactionDocuments.length} record{transactionDocuments.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {transactionDocuments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-400">
              No transaction documents have been recorded yet.
            </div>
          ) : (
            transactionDocuments.map((document) => (
              <div key={document.transactionNumber} className="grid gap-2.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 md:grid-cols-[1.3fr_1fr_90px_1.1fr_82px] md:items-center">
                <div>
                  <p className="ui-kicker">Transaction Number</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="ui-data-value">{document.transactionNumber}</p>
                    <span className={clsx('rounded-full border px-2 py-0.5 text-[10px] font-semibold', transactionToneByType[document.transactionType] || 'bg-slate-50 text-slate-700 border-slate-200')}>
                      {document.transactionType}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="ui-kicker">Transaction Date</p>
                  <p className="ui-data-note mt-1 text-slate-700">{formatAssetDate(document.transactionDate)}</p>
                </div>
                <div>
                  <p className="ui-kicker">Asset Count</p>
                  <p className="ui-data-value mt-1">{document.assetCount}</p>
                </div>
                <div>
                  <p className="ui-kicker">Issued To</p>
                  <p className="ui-data-note mt-1 text-slate-700">{document.issuedTo}</p>
                </div>
                <div className="md:justify-self-end">
                  <Link to={`/it-assets/transactions/documents/${document.transactionNumber}`} className="btn-secondary w-full justify-center px-3 py-2 text-xs md:w-auto">
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
