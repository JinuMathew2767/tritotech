import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import ticketService, { type TicketPriority } from '@/services/ticketService'
import categoryService, { type Category } from '@/services/categoryService'
import departmentService, { type DepartmentMaster } from '@/services/departmentService'
import subcategoryService from '@/services/subcategoryService'
import CalendarField from '@/components/ui/CalendarField'
import DropdownSelect from '@/components/ui/DropdownSelect'
import FileUploadZone from '@/components/ui/FileUploadZone'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const priorities: { value: TicketPriority; label: string; desc: string; color: string }[] = [
  { value: 'low', label: 'Low', desc: 'No urgency', color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'medium', label: 'Medium', desc: 'Standard priority', color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'high', label: 'High', desc: 'Significant impact', color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 'urgent', label: 'Urgent', desc: 'Business critical', color: 'border-red-400 bg-red-50 text-red-700' },
]

export default function RaiseTicket() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowedCompany = user?.company?.trim() || ''
  const allowedDepartment = user?.department?.trim() || ''
  const departmentAccessMode = user?.department_access_mode || (allowedDepartment ? 'single' : 'global')
  const permittedDepartments = user?.department_access || []
  const hasGlobalDepartmentAccess = departmentAccessMode === 'global'
  const hasMultipleDepartmentAccess = departmentAccessMode === 'multiple'

  const [subject, setSubject] = useState('')
  const [company, setCompany] = useState(allowedCompany)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(
    departmentAccessMode === 'single' && allowedDepartment ? [allowedDepartment] : []
  )
  const [departments, setDepartments] = useState<DepartmentMaster[]>([])
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategory, setSubcategory] = useState('')
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [description, setDescription] = useState('')
  const [customerExpectedDate, setCustomerExpectedDate] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingDepartments, setLoadingDepartments] = useState(hasGlobalDepartmentAccess)
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false)
  const departmentPickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCompany(allowedCompany)
    setSelectedDepartments(departmentAccessMode === 'single' && allowedDepartment ? [allowedDepartment] : [])
    setDepartmentPickerOpen(false)
  }, [allowedCompany, allowedDepartment, departmentAccessMode])

  useEffect(() => {
    categoryService
      .list()
      .then((items) => setCategories(items))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoadingCategories(false))
  }, [])

  useEffect(() => {
    if (!hasGlobalDepartmentAccess) {
      setDepartments([])
      setLoadingDepartments(false)
      return
    }

    setLoadingDepartments(true)
    departmentService
      .list()
      .then((items) => setDepartments(items))
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoadingDepartments(false))
  }, [hasGlobalDepartmentAccess])

  useEffect(() => {
    const selectedCategory = categories.find((item) => item.name === category)

    if (!selectedCategory) {
      setSubcategories([])
      setSubcategory('')
      return
    }

    subcategoryService
      .list({ category_id: selectedCategory.id })
      .then((items) => setSubcategories(items.map((item) => item.name)))
      .catch(() => toast.error('Failed to load subcategories'))
  }, [categories, category])

  useEffect(() => {
    if (!departmentPickerOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!departmentPickerRef.current?.contains(event.target as Node)) {
        setDepartmentPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [departmentPickerOpen])

  const availableDepartmentNames = hasMultipleDepartmentAccess
    ? permittedDepartments
    : departments.map((item) => item.name)

  const toggleDepartment = (departmentName: string) => {
    setSelectedDepartments((current) =>
      current.includes(departmentName)
        ? current.filter((item) => item !== departmentName)
        : [...current, departmentName]
    )
  }

  const departmentSummary =
    selectedDepartments.length === 0
      ? 'Select department(s)'
      : selectedDepartments.length <= 2
        ? selectedDepartments.join(', ')
        : `${selectedDepartments.length} departments selected`

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!allowedCompany) {
      toast.error('Your account is missing a company assignment. Please contact admin.')
      return
    }

    if (selectedDepartments.length === 0) {
      toast.error('Please choose at least one department before submitting the ticket.')
      return
    }

    setLoading(true)
    try {
      const ticket = await ticketService.create({
        subject,
        description,
        priority,
        category,
        subcategory,
        company,
        department: selectedDepartments[0],
        departments: selectedDepartments,
        customer_expected_resolution_at: customerExpectedDate
          ? new Date(`${customerExpectedDate}T17:00:00`).toISOString()
          : undefined,
        attachments: files,
      })
      toast.success('Ticket submitted successfully!')
      navigate(`/tickets/${ticket.id}`)
    } catch {
      toast.error('Failed to submit ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">New Ticket</h1>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <Save className="w-3 h-3" /> Draft auto-saved
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Basic Information</h2>
          <div>
            <label className="label">Subject *</label>
            <input
              className="input"
              placeholder="Brief description of the issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company</label>
              <input
                className="input bg-slate-50 text-slate-600"
                value={company}
                readOnly
                disabled
                placeholder="No company assigned"
              />
            </div>
            <div>
              <label className="label">{hasGlobalDepartmentAccess || hasMultipleDepartmentAccess ? 'Departments' : 'Department'}</label>
              {hasGlobalDepartmentAccess || hasMultipleDepartmentAccess ? (
                <div className="space-y-2">
                  {hasGlobalDepartmentAccess && loadingDepartments ? (
                    <div className="input bg-slate-50 text-slate-400">Loading departments...</div>
                  ) : availableDepartmentNames.length === 0 ? (
                    <div className="input bg-slate-50 text-slate-400">No departments available</div>
                  ) : (
                    <div ref={departmentPickerRef}>
                      <button
                        type="button"
                        onClick={() => setDepartmentPickerOpen((current) => !current)}
                        className={clsx(
                          'input flex w-full items-center justify-between gap-3 text-left transition-colors',
                          departmentPickerOpen && 'border-[#4E5A7A]/35 ring-2 ring-[#4E5A7A]/10'
                        )}
                      >
                        <span className={clsx('truncate', selectedDepartments.length === 0 ? 'text-slate-400' : 'text-slate-800')}>
                          {departmentSummary}
                        </span>
                        <ChevronDown
                          className={clsx(
                            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                            departmentPickerOpen && 'rotate-180 text-[#4E5A7A]'
                          )}
                        />
                      </button>

                      {departmentPickerOpen && (
                        <div className="mt-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.28)]">
                          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                            {availableDepartmentNames.map((item) => {
                              const checked = selectedDepartments.includes(item)
                              return (
                                <label
                                  key={item}
                                  className={clsx(
                                    'flex cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 transition-all',
                                    checked
                                      ? 'border-[#4E5A7A]/40 bg-[#4E5A7A]/8 shadow-[0_10px_30px_-24px_rgba(78,90,122,0.45)]'
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#4E5A7A] focus:ring-[#4E5A7A]/30"
                                    checked={checked}
                                    onChange={() => toggleDepartment(item)}
                                    disabled={loadingDepartments}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm leading-5 font-medium text-slate-800">{item}</p>
                                    <p className="text-[11px] leading-4 text-slate-400">
                                      {checked ? 'Included in this ticket' : 'Select to include this department'}
                                    </p>
                                  </div>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  className="input bg-slate-50 text-slate-600"
                  value={selectedDepartments[0] || ''}
                  readOnly
                  disabled
                  placeholder="No department assigned"
                />
              )}
            </div>
          </div>
          {!allowedCompany && (
            <p className="text-xs text-amber-700">
              Your account must be assigned to a company before you can raise tickets.
            </p>
          )}
          {hasGlobalDepartmentAccess && (
            <p className="text-xs text-slate-500">
              Your company is fixed to your allowed company. You can select one or more active departments for this ticket.
            </p>
          )}
          {hasMultipleDepartmentAccess && (
            <p className="text-xs text-slate-500">
              Your company is fixed to your allowed company. You can select one or more of your permitted departments for this ticket.
            </p>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Issue Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <DropdownSelect
                value={category}
                onChange={(value) => {
                  setCategory(value)
                  setSubcategory('')
                }}
                disabled={loadingCategories}
                placeholder={loadingCategories ? 'Loading...' : 'Select...'}
                options={categories.map((item) => ({ value: item.name, label: item.name }))}
              />
            </div>
            <div>
              <label className="label">Subcategory</label>
              <DropdownSelect
                value={subcategory}
                onChange={setSubcategory}
                disabled={!category || subcategories.length === 0}
                placeholder="Select..."
                options={subcategories.map((item) => ({ value: item, label: item }))}
              />
              {category && subcategories.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">No subcategories configured for this category yet.</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Priority *</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {priorities.map(({ value, label, desc, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={clsx(
                    'rounded-xl border-2 p-3 text-left transition-all',
                    priority === value ? color : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <p className="text-xs font-bold">{label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea
              className="input min-h-[120px] resize-none"
              placeholder="Describe the issue in detail. Include any error messages, steps to reproduce, and impact..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Expected Resolution Date</label>
            <CalendarField
              value={customerExpectedDate}
              onChange={setCustomerExpectedDate}
              min={new Date().toISOString().split('T')[0]}
              placeholder="Select expected date"
            />
            <p className="text-xs text-slate-400 mt-1">Tell the IT team when you expect this issue to be resolved.</p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">Attachments</h2>
          <FileUploadZone files={files} onChange={setFiles} />
        </div>

        <div className="flex items-center gap-3 justify-end">
          <Link to="/dashboard" className="btn-secondary">Cancel</Link>
          <button
            type="submit"
            disabled={loading || !allowedCompany || selectedDepartments.length === 0}
            className="btn-primary min-w-[140px]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Submitting...
              </span>
            ) : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
