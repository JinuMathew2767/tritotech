import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Save,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Upload,
  Trash2,
  Pencil,
  FolderTree,
  RotateCcw,
  Layers3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import categoryService, { type Category } from '@/services/categoryService'
import departmentService, { type DepartmentMaster } from '@/services/departmentService'
import subcategoryService, { type Subcategory } from '@/services/subcategoryService'
import { DEFAULT_BRANDING_SETTINGS, getBrandingSettings, saveBrandingSettings } from '@/services/brandingService'
import assetService, {
  type AssetCategoryMaster,
  type AssetDepartmentMaster,
  type AssetEmployeeMaster,
  type AssetSubcategoryMaster,
  type AssetVendorMaster,
} from '@/modules/it-asset-management/services/assetService'

const sections = ['General', 'Masters', 'Authentication', 'Notifications', 'Maintenance', 'Security']
const masterTabs = ['categories', 'subcategories', 'assetCategories', 'assetSubcategories', 'assetVendors', 'departments', 'assetEmployees'] as const
const MAX_LOGO_SIZE_BYTES = 1024 * 1024

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read the selected file'))
    reader.readAsDataURL(file)
  })

const sortCategories = (items: Category[]) => [...items].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name))
const sortDepartments = (items: DepartmentMaster[]) =>
  [...items].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name))
const sortSubcategories = (items: Subcategory[]) =>
  [...items].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.category_name.localeCompare(b.category_name) || a.name.localeCompare(b.name))

export default function AdminSettings() {
  const branding = getBrandingSettings()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const categoryEditorRef = useRef<HTMLDivElement | null>(null)
  const assetCategoryEditorRef = useRef<HTMLDivElement | null>(null)
  const assetSubcategoryEditorRef = useRef<HTMLDivElement | null>(null)
  const assetVendorEditorRef = useRef<HTMLDivElement | null>(null)
  const departmentEditorRef = useRef<HTMLDivElement | null>(null)
  const subcategoryEditorRef = useRef<HTMLDivElement | null>(null)
  const employeeEditorRef = useRef<HTMLDivElement | null>(null)
  const [activeSection, setActiveSection] = useState('General')
  const [activeMasterTab, setActiveMasterTab] = useState<(typeof masterTabs)[number]>('categories')
  const [appName, setAppName] = useState(branding.appName)
  const [timezone, setTimezone] = useState(branding.timezone)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(branding.logoDataUrl)
  const [logoFileName, setLogoFileName] = useState(branding.logoDataUrl ? 'Current saved logo' : '')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [googleSignIn, setGoogleSignIn] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [ipWhitelist, setIpWhitelist] = useState(['192.168.1.0/24'])
  const [newIp, setNewIp] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categorySaving, setCategorySaving] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryActive, setCategoryActive] = useState(true)

  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(true)
  const [subcategorySaving, setSubcategorySaving] = useState(false)
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null)
  const [subcategoryName, setSubcategoryName] = useState('')
  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState('')
  const [subcategoryActive, setSubcategoryActive] = useState(true)

  const [assetCategories, setAssetCategories] = useState<AssetCategoryMaster[]>([])
  const [assetCategoriesLoading, setAssetCategoriesLoading] = useState(true)
  const [assetCategorySaving, setAssetCategorySaving] = useState(false)
  const [editingAssetCategoryId, setEditingAssetCategoryId] = useState<number | null>(null)
  const [assetCategoryName, setAssetCategoryName] = useState('')
  const [assetCategoryDescription, setAssetCategoryDescription] = useState('')
  const [assetCategoryActive, setAssetCategoryActive] = useState(true)

  const [assetSubcategories, setAssetSubcategories] = useState<AssetSubcategoryMaster[]>([])
  const [assetSubcategoriesLoading, setAssetSubcategoriesLoading] = useState(true)
  const [assetSubcategorySaving, setAssetSubcategorySaving] = useState(false)
  const [editingAssetSubcategoryId, setEditingAssetSubcategoryId] = useState<number | null>(null)
  const [assetSubcategoryName, setAssetSubcategoryName] = useState('')
  const [assetSubcategoryCategoryId, setAssetSubcategoryCategoryId] = useState('')
  const [assetSubcategoryActive, setAssetSubcategoryActive] = useState(true)

  const [assetVendors, setAssetVendors] = useState<AssetVendorMaster[]>([])
  const [assetVendorsLoading, setAssetVendorsLoading] = useState(true)
  const [assetVendorSaving, setAssetVendorSaving] = useState(false)
  const [editingAssetVendorId, setEditingAssetVendorId] = useState<number | null>(null)
  const [assetVendorName, setAssetVendorName] = useState('')
  const [assetVendorErpCode, setAssetVendorErpCode] = useState('')

  const [departments, setDepartments] = useState<DepartmentMaster[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentSaving, setDepartmentSaving] = useState(false)
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null)
  const [departmentName, setDepartmentName] = useState('')
  const [departmentLocation, setDepartmentLocation] = useState('')
  const [departmentActive, setDepartmentActive] = useState(true)

  const [assetDepartments, setAssetDepartments] = useState<AssetDepartmentMaster[]>([])
  const [assetEmployees, setAssetEmployees] = useState<AssetEmployeeMaster[]>([])
  const [assetEmployeesLoading, setAssetEmployeesLoading] = useState(true)
  const [assetEmployeeSaving, setAssetEmployeeSaving] = useState(false)
  const [editingAssetEmployeeId, setEditingAssetEmployeeId] = useState<number | null>(null)
  const [assetEmployeeCode, setAssetEmployeeCode] = useState('')
  const [assetEmployeeName, setAssetEmployeeName] = useState('')
  const [assetEmployeeEmail, setAssetEmployeeEmail] = useState('')
  const [assetEmployeeDepartmentId, setAssetEmployeeDepartmentId] = useState('')

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true)
      setCategories(sortCategories(await categoryService.list(true)))
    } catch {
      toast.error('Failed to load categories')
    } finally {
      setCategoriesLoading(false)
    }
  }

  const loadSubcategories = async () => {
    try {
      setSubcategoriesLoading(true)
      setSubcategories(sortSubcategories(await subcategoryService.list({ include_inactive: true })))
    } catch {
      toast.error('Failed to load subcategories')
    } finally {
      setSubcategoriesLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true)
      setDepartments(sortDepartments(await departmentService.list(true)))
    } catch {
      toast.error('Failed to load departments')
    } finally {
      setDepartmentsLoading(false)
    }
  }

  const loadAssetCategories = async () => {
    try {
      setAssetCategoriesLoading(true)
      setAssetCategories(await assetService.listCategories())
    } catch {
      toast.error('Failed to load asset categories')
    } finally {
      setAssetCategoriesLoading(false)
    }
  }

  const loadAssetSubcategories = async () => {
    try {
      setAssetSubcategoriesLoading(true)
      setAssetSubcategories(await assetService.listSubcategories())
    } catch {
      toast.error('Failed to load asset subcategories')
    } finally {
      setAssetSubcategoriesLoading(false)
    }
  }

  const loadAssetVendors = async () => {
    try {
      setAssetVendorsLoading(true)
      setAssetVendors(await assetService.listVendors())
    } catch {
      toast.error('Failed to load asset vendors')
    } finally {
      setAssetVendorsLoading(false)
    }
  }

  const loadAssetMasters = async () => {
    try {
      setAssetEmployeesLoading(true)
      const [meta, employees] = await Promise.all([assetService.getMeta(), assetService.listEmployees()])
      setAssetDepartments(meta.departments)
      setAssetEmployees(employees)
    } catch {
      toast.error('Failed to load asset employee master')
    } finally {
      setAssetEmployeesLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
    void loadSubcategories()
    void loadAssetCategories()
    void loadAssetSubcategories()
    void loadAssetVendors()
    void loadDepartments()
    void loadAssetMasters()
  }, [])

  const resetCategoryForm = () => {
    setEditingCategoryId(null)
    setCategoryName('')
    setCategoryDescription('')
    setCategoryActive(true)
  }

  const resetSubcategoryForm = (nextCategoryId = '') => {
    setEditingSubcategoryId(null)
    setSubcategoryName('')
    setSubcategoryCategoryId(nextCategoryId)
    setSubcategoryActive(true)
  }

  const resetAssetCategoryForm = () => {
    setEditingAssetCategoryId(null)
    setAssetCategoryName('')
    setAssetCategoryDescription('')
    setAssetCategoryActive(true)
  }

  const resetAssetSubcategoryForm = (nextCategoryId = '') => {
    setEditingAssetSubcategoryId(null)
    setAssetSubcategoryName('')
    setAssetSubcategoryCategoryId(nextCategoryId)
    setAssetSubcategoryActive(true)
  }

  const resetAssetVendorForm = () => {
    setEditingAssetVendorId(null)
    setAssetVendorName('')
    setAssetVendorErpCode('')
  }

  const resetDepartmentForm = () => {
    setEditingDepartmentId(null)
    setDepartmentName('')
    setDepartmentLocation('')
    setDepartmentActive(true)
  }

  const resetAssetEmployeeForm = () => {
    setEditingAssetEmployeeId(null)
    setAssetEmployeeCode('')
    setAssetEmployeeName('')
    setAssetEmployeeEmail('')
    setAssetEmployeeDepartmentId('')
  }

  const saveBranding = () => {
    try {
      saveBrandingSettings({
        appName: appName.trim() || DEFAULT_BRANDING_SETTINGS.appName,
        timezone,
        logoDataUrl,
      })
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save branding settings')
    }
  }

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file')
    if (file.size > MAX_LOGO_SIZE_BYTES) return toast.error('Logo must be 1 MB or smaller')

    try {
      setLogoDataUrl(await fileToDataUrl(file))
      setLogoFileName(file.name)
      toast.success('Logo ready to save')
    } catch {
      toast.error('Failed to load the selected image')
    }
  }

  const handleCategorySubmit = async () => {
    if (!categoryName.trim()) return toast.error('Category name is required')
    try {
      setCategorySaving(true)
      if (editingCategoryId) {
        await categoryService.update(editingCategoryId, {
          name: categoryName.trim(),
          description: categoryDescription.trim() || null,
          is_active: categoryActive,
        })
      } else {
        await categoryService.create({ name: categoryName.trim(), description: categoryDescription.trim() || null })
      }
      toast.success(editingCategoryId ? 'Category updated' : 'Category created')
      resetCategoryForm()
      await loadCategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save category')
    } finally {
      setCategorySaving(false)
    }
  }

  const handleSubcategorySubmit = async () => {
    const parentId = Number(subcategoryCategoryId)
    if (!subcategoryName.trim()) return toast.error('Subcategory name is required')
    if (!Number.isInteger(parentId) || parentId < 1) return toast.error('Please choose a parent category')
    try {
      setSubcategorySaving(true)
      if (editingSubcategoryId) {
        await subcategoryService.update(editingSubcategoryId, {
          category_id: parentId,
          name: subcategoryName.trim(),
          is_active: subcategoryActive,
        })
      } else {
        await subcategoryService.create({ category_id: parentId, name: subcategoryName.trim() })
      }
      toast.success(editingSubcategoryId ? 'Subcategory updated' : 'Subcategory created')
      resetSubcategoryForm(editingSubcategoryId ? '' : String(parentId))
      await loadSubcategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save subcategory')
    } finally {
      setSubcategorySaving(false)
    }
  }

  const handleDepartmentSubmit = async () => {
    if (!departmentName.trim()) return toast.error('Department name is required')

    try {
      setDepartmentSaving(true)
      const payload = {
        name: departmentName.trim(),
        location: departmentLocation.trim(),
        is_active: departmentActive,
      }

      if (editingDepartmentId) {
        await departmentService.update(editingDepartmentId, payload)
      } else {
        await departmentService.create(payload)
      }

      toast.success(editingDepartmentId ? 'Department updated' : 'Department created')
      resetDepartmentForm()
      await loadDepartments()
      await loadAssetMasters()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save department')
    } finally {
      setDepartmentSaving(false)
    }
  }

  const handleAssetCategorySubmit = async () => {
    if (!assetCategoryName.trim()) return toast.error('Asset category name is required')

    try {
      setAssetCategorySaving(true)
      const payload = {
        name: assetCategoryName.trim(),
        description: assetCategoryDescription.trim(),
        isActive: assetCategoryActive,
      }

      if (editingAssetCategoryId) {
        await assetService.updateCategory(editingAssetCategoryId, payload)
      } else {
        await assetService.createCategory(payload)
      }

      toast.success(editingAssetCategoryId ? 'Asset category updated' : 'Asset category created')
      resetAssetCategoryForm()
      await loadAssetCategories()
      await loadAssetSubcategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save asset category')
    } finally {
      setAssetCategorySaving(false)
    }
  }

  const handleAssetSubcategorySubmit = async () => {
    const parentId = Number(assetSubcategoryCategoryId)
    if (!assetSubcategoryName.trim()) return toast.error('Asset subcategory name is required')
    if (!Number.isInteger(parentId) || parentId < 1) return toast.error('Please choose a parent asset category')

    try {
      setAssetSubcategorySaving(true)
      const payload = {
        categoryId: parentId,
        name: assetSubcategoryName.trim(),
        isActive: assetSubcategoryActive,
      }

      if (editingAssetSubcategoryId) {
        await assetService.updateSubcategory(editingAssetSubcategoryId, payload)
      } else {
        await assetService.createSubcategory(payload)
      }

      toast.success(editingAssetSubcategoryId ? 'Asset subcategory updated' : 'Asset subcategory created')
      resetAssetSubcategoryForm(editingAssetSubcategoryId ? '' : String(parentId))
      await loadAssetSubcategories()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save asset subcategory')
    } finally {
      setAssetSubcategorySaving(false)
    }
  }

  const handleAssetVendorSubmit = async () => {
    if (!assetVendorName.trim()) return toast.error('Vendor name is required')

    try {
      setAssetVendorSaving(true)
      const payload = {
        vendorName: assetVendorName.trim(),
        erpVendorCode: assetVendorErpCode.trim(),
      }

      if (editingAssetVendorId) {
        await assetService.updateVendor(editingAssetVendorId, payload)
      } else {
        await assetService.createVendor(payload)
      }

      toast.success(editingAssetVendorId ? 'Asset vendor updated' : 'Asset vendor created')
      resetAssetVendorForm()
      await loadAssetVendors()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save asset vendor')
    } finally {
      setAssetVendorSaving(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    const confirmed = window.confirm(
      `Delete "${category.name}" from active use? Existing tickets and routing history will be preserved.`
    )
    if (!confirmed) return

    try {
      await categoryService.remove(category.id)
      toast.success('Category removed from the active list')
      await loadCategories()
      await loadSubcategories()
      if (editingCategoryId === category.id) resetCategoryForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete category')
    }
  }

  const handleDeleteAssetCategory = async (category: AssetCategoryMaster) => {
    const confirmed = window.confirm(
      `Delete "${category.name}" from active asset use? Existing asset records will keep their history.`
    )
    if (!confirmed) return

    try {
      await assetService.removeCategory(category.id)
      toast.success('Asset category removed from the active list')
      await loadAssetCategories()
      await loadAssetSubcategories()
      if (editingAssetCategoryId === category.id) resetAssetCategoryForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete asset category')
    }
  }

  const handleDeleteAssetSubcategory = async (subcategory: AssetSubcategoryMaster) => {
    const confirmed = window.confirm(
      `Delete "${subcategory.name}" from active asset use? Existing asset records will keep their history.`
    )
    if (!confirmed) return

    try {
      await assetService.removeSubcategory(subcategory.id)
      toast.success('Asset subcategory removed from the active list')
      await loadAssetSubcategories()
      if (editingAssetSubcategoryId === subcategory.id) resetAssetSubcategoryForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete asset subcategory')
    }
  }

  const handleDeleteAssetVendor = async (vendor: AssetVendorMaster) => {
    const confirmed = window.confirm(`Delete "${vendor.vendorName}" from the asset vendor master?`)
    if (!confirmed) return

    try {
      await assetService.removeVendor(vendor.id)
      toast.success('Asset vendor removed')
      await loadAssetVendors()
      if (editingAssetVendorId === vendor.id) resetAssetVendorForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete asset vendor')
    }
  }

  const handleDeleteDepartment = async (department: DepartmentMaster) => {
    const confirmed = window.confirm(
      `Delete "${department.name}" from active use? Existing tickets, users, and asset employee links will be preserved.`
    )
    if (!confirmed) return

    try {
      await departmentService.remove(department.id)
      toast.success('Department removed from the active list')
      await loadDepartments()
      await loadAssetMasters()
      if (editingDepartmentId === department.id) resetDepartmentForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete department')
    }
  }

  const handleDeleteSubcategory = async (subcategory: Subcategory) => {
    const confirmed = window.confirm(
      `Delete "${subcategory.name}" from active use? Existing tickets will keep their history.`
    )
    if (!confirmed) return

    try {
      await subcategoryService.remove(subcategory.id)
      toast.success('Subcategory removed from the active list')
      await loadSubcategories()
      if (editingSubcategoryId === subcategory.id) resetSubcategoryForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete subcategory')
    }
  }

  const beginCategoryEdit = (category: Category) => {
    setActiveSection('Masters')
    setActiveMasterTab('categories')
    setEditingCategoryId(category.id)
    setCategoryName(category.name)
    setCategoryDescription(category.description || '')
    setCategoryActive(category.is_active)
    categoryEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${category.name}`)
  }

  const beginDepartmentEdit = (department: DepartmentMaster) => {
    setActiveSection('Masters')
    setActiveMasterTab('departments')
    setEditingDepartmentId(department.id)
    setDepartmentName(department.name)
    setDepartmentLocation(department.location || '')
    setDepartmentActive(department.is_active)
    departmentEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${department.name}`)
  }

  const beginSubcategoryEdit = (subcategory: Subcategory) => {
    setActiveSection('Masters')
    setActiveMasterTab('subcategories')
    setEditingSubcategoryId(subcategory.id)
    setSubcategoryName(subcategory.name)
    setSubcategoryCategoryId(String(subcategory.category_id))
    setSubcategoryActive(subcategory.is_active)
    subcategoryEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${subcategory.name}`)
  }

  const beginAssetCategoryEdit = (category: AssetCategoryMaster) => {
    setActiveSection('Masters')
    setActiveMasterTab('assetCategories')
    setEditingAssetCategoryId(category.id)
    setAssetCategoryName(category.name)
    setAssetCategoryDescription(category.description || '')
    setAssetCategoryActive(category.isActive)
    assetCategoryEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${category.name}`)
  }

  const beginAssetSubcategoryEdit = (subcategory: AssetSubcategoryMaster) => {
    setActiveSection('Masters')
    setActiveMasterTab('assetSubcategories')
    setEditingAssetSubcategoryId(subcategory.id)
    setAssetSubcategoryName(subcategory.name)
    setAssetSubcategoryCategoryId(String(subcategory.categoryId))
    setAssetSubcategoryActive(subcategory.isActive)
    assetSubcategoryEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${subcategory.name}`)
  }

  const beginAssetVendorEdit = (vendor: AssetVendorMaster) => {
    setActiveSection('Masters')
    setActiveMasterTab('assetVendors')
    setEditingAssetVendorId(vendor.id)
    setAssetVendorName(vendor.vendorName)
    setAssetVendorErpCode(vendor.erpVendorCode || '')
    assetVendorEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${vendor.vendorName}`)
  }

  const beginAssetEmployeeEdit = (employee: AssetEmployeeMaster) => {
    setActiveSection('Masters')
    setActiveMasterTab('assetEmployees')
    setEditingAssetEmployeeId(employee.id)
    setAssetEmployeeCode(employee.employeeCode)
    setAssetEmployeeName(employee.name)
    setAssetEmployeeEmail(employee.email || '')
    setAssetEmployeeDepartmentId(employee.departmentId ? String(employee.departmentId) : '')
    employeeEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.success(`Editing ${employee.name}`)
  }

  const handleAssetEmployeeSubmit = async () => {
    const departmentId = Number(assetEmployeeDepartmentId)

    if (!assetEmployeeCode.trim()) return toast.error('Employee code is required')
    if (!assetEmployeeName.trim()) return toast.error('Employee name is required')
    if (!Number.isInteger(departmentId) || departmentId < 1) return toast.error('Please choose a department')

    try {
      setAssetEmployeeSaving(true)
      const payload = {
        employeeCode: assetEmployeeCode.trim(),
        name: assetEmployeeName.trim(),
        email: assetEmployeeEmail.trim(),
        departmentId,
      }

      if (editingAssetEmployeeId) {
        await assetService.updateEmployee(editingAssetEmployeeId, payload)
      } else {
        await assetService.createEmployee(payload)
      }

      toast.success(editingAssetEmployeeId ? 'Asset employee updated' : 'Asset employee created')
      resetAssetEmployeeForm()
      await loadAssetMasters()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save asset employee')
    } finally {
      setAssetEmployeeSaving(false)
    }
  }

  const handleDeleteAssetEmployee = async (employee: AssetEmployeeMaster) => {
    const confirmed = window.confirm(`Delete "${employee.name}" from the asset employee master?`)
    if (!confirmed) return

    try {
      await assetService.removeEmployee(employee.id)
      toast.success('Asset employee removed')
      await loadAssetMasters()
      if (editingAssetEmployeeId === employee.id) resetAssetEmployeeForm()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete asset employee')
    }
  }

  const selectedAssetDepartment = assetDepartments.find((department) => department.id === Number(assetEmployeeDepartmentId))
  const selectableAssetCategories = assetCategories.filter((category) => category.isActive || category.id === Number(assetSubcategoryCategoryId))

  return (
    <div className="page-shell">
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]">
              <FolderTree className="h-3.5 w-3.5" />
              Platform Control
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Manage branding, masters, and supporting platform options with the same glass-surface theme used across the rest of the admin console.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/82 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {activeSection}
            </span>
            {activeSection === 'General' ? (
              <button onClick={saveBranding} className="btn-primary gap-2 text-sm">
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex h-full gap-4">
      <div className="hidden w-52 flex-shrink-0 flex-col space-y-0.5 rounded-[22px] border border-white/60 bg-white/72 p-3 backdrop-blur-xl md:flex">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              activeSection === section ? 'bg-[#4E5A7A]/10 text-[#4E5A7A]' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      <div className="max-w-6xl flex-1 overflow-y-auto rounded-[24px] border border-white/60 bg-white/40 p-4 backdrop-blur-sm md:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeSection === 'Masters'
                ? 'Manage ticket and asset masters including categories, subcategories, vendors, departments, and asset employees.'
                : 'Configure branding and platform preferences.'}
            </p>
          </div>
          {activeSection !== 'General' && activeSection === 'Masters' ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Changes save immediately</span>
          ) : null}
        </div>

        {activeSection === 'General' && (
          <div className="space-y-5">
            <div>
              <label className="label">Application Name</label>
              <input className="input" value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {['Asia/Dubai', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Kolkata'].map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
              <p className="mb-3 text-sm text-slate-500">Company Logo</p>
              {logoDataUrl ? (
                <div className="space-y-3">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <img src={logoDataUrl} alt="Company logo preview" className="h-full w-full object-contain" />
                  </div>
                  <p className="truncate text-xs text-slate-500">{logoFileName || 'Selected logo'}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary gap-2 text-xs">
                      <Upload className="h-3.5 w-3.5" />
                      Replace Logo
                    </button>
                    <button type="button" onClick={() => { setLogoDataUrl(null); setLogoFileName('') }} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary gap-2 text-xs">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Logo
                </button>
              )}
            </div>
          </div>
        )}

        {activeSection === 'Masters' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {masterTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveMasterTab(tab)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                    activeMasterTab === tab ? 'bg-[#4E5A7A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'categories'
                    ? 'Concern Categories'
                    : tab === 'subcategories'
                      ? 'Subcategories'
                      : tab === 'assetCategories'
                        ? 'Asset Categories'
                        : tab === 'assetSubcategories'
                          ? 'Asset Subcategories'
                          : tab === 'assetVendors'
                            ? 'Asset Vendors'
                      : tab === 'departments'
                        ? 'Departments'
                        : 'Asset Employees'}
                </button>
              ))}
            </div>

            {activeMasterTab === 'categories' && (
              <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div ref={categoryEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingCategoryId ? 'Edit Category' : 'Add Category'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Create concern categories like ERP, Network, Hardware, and Access.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><FolderTree className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <label className="label">Category Name</label>
                    <input className="input" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="ERP Related" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea className="input min-h-[96px] resize-none" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="Optional guidance for admins and requesters." />
                  </div>
                  {editingCategoryId && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Category Active</p>
                        <p className="text-xs text-slate-500">Inactive categories disappear from new ticket selections.</p>
                      </div>
                      <button type="button" onClick={() => setCategoryActive((current) => !current)}>
                        {categoryActive ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleCategorySubmit} disabled={categorySaving} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {categorySaving ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Add Category'}
                    </button>
                    {editingCategoryId && (
                      <button type="button" onClick={resetCategoryForm} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Category Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{categories.length} total</span>
                  </div>
                  <div className="space-y-3">
                    {categoriesLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading categories...</div>
                    ) : categories.map((category) => (
                      <div key={category.id} className={`rounded-2xl border p-4 ${category.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{category.name}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${category.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{category.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{category.description || 'No description provided.'}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{category.ticket_count} tickets</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{category.subcategory_count} subcategories</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{category.routing_rule_count} rules</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => beginCategoryEdit(category)} className="btn-secondary gap-2 text-xs">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {!category.is_active && (
                              <button type="button" onClick={async () => { await categoryService.update(category.id, { name: category.name, description: category.description, is_active: true }); await loadCategories(); toast.success('Category restored') }} className="btn-secondary gap-2 text-xs">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </button>
                            )}
                            <button type="button" onClick={async () => handleDeleteCategory(category)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeMasterTab === 'subcategories' && (
              <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div ref={subcategoryEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingSubcategoryId ? 'Edit Subcategory' : 'Add Subcategory'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Create subcategories or modules under any concern category.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><Layers3 className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <label className="label">Parent Category</label>
                    <select className="input" value={subcategoryCategoryId} onChange={(e) => setSubcategoryCategoryId(e.target.value)} disabled={categories.length === 0}>
                      <option value="">Select...</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}{category.is_active ? '' : ' (Inactive)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Subcategory Name</label>
                    <input className="input" value={subcategoryName} onChange={(e) => setSubcategoryName(e.target.value)} placeholder="FACTS ERP" />
                  </div>
                  {editingSubcategoryId && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Subcategory Active</p>
                        <p className="text-xs text-slate-500">Inactive subcategories disappear from new ticket selections.</p>
                      </div>
                      <button type="button" onClick={() => setSubcategoryActive((current) => !current)}>
                        {subcategoryActive ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleSubcategorySubmit} disabled={subcategorySaving || categories.length === 0} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {subcategorySaving ? 'Saving...' : editingSubcategoryId ? 'Update Subcategory' : 'Add Subcategory'}
                    </button>
                    {editingSubcategoryId && (
                      <button type="button" onClick={() => resetSubcategoryForm()} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                  {categories.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Create at least one category before adding subcategories.
                    </div>
                  )}
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Subcategory Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{subcategories.length} total</span>
                  </div>
                  <div className="space-y-3">
                    {subcategoriesLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading subcategories...</div>
                    ) : subcategories.map((subcategory) => (
                      <div key={subcategory.id} className={`rounded-2xl border p-4 ${subcategory.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{subcategory.name}</h3>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{subcategory.category_name}</span>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${subcategory.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{subcategory.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{subcategory.ticket_count} tickets</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => beginSubcategoryEdit(subcategory)} className="btn-secondary gap-2 text-xs">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {!subcategory.is_active && (
                              <button type="button" onClick={async () => { await subcategoryService.update(subcategory.id, { category_id: subcategory.category_id, name: subcategory.name, is_active: true }); await loadSubcategories(); toast.success('Subcategory restored') }} className="btn-secondary gap-2 text-xs">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </button>
                            )}
                            <button type="button" onClick={async () => handleDeleteSubcategory(subcategory)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeMasterTab === 'assetCategories' && (
              <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div ref={assetCategoryEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingAssetCategoryId ? 'Edit Asset Category' : 'Add Asset Category'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Create reusable asset classifications like Hardware, Software, Cloud, or any category your asset register needs.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><Layers3 className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <label className="label">Category Name</label>
                    <input className="input" value={assetCategoryName} onChange={(e) => setAssetCategoryName(e.target.value)} placeholder="Hardware" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea className="input min-h-[96px] resize-none" value={assetCategoryDescription} onChange={(e) => setAssetCategoryDescription(e.target.value)} placeholder="Optional helper description for admins." />
                  </div>
                  {editingAssetCategoryId && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Category Active</p>
                        <p className="text-xs text-slate-500">Inactive asset categories disappear from create and edit forms.</p>
                      </div>
                      <button type="button" onClick={() => setAssetCategoryActive((current) => !current)}>
                        {assetCategoryActive ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAssetCategorySubmit} disabled={assetCategorySaving} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {assetCategorySaving ? 'Saving...' : editingAssetCategoryId ? 'Update Asset Category' : 'Add Asset Category'}
                    </button>
                    {editingAssetCategoryId && (
                      <button type="button" onClick={resetAssetCategoryForm} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Asset Category Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{assetCategories.length} total</span>
                  </div>
                  <div className="space-y-3">
                    {assetCategoriesLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading asset categories...</div>
                    ) : assetCategories.map((category) => (
                      <div key={category.id} className={`rounded-2xl border p-4 ${category.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{category.name}</h3>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${category.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{category.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{category.description || 'No description provided.'}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{category.assetCount} assets</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{category.subcategoryCount} active subcategories</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => beginAssetCategoryEdit(category)} className="btn-secondary gap-2 text-xs">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {!category.isActive && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await assetService.updateCategory(category.id, {
                                    name: category.name,
                                    description: category.description,
                                    isActive: true,
                                  })
                                  await loadAssetCategories()
                                  toast.success('Asset category restored')
                                }}
                                className="btn-secondary gap-2 text-xs"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </button>
                            )}
                            {category.isActive && (
                              <button type="button" onClick={() => void handleDeleteAssetCategory(category)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeMasterTab === 'assetSubcategories' && (
              <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div ref={assetSubcategoryEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingAssetSubcategoryId ? 'Edit Asset Subcategory' : 'Add Asset Subcategory'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Create dependent asset subcategories so users can pick only the right options for each asset category.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><Layers3 className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <label className="label">Parent Asset Category</label>
                    <select className="input" value={assetSubcategoryCategoryId} onChange={(e) => setAssetSubcategoryCategoryId(e.target.value)} disabled={selectableAssetCategories.length === 0}>
                      <option value="">Select...</option>
                      {selectableAssetCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}{category.isActive ? '' : ' (Inactive)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Subcategory Name</label>
                    <input className="input" value={assetSubcategoryName} onChange={(e) => setAssetSubcategoryName(e.target.value)} placeholder="Laptop" />
                  </div>
                  {editingAssetSubcategoryId && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Subcategory Active</p>
                        <p className="text-xs text-slate-500">Inactive asset subcategories disappear from asset creation and edit forms.</p>
                      </div>
                      <button type="button" onClick={() => setAssetSubcategoryActive((current) => !current)}>
                        {assetSubcategoryActive ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAssetSubcategorySubmit} disabled={assetSubcategorySaving || selectableAssetCategories.length === 0} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {assetSubcategorySaving ? 'Saving...' : editingAssetSubcategoryId ? 'Update Asset Subcategory' : 'Add Asset Subcategory'}
                    </button>
                    {editingAssetSubcategoryId && (
                      <button type="button" onClick={() => resetAssetSubcategoryForm()} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Asset Subcategory Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{assetSubcategories.length} total</span>
                  </div>
                  <div className="space-y-3">
                    {assetSubcategoriesLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading asset subcategories...</div>
                    ) : assetSubcategories.map((subcategory) => (
                      <div key={subcategory.id} className={`rounded-2xl border p-4 ${subcategory.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{subcategory.name}</h3>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{subcategory.categoryName}</span>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${subcategory.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{subcategory.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{subcategory.assetCount} assets</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => beginAssetSubcategoryEdit(subcategory)} className="btn-secondary gap-2 text-xs">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {!subcategory.isActive && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await assetService.updateSubcategory(subcategory.id, {
                                    categoryId: subcategory.categoryId,
                                    name: subcategory.name,
                                    isActive: true,
                                  })
                                  await loadAssetSubcategories()
                                  toast.success('Asset subcategory restored')
                                }}
                                className="btn-secondary gap-2 text-xs"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </button>
                            )}
                            {subcategory.isActive && (
                              <button type="button" onClick={() => void handleDeleteAssetSubcategory(subcategory)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeMasterTab === 'assetVendors' && (
              <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div ref={assetVendorEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingAssetVendorId ? 'Edit Asset Vendor' : 'Add Asset Vendor'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Maintain a reusable vendor list for asset creation and reporting.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><Layers3 className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <label className="label">Vendor Name</label>
                    <input className="input" value={assetVendorName} onChange={(e) => setAssetVendorName(e.target.value)} placeholder="Dell" />
                  </div>
                  <div>
                    <label className="label">ERP Vendor Code</label>
                    <input className="input" value={assetVendorErpCode} onChange={(e) => setAssetVendorErpCode(e.target.value)} placeholder="ERP-DEL-001" />
                    <p className="mt-1 text-xs text-slate-400">Use this to store the vendor account or mapping code from your ERP system.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAssetVendorSubmit} disabled={assetVendorSaving} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {assetVendorSaving ? 'Saving...' : editingAssetVendorId ? 'Update Vendor' : 'Add Vendor'}
                    </button>
                    {editingAssetVendorId && (
                      <button type="button" onClick={resetAssetVendorForm} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Asset Vendor Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{assetVendors.length} total</span>
                  </div>
                  <div className="space-y-3">
                    {assetVendorsLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading asset vendors...</div>
                    ) : assetVendors.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-400">
                        No asset vendors added yet. Create the first vendor on the left.
                      </div>
                    ) : (
                      assetVendors.map((vendor) => (
                        <div key={vendor.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900">{vendor.vendorName}</h3>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Vendor ID {vendor.id}</span>
                                {vendor.erpVendorCode ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">ERP {vendor.erpVendorCode}</span>
                                ) : null}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{vendor.assetCount} assets</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => beginAssetVendorEdit(vendor)} className="btn-secondary gap-2 text-xs">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button type="button" onClick={() => void handleDeleteAssetVendor(vendor)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeMasterTab === 'departments' && (
              <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <div ref={departmentEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingDepartmentId ? 'Edit Department' : 'Add Department'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Maintain business departments and their default locations for asset issue, transfer, and reporting flows.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><Layers3 className="h-5 w-5" /></div>
                  </div>

                  <div>
                    <label className="label">Department Name</label>
                    <input className="input" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Finance" />
                  </div>

                  <div>
                    <label className="label">Location</label>
                    <input className="input" value={departmentLocation} onChange={(e) => setDepartmentLocation(e.target.value)} placeholder="Head Office - Level 2" />
                    <p className="mt-1 text-xs text-slate-400">This location becomes the default reference used by the asset employee and transaction masters.</p>
                  </div>

                  {editingDepartmentId && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Department Active</p>
                        <p className="text-xs text-slate-500">Inactive departments stay in history but disappear from new asset allocations.</p>
                      </div>
                      <button type="button" onClick={() => setDepartmentActive((current) => !current)}>
                        {departmentActive ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleDepartmentSubmit} disabled={departmentSaving} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {departmentSaving ? 'Saving...' : editingDepartmentId ? 'Update Department' : 'Add Department'}
                    </button>
                    {editingDepartmentId && (
                      <button type="button" onClick={resetDepartmentForm} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Department Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{departments.length} total</span>
                  </div>

                  <div className="space-y-3">
                    {departmentsLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading departments...</div>
                    ) : departments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-400">
                        No departments found. Add the first department on the left to enable employee and asset location masters.
                      </div>
                    ) : (
                      departments.map((department) => (
                        <div key={department.id} className={`rounded-2xl border p-4 ${department.is_active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900">{department.name}</h3>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${department.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{department.is_active ? 'Active' : 'Inactive'}</span>
                                {department.location ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{department.location}</span>
                                ) : null}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{department.user_count} portal users</span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{department.employee_count} asset employees</span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{department.ticket_count} tickets</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => beginDepartmentEdit(department)} className="btn-secondary gap-2 text-xs">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              {!department.is_active && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await departmentService.update(department.id, {
                                      name: department.name,
                                      location: department.location,
                                      is_active: true,
                                    })
                                    await loadDepartments()
                                    await loadAssetMasters()
                                    toast.success('Department restored')
                                  }}
                                  className="btn-secondary gap-2 text-xs"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Restore
                                </button>
                              )}
                              {department.is_active && (
                                <button type="button" onClick={() => void handleDeleteDepartment(department)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeMasterTab === 'assetEmployees' && (
              <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div ref={employeeEditorRef} className="card p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{editingAssetEmployeeId ? 'Edit Asset Employee' : 'Add Asset Employee'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Maintain a dedicated employee master for asset issue and transfer workflows without depending on portal login users.</p>
                    </div>
                    <div className="rounded-2xl bg-[#4E5A7A]/10 p-2 text-[#4E5A7A]"><Layers3 className="h-5 w-5" /></div>
                  </div>

                  <div>
                    <label className="label">Employee Code</label>
                    <input className="input" value={assetEmployeeCode} onChange={(e) => setAssetEmployeeCode(e.target.value)} placeholder="EMP-1001" />
                  </div>

                  <div>
                    <label className="label">Employee Name</label>
                    <input className="input" value={assetEmployeeName} onChange={(e) => setAssetEmployeeName(e.target.value)} placeholder="John Doe" />
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" value={assetEmployeeEmail} onChange={(e) => setAssetEmployeeEmail(e.target.value)} placeholder="john.doe@company.com" />
                  </div>

                  <div>
                    <label className="label">Department</label>
                    <select className="input" value={assetEmployeeDepartmentId} onChange={(e) => setAssetEmployeeDepartmentId(e.target.value)} disabled={assetDepartments.length === 0}>
                      <option value="">Select...</option>
                      {assetDepartments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}{department.location ? ` - ${department.location}` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedAssetDepartment?.location ? (
                      <p className="mt-1 text-xs text-slate-400">Location from department master: {selectedAssetDepartment.location}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAssetEmployeeSubmit} disabled={assetEmployeeSaving || assetDepartments.length === 0} className="btn-primary gap-2 text-sm">
                      <Save className="h-4 w-4" />
                      {assetEmployeeSaving ? 'Saving...' : editingAssetEmployeeId ? 'Update Employee' : 'Add Employee'}
                    </button>
                    {editingAssetEmployeeId && (
                      <button type="button" onClick={resetAssetEmployeeForm} className="btn-secondary gap-2 text-sm">
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>

                  {assetDepartments.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      No active departments are available. Configure departments first so employees can inherit a valid location.
                    </div>
                  )}
                </div>

                <div className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-slate-900">Asset Employee Master</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{assetEmployees.filter((employee) => employee.isActive).length} active</span>
                  </div>

                  <div className="space-y-3">
                    {assetEmployeesLoading ? (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading asset employees...</div>
                    ) : assetEmployees.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-400">
                        No asset employees created yet. Add your first employee master record on the left.
                      </div>
                    ) : (
                      assetEmployees.map((employee) => (
                        <div key={employee.id} className={`rounded-2xl border p-4 ${employee.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/80'}`}>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900">{employee.name}</h3>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{employee.employeeCode}</span>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${employee.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{employee.isActive ? 'Active' : 'Inactive'}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">{employee.email || 'No email provided'}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{employee.department || 'No department'}</span>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{employee.location || 'No location'}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => beginAssetEmployeeEdit(employee)} className="btn-secondary gap-2 text-xs">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              {employee.isActive && (
                                <button type="button" onClick={() => void handleDeleteAssetEmployee(employee)} className="btn-secondary gap-2 text-xs text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'Authentication' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm font-medium text-slate-800">Google / Gmail Sign-in</span>
              <button onClick={() => setGoogleSignIn((current) => !current)}>
                {googleSignIn ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'Notifications' && (
          <div className="rounded-xl bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts((current) => !current)} className="h-4 w-4 accent-[#4E5A7A]" />
              Status Change Alerts
            </label>
          </div>
        )}

        {activeSection === 'Maintenance' && (
          <div className={`rounded-xl p-4 ${maintenanceMode ? 'border border-amber-200 bg-amber-50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${maintenanceMode ? 'text-amber-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
                  <p className="text-xs text-slate-500">When active, users see a maintenance page.</p>
                </div>
              </div>
              <button onClick={() => setMaintenanceMode((current) => !current)}>
                {maintenanceMode ? <ToggleRight className="h-8 w-8 text-amber-500" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'Security' && (
          <div className="space-y-3">
            {ipWhitelist.map((ip, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex-1 font-mono text-sm text-slate-700">{ip}</span>
                <button onClick={() => setIpWhitelist((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="192.168.x.x/24" value={newIp} onChange={(e) => setNewIp(e.target.value)} />
              <button type="button" onClick={() => { if (newIp) { setIpWhitelist((prev) => [...prev, newIp]); setNewIp('') } }} className="btn-primary py-2">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

