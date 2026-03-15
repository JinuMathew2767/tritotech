import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Route, Save, ShieldCheck, Trash2, Workflow } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import DropdownSelect from '@/components/ui/DropdownSelect'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type TicketStats } from '@/services/ticketService'
import routingRuleService, {
  type RoutingRule,
  type RoutingRuleMeta,
  type RoutingRulePayload,
} from '@/services/routingRuleService'

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

const scopeParts = (rule: Pick<RoutingRule, 'company' | 'department' | 'category'>) => [
  rule.company ? `Company: ${rule.company}` : 'Any company',
  rule.department ? `Department: ${rule.department}` : 'Any department',
  rule.category ? `Category: ${rule.category}` : 'Any category',
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
      setRules(ruleData)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load routing rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const summary = useMemo(() => {
    const activeRules = rules.filter((rule) => rule.is_active).length
    const catchAllRules = rules.filter((rule) => !rule.company_id && !rule.department_id && !rule.category_id).length
    return {
      total: rules.length,
      active: activeRules,
      catchAll: catchAllRules,
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

        return [...next].sort((left, right) => {
          const leftSpecificity = Number(Boolean(left.company_id)) + Number(Boolean(left.department_id)) + Number(Boolean(left.category_id))
          const rightSpecificity = Number(Boolean(right.company_id)) + Number(Boolean(right.department_id)) + Number(Boolean(right.category_id))
          if (rightSpecificity !== leftSpecificity) return rightSpecificity - leftSpecificity
          if (left.priority !== right.priority) return left.priority - right.priority
          return left.id - right.id
        })
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
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]">
              <Workflow className="h-3.5 w-3.5" />
              Routing Studio
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Routing Rules</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Create scoped routing rules by company, department, and category so incoming work reaches the right support owner without manual triage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/82 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {summary.active} active
            </span>
            <button onClick={openCreate} className="btn-primary gap-2 self-start">
              <Plus className="w-4 h-4" />
              New Rule
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-[#4E5A7A]/10 flex items-center justify-center mb-3">
            <Route className="w-5 h-5 text-[#4E5A7A]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.total}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total routing rules</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.active}</p>
          <p className="text-xs text-slate-500 mt-0.5">Active rules</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Workflow className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.catchAll}</p>
          <p className="text-xs text-slate-500 mt-0.5">Catch-all rules</p>
        </div>
        <div className="card p-5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
            <Route className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.unassigned}</p>
          <p className="text-xs text-slate-500 mt-0.5">Currently unassigned tickets</p>
        </div>
      </div>

      <div className="card p-4 text-sm text-slate-600">
        Wildcards:
        Leave company, department, or category blank to match any value. A rule with all three blank acts as a global fallback.
      </div>

      <div className="glass-table">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Rule Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Rule</th>
                <th className="text-left px-4 py-3">Scope</th>
                <th className="text-left px-4 py-3">Assignee</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No routing rules yet. Create your first rule to start auto-assigning tickets.
                  </td>
                </tr>
              ) : rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{rule.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Updated {new Date(rule.updated_at).toLocaleDateString()} by {rule.updated_by_name || rule.created_by_name || 'system'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {scopeParts(rule).map((part) => (
                        <span key={part} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {part}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{rule.assignee_name}</td>
                  <td className="px-4 py-3 text-slate-700">#{rule.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(rule)} className="btn-secondary py-1.5 px-2.5 text-xs gap-1.5">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button onClick={() => deleteRule(rule)} className="btn-secondary py-1.5 px-2.5 text-xs gap-1.5 text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
              placeholder="Example: Accounts hardware tickets"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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

          <div className="grid md:grid-cols-2 gap-4">
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

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              />
              <p className="text-xs text-slate-400 mt-1">Lower numbers win when two rules have the same scope specificity.</p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 w-full">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  className="h-4 w-4 accent-[#4E5A7A]"
                />
                <span className="text-sm font-medium text-slate-700">Rule is active</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Matching preview:
            {` ${form.company_id ? meta.companies.find((item) => String(item.id) === form.company_id)?.label : 'Any company'}`}
            {` / ${form.department_id ? meta.departments.find((item) => String(item.id) === form.department_id)?.label : 'Any department'}`}
            {` / ${form.category_id ? meta.categories.find((item) => String(item.id) === form.category_id)?.label : 'Any category'}`}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
            <button className="btn-primary gap-2" onClick={saveRule} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : editingRule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

