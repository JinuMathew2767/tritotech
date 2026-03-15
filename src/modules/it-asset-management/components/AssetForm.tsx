import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import CalendarField from '@/components/ui/CalendarField'
import DropdownSelect from '@/components/ui/DropdownSelect'
import {
  assetStatuses,
  createEmptyAssetFormValues,
  validateAssetForm,
  type AssetFormErrors,
  type AssetFormValues,
} from '../utils/assetUtils'
import assetService, {
  type AssetCategoryMaster,
  type AssetDepartmentMaster,
  type AssetEmployeeMaster,
  type AssetSubcategoryMaster,
  type AssetVendorMaster,
} from '../services/assetService'

interface AssetFormProps {
  initialValues?: AssetFormValues
  submitLabel: string
  saving?: boolean
  onSubmit: (values: AssetFormValues) => Promise<void> | void
}

const fieldClass = (hasError?: boolean) =>
  clsx('input', hasError && 'border-red-300 focus:border-red-400 focus:ring-red-100')

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="mt-1 text-xs text-red-600">{error}</p>
}

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/85 p-4">
      <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
        <p className="ui-kicker">{step}</p>
        <h2 className="ui-section-title">{title}</h2>
        <p className="ui-body-muted">{description}</p>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export default function AssetForm({
  initialValues,
  submitLabel,
  saving,
  onSubmit,
}: AssetFormProps) {
  const [values, setValues] = useState<AssetFormValues>(() => initialValues ?? createEmptyAssetFormValues())
  const [errors, setErrors] = useState<AssetFormErrors>({})
  const [categories, setCategories] = useState<AssetCategoryMaster[]>([])
  const [subcategories, setSubcategories] = useState<AssetSubcategoryMaster[]>([])
  const [vendors, setVendors] = useState<AssetVendorMaster[]>([])
  const [departments, setDepartments] = useState<AssetDepartmentMaster[]>([])
  const [employees, setEmployees] = useState<AssetEmployeeMaster[]>([])

  useEffect(() => {
    if (!initialValues) return
    setValues(initialValues)
    setErrors({})
  }, [initialValues])

  useEffect(() => {
    assetService
      .getMeta()
      .then((meta) => {
        setCategories(
          meta.categories.map((categoryName, index) => ({
            id: index + 1,
            name: categoryName,
            description: '',
            isActive: true,
            assetCount: 0,
            subcategoryCount: 0,
          }))
        )
        setSubcategories(meta.subcategories)
        setVendors(
          meta.vendors.map((vendorName, index) => ({
            id: index + 1,
            vendorName,
            erpVendorCode: '',
            assetCount: 0,
          }))
        )
        setDepartments(meta.departments)
        setEmployees(meta.employees)

        if (!initialValues) {
          const defaultDepartment = meta.departments.find(
            (department) => department.name.trim().toLowerCase() === 'it infrastructure'
          )

          if (defaultDepartment) {
            setValues((current) =>
              current.department || current.location
                ? current
                : {
                    ...current,
                    department: defaultDepartment.name,
                    location: defaultDepartment.location,
                  }
            )
          }
        }
      })
      .catch(() => toast.error('Failed to load asset masters'))
  }, [])

  const updateField = <Key extends keyof AssetFormValues>(field: Key, value: AssetFormValues[Key]) => {
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

  const categoryOptions = useMemo(() => {
    const optionSet = new Set(categories.map((category) => category.name))
    if (values.category.trim()) {
      optionSet.add(values.category.trim())
    }

    return Array.from(optionSet).sort((left, right) => left.localeCompare(right))
  }, [categories, values.category])

  const subcategoryOptions = useMemo(() => {
    const optionSet = new Set(
      subcategories
        .filter((subcategory) => !values.category.trim() || subcategory.categoryName === values.category.trim())
        .map((subcategory) => subcategory.name)
    )

    if (values.subcategory.trim()) {
      optionSet.add(values.subcategory.trim())
    }

    return Array.from(optionSet).sort((left, right) => left.localeCompare(right))
  }, [subcategories, values.category, values.subcategory])

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

  const vendorOptions = useMemo(() => {
    const optionSet = new Set(vendors.map((vendor) => vendor.vendorName))
    if (values.vendor.trim()) {
      optionSet.add(values.vendor.trim())
    }

    return Array.from(optionSet).sort((left, right) => left.localeCompare(right))
  }, [vendors, values.vendor])

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

  const handleAssignedUserChange = (assigneeName: string) => {
    const matchedEmployee = employees.find((employee) => employee.name === assigneeName)

    setValues((current) => ({
      ...current,
      assignedTo: assigneeName,
      department: matchedEmployee?.department || current.department,
      location: matchedEmployee?.location || current.location,
    }))

    setErrors((current) => ({ ...current, assignedTo: undefined, department: undefined, location: undefined }))
  }

  const handleCategoryChange = (categoryName: string) => {
    const nextSubcategoryOptions = subcategories
      .filter((subcategory) => subcategory.categoryName === categoryName)
      .map((subcategory) => subcategory.name)

    setValues((current) => ({
      ...current,
      category: categoryName,
      subcategory: nextSubcategoryOptions.includes(current.subcategory) ? current.subcategory : '',
    }))

    setErrors((current) => ({ ...current, category: undefined, subcategory: undefined }))
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validation = validateAssetForm(values)

    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }

    await onSubmit(values)
  }

  const assignmentStatusNeedsOwner = values.status === 'Assigned' || values.status === 'In Use'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormSection
        step="Step 1"
        title="Asset Identity"
        description="Capture the basic record so the asset can be searched, classified, and understood quickly."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Asset Name</label>
            <input
              className={fieldClass(!!errors.name)}
              value={values.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Example: Dell Latitude Laptop"
            />
            <FieldError error={errors.name} />
          </div>
          <div>
            <label className="label">Asset Category</label>
            <DropdownSelect
              value={values.category}
              onChange={handleCategoryChange}
              placeholder="Select category"
              buttonClassName={clsx(!!errors.category && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
              options={categoryOptions.map((category) => ({ value: category, label: category }))}
            />
            <FieldError error={errors.category} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Subcategory</label>
            <DropdownSelect
              value={values.subcategory}
              onChange={(value) => updateField('subcategory', value)}
              placeholder="Select subcategory"
              buttonClassName={clsx(!!errors.subcategory && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
              options={subcategoryOptions.map((subcategory) => ({ value: subcategory, label: subcategory }))}
            />
            <FieldError error={errors.subcategory} />
            <p className="ui-data-note mt-1">Managed under Settings - Masters - Asset Categories and Asset Subcategories.</p>
          </div>
          <div>
            <label className="label">Serial Number</label>
            <input
              className={fieldClass(!!errors.serialNumber)}
              value={values.serialNumber}
              onChange={(event) => updateField('serialNumber', event.target.value)}
              placeholder="Optional serial number"
            />
            <FieldError error={errors.serialNumber} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">IMEI Number</label>
            <input
              className={fieldClass(!!errors.imeiNumber)}
              value={values.imeiNumber}
              onChange={(event) => updateField('imeiNumber', event.target.value)}
              placeholder="Optional IMEI for mobile devices"
            />
            <FieldError error={errors.imeiNumber} />
          </div>
          <div>
            <label className="label">Brand / Model</label>
            <input
              className={fieldClass(!!errors.brandModel)}
              value={values.brandModel}
              onChange={(event) => updateField('brandModel', event.target.value)}
              placeholder="Dell Latitude 7440"
            />
            <FieldError error={errors.brandModel} />
          </div>
        </div>

        <div>
          <label className="label">Vendor</label>
          <DropdownSelect
            value={values.vendor}
            onChange={(value) => updateField('vendor', value)}
            placeholder="Select vendor"
            buttonClassName={clsx(!!errors.vendor && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
            options={vendorOptions.map((vendor) => ({ value: vendor, label: vendor }))}
          />
          <FieldError error={errors.vendor} />
          <p className="ui-data-note mt-1">Managed under Settings - Masters - Asset Vendors.</p>
        </div>
      </FormSection>

      <FormSection
        step="Step 2"
        title="Purchase And Coverage"
        description="Enter procurement and renewal dates so the module can calculate expiry and warranty health."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Purchase Cost</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={fieldClass(!!errors.purchaseCost)}
              value={values.purchaseCost}
              onChange={(event) => updateField('purchaseCost', event.target.value)}
              placeholder="0.00"
            />
            <FieldError error={errors.purchaseCost} />
          </div>
          <div>
            <label className="label">Purchase Date</label>
            <CalendarField
              value={values.purchaseDate}
              onChange={(nextValue) => updateField('purchaseDate', nextValue)}
              placeholder="Select purchase date"
              buttonClassName={clsx(!!errors.purchaseDate && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
            />
            <FieldError error={errors.purchaseDate} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Expiry Date</label>
            <CalendarField
              value={values.expiryDate}
              onChange={(nextValue) => updateField('expiryDate', nextValue)}
              placeholder="Select expiry date"
              buttonClassName={clsx(!!errors.expiryDate && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
            />
            <FieldError error={errors.expiryDate} />
            <p className="ui-data-note mt-1">Optional. Leave blank if this asset does not use an expiry date.</p>
          </div>
          <div>
            <label className="label">Warranty Expiry</label>
            <CalendarField
              value={values.warrantyExpiry}
              onChange={(nextValue) => updateField('warrantyExpiry', nextValue)}
              placeholder="Select warranty date"
              buttonClassName={clsx(!!errors.warrantyExpiry && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
            />
            <FieldError error={errors.warrantyExpiry} />
            <p className="ui-data-note mt-1">Optional. Leave blank if this asset does not use warranty tracking.</p>
          </div>
        </div>
      </FormSection>

      <FormSection
        step="Step 3"
        title="Assignment And Placement"
        description="Use this section to record where the asset lives now. If it is not yet allocated, keep it unassigned."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <DropdownSelect
              value={values.status}
              onChange={(value) => updateField('status', value as AssetFormValues['status'])}
              buttonClassName={clsx(!!errors.status && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
              options={assetStatuses.map((status) => ({ value: status, label: status }))}
            />
            <FieldError error={errors.status} />
          </div>
          <div>
            <label className="label">Assigned User</label>
            <DropdownSelect
              value={values.assignedTo}
              onChange={handleAssignedUserChange}
              placeholder="Select from employee master"
              buttonClassName={clsx(!!errors.assignedTo && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
              options={employeeOptions.map((employee) => ({
                value: employee.name,
                label: employee.name,
                description: employee.department || undefined,
              }))}
            />
            <FieldError error={errors.assignedTo} />
            <p className="ui-data-note mt-1">Managed under Settings - Masters - Asset Employees.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Department</label>
            <DropdownSelect
              value={values.department}
              onChange={handleDepartmentChange}
              placeholder="Select department"
              buttonClassName={clsx(!!errors.department && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
              options={departmentOptions.map((department) => ({
                value: department.name,
                label: department.name,
                description: department.location || undefined,
              }))}
            />
            <FieldError error={errors.department} />
          </div>
          <div>
            <label className="label">Location</label>
            <DropdownSelect
              value={values.location}
              onChange={(value) => updateField('location', value)}
              placeholder="Select location"
              buttonClassName={clsx(!!errors.location && 'border-red-300 focus:border-red-400 focus:ring-red-100')}
              options={locationOptions.map((location) => ({ value: location, label: location }))}
            />
            <FieldError error={errors.location} />
            {selectedDepartment?.location ? <p className="ui-data-note mt-1">Linked from the selected department master.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
          {assignmentStatusNeedsOwner
            ? 'This status expects an assignee. If the asset should remain in stock, switch the status to In Stock or leave it unallocated for now.'
            : 'Tip: create the asset as In Stock first, then use the Transactions tab later when you are ready to issue, return, or transfer it.'}
        </div>
      </FormSection>

      <FormSection
        step="Step 4"
        title="Operational Notes"
        description="Capture context that will help future updates, audits, renewals, and handovers."
      >
        <div>
          <label className="label">Notes</label>
          <textarea
            rows={5}
            className="input"
            value={values.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="Condition details, renewal notes, storage instructions, procurement references, or anything the next owner should know."
          />
        </div>

        <div className="rounded-2xl border border-[#4E5A7A]/10 bg-white/80 px-4 py-3 text-sm text-slate-600">
          Practical guidance:
          <span className="ml-1">
            use the Asset Master to create and maintain records, then use the Transactions workspace for issue, return, and transfer actions after the record exists.
          </span>
        </div>
      </FormSection>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Link to="/it-assets/master" className="btn-secondary">
          Cancel
        </Link>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
