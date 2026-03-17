import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Route, Save, ShieldCheck, Trash2, Workflow } from 'lucide-react'
import toast from 'react-hot-toast'
import DropdownSelect from '@/components/ui/DropdownSelect'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import routingRuleService, {
  type RoutingRule,
  type RoutingRuleMeta,
  type RoutingRulePayload,
} from '@/services/routingRuleService'
import ticketService, { type TicketStats } from '@/services/ticketService'

type RuleFormState = {
  name: string
  priority: string
  is_active: boolean
  company_id: string
  department_id: string
  category_id: string
  assignee_user_id: string
}

const emptyForm: RuleFormState = {
  name: '',
  priority: '100',
  is_active: true,
  company_id: '',
  department_id: '',
  category_id: '',
  assignee_user_id: '',
}

const toPayload = (form: RuleFormState): RoutingRulePayload => ({
  name: form.name.trim(),
  priority: Number(form.priority),
  is_active: form.is_active,
  company_id: form.company_id ? Number(form.company_id) : null,
  department_id: form.department_id ? Number(form.department_id) : null,
  category_id: form.category_id ? Number(form.category_id) : null,
  assignee_user_id: Number(form.assignee_user_id),
})

const toFormState = (rule?: RoutingRule): RuleFormState =>
  rule
    ? {
        name: rule.name,
        priority: String(rule.priority),
        is_active: rule.is_active,
        company_id: rule.company_id ? String(rule.company_id) : '',
        department_id: rule.department_id ? String(rule.department_id) : '',
        category_id: rule.category_id ? String(rule.category_id) : '',
        assignee_user_id: String(rule.assignee_user_id),
      }
    : emptyForm

const getSpecificity = (rule: Pick<RoutingRule, 'company_id' | 'department_id' | 'category_id'>) =>
  Number(Boolean(rule.company_id)) + Number(Boolean(rule.department_id)) + Number(Boolean(rule.category_id))

const sortRules = (items: RoutingRule[]) =>
  [...items].sort((left, right) => {
    const leftSpecificity = getSpecificity(left)
    const rightSpecificity = getSpecificity(right)
    if (rightSpecificity !== leftSpecificity) return rightSpecificity - leftSpecificity
    if (left.priority !== right.priority) return left.priority - right.priority
    return left.id - right.id
  })

const scopeBadges = (rule: Pick<RoutingRule, 'company' | 'department' | 'category'>) => [
  { label: 'Company', value: rule.company || 'Any company' },
  { label: 'Department', value: rule.department || 'Any department' },
  { label: 'Category', value: rule.category || 'Any category' },
]

export default function RoutingRules() {
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [meta, setMeta] = useState<RoutingRuleMeta | null>(null)
  const [rules, setRules] = useState<RoutingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const [form, setForm] = useState<RuleFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, metaData, ruleData] = await Promise.all([
        ticketService.getStats(),
        routingRuleService.getMeta(),
        routingRuleService.list(),
      ])
      setStats(statsData)
      setMeta(metaData)
      setRules(sortRules(ruleData))
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load routing rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const summary = useMemo(() => {
    const activeRules = rules.filter((rule) => rule.is_active).length
    const catchAllRules = rules.filter((rule) => !rule.company_id && !rule.department_id && !rule.category_id).length
    const scopedRules = rules.filter((rule) => getSpecificity(rule) >= 2).length
    return {
      total: rules.length,
      active: activeRules,
      catchAll: catchAllRules,
      scoped: scopedRules,
      unassigned: stats?.unassigned ?? 0,
    }
  }, [rules, stats])

  const openCreate = () => {
    setEditingRule(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (rule: RoutingRule) => {
    setEditingRule(rule)
    setForm(toFormState(rule))
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingRule(null)
    setForm(emptyForm)
  }

  const saveRule = async () => {
    if (!form.name.trim()) return toast.error('Rule name is required')
    if (!form.assignee_user_id) return toast.error('Please choose an assignee')

    const priority = Number(form.priority)
    if (!Number.isFinite(priority) || priority < 1) return toast.error('Priority must be 1 or higher')

    try {
      setSaving(true)
      const payload = toPayload(form)
      const savedRule = editingRule
        ? await routingRuleService.update(editingRule.id, payload)
        : await routingRuleService.create(payload)

      setRules((prev) => {
        const next = editingRule
          ? prev.map((rule) => (rule.id === savedRule.id ? savedRule : rule))
          : [...prev, savedRule]
        return sortRules(next)
      })

      toast.success(editingRule ? 'Routing rule updated' : 'Routing rule created')
      closeModal()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save routing rule')
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async (rule: RoutingRule) => {
    if (!window.confirm(`Delete routing rule "${rule.name}"?`)) return

    try {
      await routingRuleService.remove(rule.id)
      setRules((prev) => prev.filter((item) => item.id !== rule.id))
      toast.success('Routing rule deleted')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete routing rule')
    }
  }

  if (loading || !meta || !stats) return <PageLoader />

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={
          <>
            <Workflow className="h-3.5 w-3.5" />
            Assignment Logic
          </>
        }
        title="Routing Rules"
        description="Keep auto-assignment precise with compact rule management for company, department, and category coverage."
        actions={
          <button onClick={openCreate} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            New Rule
          </button>
        }
        meta={
          <>
            <span className="page-meta-chip">{summary.active} active</span>
            <span className="page-meta-chip">{summary.catchAll} fallback</span>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f7cb8]/10 text-[#163b63]">
            <Route className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{summary.total}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Rules</p>
        </div>

        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{summary.active}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Active Rules</p>
        </div>

        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Workflow className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{summary.scoped}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Targeted Rules</p>
        </div>

        <div className="metric-tile">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <Route className="h-5 w-5" />
          </div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{summary.unassigned}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Unassigned Tickets</p>
        </div>
      </section>

      <section className="surface-muted px-4 py-3 text-sm text-slate-600">
        Specific scope outranks broad scope. If two rules match at the same specificity, the lower priority number wins.
      </section>

      <section className="glass-table">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Rule Directory</h2>
              <p className="mt-1 text-sm text-slate-500">The most specific rules appear first so precedence stays obvious.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {rules.length} rules
            </span>
          </div>
        </div>

        {rules.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-slate-500">
            No routing rules yet. Create the first rule to start auto-assigning tickets.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Rule</th>
                    <th className="px-4 py-3 text-left">Coverage</th>
                    <th className="px-4 py-3 text-left">Assignee</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-slate-900">{rule.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getSpecificity(rule)} scope level{getSpecificity(rule) === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {scopeBadges(rule).map((item) => (
                            <span key={`${rule.id}-${item.label}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {item.value}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">{rule.assignee_name}</td>
                      <td className="px-4 py-4 align-top">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          #{rule.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-slate-500">
                        {new Date(rule.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => openEdit(rule)} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button onClick={() => deleteRule(rule)} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{rule.assignee_name}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {scopeBadges(rule).map((item) => (
                      <span key={`${rule.id}-${item.label}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {item.value}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>Priority #{rule.priority}</span>
                    <span>{new Date(rule.updated_at).toLocaleDateString()}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => openEdit(rule)} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button onClick={() => deleteRule(rule)} className="btn-secondary gap-1.5 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingRule ? 'Edit Routing Rule' : 'Create Routing Rule'}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rule Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Accounts hardware requests"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Company Scope</label>
              <DropdownSelect
                value={form.company_id}
                onChange={(value) => setForm((prev) => ({ ...prev, company_id: value }))}
                placeholder="Any company"
                options={meta.companies.map((company) => ({ value: String(company.id), label: company.label }))}
              />
            </div>
            <div>
              <label className="label">Department Scope</label>
              <DropdownSelect
                value={form.department_id}
                onChange={(value) => setForm((prev) => ({ ...prev, department_id: value }))}
                placeholder="Any department"
                options={meta.departments.map((department) => ({ value: String(department.id), label: department.label }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Category Scope</label>
              <DropdownSelect
                value={form.category_id}
                onChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}
                placeholder="Any category"
                options={meta.categories.map((category) => ({ value: String(category.id), label: category.label }))}
              />
            </div>
            <div>
              <label className="label">Assign To</label>
              <DropdownSelect
                value={form.assignee_user_id}
                onChange={(value) => setForm((prev) => ({ ...prev, assignee_user_id: value }))}
                placeholder="Select assignee"
                options={meta.assignees.map((assignee) => ({
                  value: String(assignee.id),
                  label: assignee.label,
                  description: assignee.role.replace('_', ' '),
                }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Priority</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              />
            </div>
            <label className="surface-muted flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                className="h-4 w-4 accent-[#163b63]"
              />
              <span className="text-sm font-medium text-slate-700">Rule is active</span>
            </label>
          </div>

          <div className="surface-muted px-4 py-3 text-sm text-slate-600">
            Match preview:
            {` ${form.company_id ? meta.companies.find((item) => String(item.id) === form.company_id)?.label : 'Any company'}`}
            {` / ${form.department_id ? meta.departments.find((item) => String(item.id) === form.department_id)?.label : 'Any department'}`}
            {` / ${form.category_id ? meta.categories.find((item) => String(item.id) === form.category_id)?.label : 'Any category'}`}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary gap-2" onClick={saveRule} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
