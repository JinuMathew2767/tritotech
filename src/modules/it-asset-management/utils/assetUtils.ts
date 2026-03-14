import type { AssetCategory, AssetRecord, AssetStatus } from '../data/mockAssets'

export type AssetExpiryStatus = 'Expired' | 'Expiring Soon' | 'Active' | 'Not Tracked'

export interface AssetDashboardSummary {
  totalAssets: number
  hardwareAssets: number
  softwareAssets: number
  expiringSoon: number
  expired: number
}

export interface AssetFormValues {
  name: string
  category: AssetCategory
  subcategory: string
  serialNumber: string
  imeiNumber: string
  brandModel: string
  vendor: string
  purchaseDate: string
  purchaseCost: string
  expiryDate: string
  warrantyExpiry: string
  assignedTo: string
  department: string
  location: string
  status: AssetStatus
  notes: string
}

export type AssetFormErrors = Partial<Record<keyof AssetFormValues, string>>

export const assetStatuses: AssetStatus[] = ['In Stock', 'Assigned', 'In Use', 'Maintenance', 'Retired']

export const assetStatusTone: Record<AssetStatus, string> = {
  'In Stock': 'bg-slate-100 text-slate-700',
  Assigned: 'bg-blue-50 text-blue-700',
  'In Use': 'bg-emerald-50 text-emerald-700',
  Maintenance: 'bg-amber-50 text-amber-700',
  Retired: 'bg-rose-50 text-rose-700',
}

export const createEmptyAssetFormValues = (): AssetFormValues => ({
  name: '',
  category: 'Hardware',
  subcategory: '',
  serialNumber: '',
  imeiNumber: '',
  brandModel: '',
  vendor: '',
  purchaseDate: '',
  purchaseCost: '',
  expiryDate: '',
  warrantyExpiry: '',
  assignedTo: '',
  department: '',
  location: '',
  status: 'In Stock',
  notes: '',
})

export const toAssetFormValues = (asset: AssetRecord): AssetFormValues => ({
  name: asset.name,
  category: asset.category,
  subcategory: asset.subcategory,
  serialNumber: asset.serialNumber,
  imeiNumber: asset.imeiNumber,
  brandModel: asset.brandModel,
  vendor: asset.vendor,
  purchaseDate: asset.purchaseDate,
  purchaseCost: String(asset.purchaseCost),
  expiryDate: asset.expiryDate,
  warrantyExpiry: asset.warrantyExpiry,
  assignedTo: asset.assignedTo,
  department: asset.department,
  location: asset.location,
  status: asset.status,
  notes: asset.notes,
})

const normalizeDate = (value: string) =>
  value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)

export const formatAssetDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(normalizeDate(value))
    : 'Not set'

export const formatAssetCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

export const getDaysUntilExpiry = (expiryDate: string, today = new Date()) => {
  if (!expiryDate) return Number.POSITIVE_INFINITY
  const current = new Date(today)
  current.setHours(0, 0, 0, 0)
  return Math.ceil((normalizeDate(expiryDate).getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
}

// Centralized expiry logic keeps lists, dashboards, and future reminder automations in sync.
export const getExpiryStatus = (expiryDate: string, today = new Date()): AssetExpiryStatus => {
  if (!expiryDate) return 'Not Tracked'
  const daysRemaining = getDaysUntilExpiry(expiryDate, today)

  if (daysRemaining < 0) return 'Expired'
  if (daysRemaining <= 30) return 'Expiring Soon'
  return 'Active'
}

export const getExpiryPresentation = (expiryDate: string, today = new Date()) => {
  const status = getExpiryStatus(expiryDate, today)

  if (status === 'Not Tracked') {
    return {
      status,
      badgeTone: 'bg-slate-100 text-slate-600 border-slate-200',
      rowTone: 'bg-white hover:bg-slate-50',
      helper: 'Not tracked',
    }
  }

  if (status === 'Expired') {
    return {
      status,
      badgeTone: 'bg-red-50 text-red-700 border-red-100',
      rowTone: 'bg-red-50/55 hover:bg-red-50',
      helper: 'Expired',
    }
  }

  if (status === 'Expiring Soon') {
    return {
      status,
      badgeTone: 'bg-amber-50 text-amber-700 border-amber-100',
      rowTone: 'bg-amber-50/45 hover:bg-amber-50',
      helper: `${Math.max(getDaysUntilExpiry(expiryDate, today), 0)} days left`,
    }
  }

  return {
    status,
    badgeTone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rowTone: 'bg-emerald-50/35 hover:bg-emerald-50',
    helper: 'Active',
  }
}

export const summarizeAssets = (assets: AssetRecord[]): AssetDashboardSummary => {
  return assets.reduce<AssetDashboardSummary>(
    (accumulator, asset) => {
      accumulator.totalAssets += 1

      if (asset.category === 'Hardware') accumulator.hardwareAssets += 1
      if (asset.category === 'Software') accumulator.softwareAssets += 1

      const expiryStatus = getExpiryStatus(asset.expiryDate)
      if (expiryStatus === 'Expiring Soon') accumulator.expiringSoon += 1
      if (expiryStatus === 'Expired') accumulator.expired += 1

      return accumulator
    },
    {
      totalAssets: 0,
      hardwareAssets: 0,
      softwareAssets: 0,
      expiringSoon: 0,
      expired: 0,
    }
  )
}

// Validation stays separate from the form UI so it can later power modals, imports, and bulk edit flows.
export const validateAssetForm = (values: AssetFormValues): AssetFormErrors => {
  const errors: AssetFormErrors = {}
  const purchaseCost = Number(values.purchaseCost)

  if (!values.name.trim()) errors.name = 'Asset name is required.'
  if (!values.category) errors.category = 'Asset category is required.'
  if (!values.subcategory.trim()) errors.subcategory = 'Subcategory is required.'
  if (!values.brandModel.trim()) errors.brandModel = 'Brand / model is required.'
  if (!values.vendor.trim()) errors.vendor = 'Vendor is required.'
  if (!values.purchaseDate) errors.purchaseDate = 'Purchase date is required.'
  if (!values.purchaseCost || Number.isNaN(purchaseCost) || purchaseCost <= 0) errors.purchaseCost = 'Purchase cost must be greater than zero.'
  if (!values.department.trim()) errors.department = 'Department is required.'
  if (!values.location.trim()) errors.location = 'Location is required.'

  if ((values.status === 'Assigned' || values.status === 'In Use') && !values.assignedTo.trim()) {
    errors.assignedTo = 'Assigned user is required when the asset is allocated.'
  }

  if (values.purchaseDate && values.expiryDate && normalizeDate(values.expiryDate) < normalizeDate(values.purchaseDate)) {
    errors.expiryDate = 'Expiry date cannot be earlier than purchase date.'
  }

  if (values.purchaseDate && values.warrantyExpiry && normalizeDate(values.warrantyExpiry) < normalizeDate(values.purchaseDate)) {
    errors.warrantyExpiry = 'Warranty expiry cannot be earlier than purchase date.'
  }

  return errors
}
