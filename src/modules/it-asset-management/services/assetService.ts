import api from '@/services/api'
import type { AssetRecord, AssetStatus } from '../data/mockAssets'
import {
  createEmptyAssetFormValues,
  getExpiryStatus,
  summarizeAssets,
  type AssetDashboardSummary,
  type AssetFormValues,
} from '../utils/assetUtils'

export type AssetTransactionMode = 'issue' | 'return' | 'transfer'

export interface AssetTransactionValues {
  type: AssetTransactionMode
  assignedTo: string
  department: string
  location: string
  status: AssetStatus
  note: string
  processedBy: string
}

export interface AssetTransactionDocumentSummary {
  id: number
  transactionNumber: string
  transactionType: string
  transactionDate: string
  assetCount: number
  issuedTo: string
  department: string
  location: string
  status: string
  note: string
  createdBy: string
}

export interface AssetTransactionDocumentItem {
  id: number
  assetId: string
  assetName: string
  assignedTo: string
  department: string
  location: string
  assignedAt: string
  note: string
  assignedBy: string
  fromAssignedTo: string
  fromDepartment: string
  fromLocation: string
}

export interface AssetTransactionDocumentDetail extends AssetTransactionDocumentSummary {
  items: AssetTransactionDocumentItem[]
}

export interface AssetBatchTransactionValues extends AssetTransactionValues {
  assetCodes: string[]
}

export interface AssetDepartmentMaster {
  id: number
  name: string
  location: string
}

export interface AssetCategoryMaster {
  id: number
  name: string
  description: string
  isActive: boolean
  assetCount: number
  subcategoryCount: number
}

export interface AssetSubcategoryMaster {
  id: number
  categoryId: number
  categoryName: string
  name: string
  isActive: boolean
  assetCount: number
}

export interface AssetVendorMaster {
  id: number
  vendorName: string
  erpVendorCode: string
  assetCount: number
}

export interface AssetEmployeeMaster {
  id: number
  employeeCode: string
  name: string
  email: string
  departmentId: number | null
  department: string
  location: string
  isActive: boolean
}

export interface AssetMeta {
  categories: string[]
  subcategories: AssetSubcategoryMaster[]
  vendors: string[]
  statuses: string[]
  transactions: AssetTransactionMode[]
  departments: AssetDepartmentMaster[]
  locations: string[]
  employees: AssetEmployeeMaster[]
}

export interface AssetCategoryInput {
  name: string
  description: string
  isActive?: boolean
}

export interface AssetSubcategoryInput {
  categoryId: number
  name: string
  isActive?: boolean
}

export interface AssetVendorInput {
  vendorName: string
  erpVendorCode: string
}

export interface AssetEmployeeInput {
  employeeCode: string
  name: string
  email: string
  departmentId: number | null
}

const sortAssets = (assets: AssetRecord[]) =>
  [...assets].sort((left, right) => {
    const toWeight = (expiryDate: string) => {
      const status = getExpiryStatus(expiryDate)
      if (status === 'Expired') return 0
      if (status === 'Expiring Soon') return 1
      if (status === 'Active') return 2
      return 3
    }

    const leftWeight = toWeight(left.expiryDate)
    const rightWeight = toWeight(right.expiryDate)

    if (leftWeight !== rightWeight) return leftWeight - rightWeight
    return left.id.localeCompare(right.id)
  })

const assetService = {
  async list(): Promise<AssetRecord[]> {
    const { data } = await api.get<AssetRecord[]>('/assets/')
    return sortAssets(data)
  },

  async getById(id: string): Promise<AssetRecord> {
    const { data } = await api.get<AssetRecord>(`/assets/${encodeURIComponent(id)}/`)
    return data
  },

  async create(values: AssetFormValues): Promise<AssetRecord> {
    const { data } = await api.post<AssetRecord>('/assets/', values)
    return data
  },

  async update(id: string, values: AssetFormValues): Promise<AssetRecord> {
    const { data } = await api.patch<AssetRecord>(`/assets/${encodeURIComponent(id)}/`, values)
    return data
  },

  async transact(id: string, values: AssetTransactionValues): Promise<AssetRecord> {
    const { data } = await api.post<AssetRecord>(`/assets/${encodeURIComponent(id)}/transactions/`, values)
    return data
  },

  async transactBatch(values: AssetBatchTransactionValues): Promise<AssetTransactionDocumentDetail> {
    const { data } = await api.post<AssetTransactionDocumentDetail>('/assets/transactions/batch', values)
    return data
  },

  async listTransactionDocuments(type?: 'issue' | 'transfer'): Promise<AssetTransactionDocumentSummary[]> {
    const { data } = await api.get<AssetTransactionDocumentSummary[]>('/assets/transactions/documents', {
      params: type ? { type } : undefined,
    })
    return data
  },

  async getTransactionDocument(transactionNumber: string): Promise<AssetTransactionDocumentDetail> {
    const { data } = await api.get<AssetTransactionDocumentDetail>(`/assets/transactions/documents/${encodeURIComponent(transactionNumber)}`)
    return data
  },

  async getMeta(): Promise<AssetMeta> {
    const { data } = await api.get<AssetMeta>('/assets/meta')
    return data
  },

  async listCategories(): Promise<AssetCategoryMaster[]> {
    const { data } = await api.get<AssetCategoryMaster[]>('/assets/categories')
    return data
  },

  async createCategory(values: AssetCategoryInput): Promise<AssetCategoryMaster> {
    const { data } = await api.post<AssetCategoryMaster>('/assets/categories', values)
    return data
  },

  async updateCategory(id: number, values: AssetCategoryInput): Promise<AssetCategoryMaster> {
    const { data } = await api.patch<AssetCategoryMaster>(`/assets/categories/${id}`, values)
    return data
  },

  async removeCategory(id: number): Promise<void> {
    await api.delete(`/assets/categories/${id}`)
  },

  async listSubcategories(): Promise<AssetSubcategoryMaster[]> {
    const { data } = await api.get<AssetSubcategoryMaster[]>('/assets/subcategories')
    return data
  },

  async createSubcategory(values: AssetSubcategoryInput): Promise<AssetSubcategoryMaster> {
    const { data } = await api.post<AssetSubcategoryMaster>('/assets/subcategories', values)
    return data
  },

  async updateSubcategory(id: number, values: AssetSubcategoryInput): Promise<AssetSubcategoryMaster> {
    const { data } = await api.patch<AssetSubcategoryMaster>(`/assets/subcategories/${id}`, values)
    return data
  },

  async removeSubcategory(id: number): Promise<void> {
    await api.delete(`/assets/subcategories/${id}`)
  },

  async listVendors(): Promise<AssetVendorMaster[]> {
    const { data } = await api.get<AssetVendorMaster[]>('/assets/vendors')
    return data
  },

  async createVendor(values: AssetVendorInput): Promise<AssetVendorMaster> {
    const { data } = await api.post<AssetVendorMaster>('/assets/vendors', values)
    return data
  },

  async updateVendor(id: number, values: AssetVendorInput): Promise<AssetVendorMaster> {
    const { data } = await api.patch<AssetVendorMaster>(`/assets/vendors/${id}`, values)
    return data
  },

  async removeVendor(id: number): Promise<void> {
    await api.delete(`/assets/vendors/${id}`)
  },

  async listEmployees(): Promise<AssetEmployeeMaster[]> {
    const { data } = await api.get<AssetEmployeeMaster[]>('/assets/employees')
    return data
  },

  async createEmployee(values: AssetEmployeeInput): Promise<AssetEmployeeMaster> {
    const { data } = await api.post<AssetEmployeeMaster>('/assets/employees', values)
    return data
  },

  async updateEmployee(id: number, values: AssetEmployeeInput): Promise<AssetEmployeeMaster> {
    const { data } = await api.patch<AssetEmployeeMaster>(`/assets/employees/${id}`, values)
    return data
  },

  async removeEmployee(id: number): Promise<void> {
    await api.delete(`/assets/employees/${id}`)
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/assets/${encodeURIComponent(id)}/`)
  },

  async getDashboardSummary(): Promise<AssetDashboardSummary> {
    return summarizeAssets(await this.list())
  },

  async getAttentionList(limit = 5): Promise<AssetRecord[]> {
    return (await this.list()).filter((asset) => {
      const status = getExpiryStatus(asset.expiryDate)
      return status === 'Expired' || status === 'Expiring Soon'
    }).slice(0, limit)
  },

  getDefaultFormValues(): AssetFormValues {
    return createEmptyAssetFormValues()
  },
}

export default assetService
