import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import ticketService, { type TicketPriority } from '@/services/ticketService'
import categoryService, { type Category } from '@/services/categoryService'
import departmentService, { type DepartmentMaster } from '@/services/departmentService'
import subcategoryService from '@/services/subcategoryService'
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
  const [department, setDepartment] = useState(departmentAccessMode === 'single' ? allowedDepartment : '')
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

  useEffect(() => {
    setCompany(allowedCompany)
    setDepartment(departmentAccessMode === 'single' ? allowedDepartment : '')
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!allowedCompany) {
      toast.error('Your account is missing a company assignment. Please contact admin.')
      return
    }
    if (!department) {
      toast.error('Please choose a department before submitting the ticket.')
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
        department,
        customer_expected_resolution_at: customerExpectedDate ? new Date(`${customerExpectedDate}T17:00:00`).toISOString() : undefined,
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
        {/* Section 1 */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Basic Information</h2>
          <div>
            <label className="label">Subject *</label>
            <input className="input" placeholder="Brief description of the issue…" value={subject} onChange={(e) => setSubject(e.target.value)} required />
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
              <label className="label">Department</label>
              {hasGlobalDepartmentAccess || hasMultipleDepartmentAccess ? (
                <select
                  className="input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  disabled={hasGlobalDepartmentAccess ? loadingDepartments : false}
                >
                  <option value="">
                    {hasGlobalDepartmentAccess && loadingDepartments ? 'Loading…' : 'Select…'}
                  </option>
                  {hasMultipleDepartmentAccess
                    ? permittedDepartments.map((item) => <option key={item}>{item}</option>)
                    : departments.map((item) => <option key={item.id}>{item.name}</option>)}
                </select>
              ) : (
                <input
                  className="input bg-slate-50 text-slate-600"
                  value={department}
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
              Your company is fixed to your allowed company. You can choose any active department for this ticket.
            </p>
          )}
          {hasMultipleDepartmentAccess && (
            <p className="text-xs text-slate-500">
              Your company is fixed to your allowed company. You can choose one permitted department for this ticket.
            </p>
          )}
        </div>

        {/* Section 2 */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Issue Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select
                className="input"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setSubcategory('') }}
                required
                disabled={loadingCategories}
              >
                <option value="">{loadingCategories ? 'Loading…' : 'Select…'}</option>
                {categories.map((item) => <option key={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subcategory</label>
              <select
                className="input"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={!category || subcategories.length === 0}
              >
                <option value="">Select…</option>
                {subcategories.map((item) => <option key={item}>{item}</option>)}
              </select>
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
                  className={clsx('rounded-xl border-2 p-3 text-left transition-all', priority === value ? color : 'border-slate-200 hover:border-slate-300')}
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
              placeholder="Describe the issue in detail. Include any error messages, steps to reproduce, and impact…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Expected Resolution Date</label>
            <input
              type="date"
              className="input"
              value={customerExpectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setCustomerExpectedDate(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Tell the IT team when you expect this issue to be resolved.</p>
          </div>
        </div>

        {/* Section 3 */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-4">Attachments</h2>
          <FileUploadZone files={files} onChange={setFiles} />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 justify-end">
          <Link to="/dashboard" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={loading || !allowedCompany || !department} className="btn-primary min-w-[140px]">
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</span>
            ) : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
