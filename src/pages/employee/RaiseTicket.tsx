import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import CalendarField from '@/components/ui/CalendarField'
import DropdownSelect from '@/components/ui/DropdownSelect'
import FileUploadZone from '@/components/ui/FileUploadZone'
import PageHeader from '@/components/ui/PageHeader'
import categoryService, { type Category } from '@/services/categoryService'
import departmentService, { type DepartmentMaster } from '@/services/departmentService'
import subcategoryService from '@/services/subcategoryService'
import ticketService, { type TicketPriority } from '@/services/ticketService'
import toast from 'react-hot-toast'

const priorities: { value: TicketPriority; label: string; desc: string; color: string }[] = [
  { value: 'low', label: 'Low', desc: 'Routine issue', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'medium', label: 'Medium', desc: 'Standard priority', color: 'border-sky-300 bg-sky-50 text-sky-700' },
  { value: 'high', label: 'High', desc: 'Significant impact', color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 'urgent', label: 'Urgent', desc: 'Business critical', color: 'border-red-300 bg-red-50 text-red-700' },
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

  const departmentScopeNote = hasGlobalDepartmentAccess
    ? 'Your company is fixed. Choose one or more active departments for this request.'
    : hasMultipleDepartmentAccess
      ? 'Your company is fixed. Choose from the departments already assigned to your account.'
      : 'Your department is fixed by your account profile.'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

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
      toast.success('Ticket submitted successfully')
      navigate(`/tickets/${ticket.id}`)
    } catch {
      toast.error('Failed to submit ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell mx-auto max-w-6xl">
      <PageHeader
        eyebrow={
          <>
            <ArrowLeft className="h-3.5 w-3.5" />
            New Request
          </>
        }
        title="Raise Ticket"
        description="Capture the issue clearly, route it to the right department, and add only the details needed to move support forward."
        actions={
          <>
            <Link to="/dashboard" className="btn-secondary">
              Back to dashboard
            </Link>
          </>
        }
        meta={
          <>
            <span className="page-meta-chip">{allowedCompany || 'No company assigned'}</span>
            <span className="page-meta-chip">
              {selectedDepartments.length > 0 ? `${selectedDepartments.length} department(s)` : 'No department selected'}
            </span>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="card p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="ui-kicker">Request Scope</p>
              <h2 className="ui-section-title mt-1">Basic Information</h2>
            </div>

            <div className="surface-muted px-4 py-3 text-[12px] font-medium text-slate-600">
              {departmentScopeNote}
            </div>

            <div>
              <label className="label">Subject *</label>
              <input
                className="input"
                placeholder="Short summary of the issue"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                <label className="label">
                  {hasGlobalDepartmentAccess || hasMultipleDepartmentAccess ? 'Departments' : 'Department'}
                </label>

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
                            departmentPickerOpen && 'border-[#0f7cb8] ring-4 ring-[#0f7cb8]/12'
                          )}
                        >
                          <span
                            className={clsx(
                              'truncate',
                              selectedDepartments.length === 0 ? 'text-slate-400' : 'text-slate-800'
                            )}
                          >
                            {departmentSummary}
                          </span>
                          <ChevronDown
                            className={clsx(
                              'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                              departmentPickerOpen && 'rotate-180 text-[#163b63]'
                            )}
                          />
                        </button>

                        {departmentPickerOpen ? (
                          <div className="mt-2 rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.18)]">
                            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                              {availableDepartmentNames.map((item) => {
                                const checked = selectedDepartments.includes(item)
                                return (
                                  <label
                                    key={item}
                                    className={clsx(
                                      'flex cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 transition-all',
                                      checked
                                        ? 'border-[#0f7cb8]/25 bg-[#0f7cb8]/8'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#163b63] focus:ring-[#0f7cb8]/20"
                                      checked={checked}
                                      onChange={() => toggleDepartment(item)}
                                      disabled={loadingDepartments}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-[14px] font-semibold leading-5 tracking-[-0.015em] text-slate-800">
                                        {item}
                                      </p>
                                      <p className="text-[11px] font-medium leading-4 text-slate-400">
                                        {checked ? 'Included in this request' : 'Select to include this department'}
                                      </p>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ) : null}
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

            {!allowedCompany ? (
              <p className="text-sm font-medium text-amber-700">
                Your account must be assigned to a company before you can raise tickets.
              </p>
            ) : null}
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="ui-kicker">Request Details</p>
              <h2 className="ui-section-title mt-1">Issue Information</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Category *</label>
                <DropdownSelect
                  value={category}
                  onChange={(value) => {
                    setCategory(value)
                    setSubcategory('')
                  }}
                  disabled={loadingCategories}
                  placeholder={loadingCategories ? 'Loading...' : 'Select category'}
                  options={categories.map((item) => ({ value: item.name, label: item.name }))}
                />
              </div>

              <div>
                <label className="label">Subcategory</label>
                <DropdownSelect
                  value={subcategory}
                  onChange={setSubcategory}
                  disabled={!category || subcategories.length === 0}
                  placeholder="Select subcategory"
                  options={subcategories.map((item) => ({ value: item, label: item }))}
                />
                {category && subcategories.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">No subcategories configured for this category yet.</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="label">Priority *</label>
              <div className="grid gap-2 md:grid-cols-4">
                {priorities.map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    className={clsx(
                      'rounded-xl border px-3 py-3 text-left transition-all',
                      priority === value ? color : 'border-slate-300 bg-white hover:border-slate-400'
                    )}
                  >
                    <p className="text-[13px] font-semibold leading-none tracking-[-0.015em]">{label}</p>
                    <p className="mt-1 text-[11px] font-medium opacity-80">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                className="input min-h-[140px] resize-y"
                placeholder="Describe the issue, impact, and any useful context for the support team."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Expected Resolution Date</label>
                <CalendarField
                  value={customerExpectedDate}
                  onChange={setCustomerExpectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Select expected date"
                />
              </div>

              <div className="surface-muted px-4 py-3">
                <p className="ui-data-label">Submission Summary</p>
                <div className="mt-2 space-y-2 text-[13px] text-slate-600">
                  <p>Company: {company || 'Not assigned'}</p>
                  <p>Departments: {selectedDepartments.length > 0 ? selectedDepartments.join(', ') : 'Not selected'}</p>
                  <p>Priority: {priority}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="ui-kicker">Supporting Files</p>
              <h2 className="ui-section-title mt-1">Attachments</h2>
            </div>
            <FileUploadZone files={files} onChange={setFiles} />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link to="/dashboard" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !allowedCompany || selectedDepartments.length === 0}
            className="btn-primary min-w-[150px]"
          >
            {loading ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
