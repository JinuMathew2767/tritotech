import { useState, useEffect } from 'react'
import { Check, Pencil, Save, User, Users, X } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import DropdownSelect from '@/components/ui/DropdownSelect'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import userService from '@/services/userService'
import type { PendingUser, UserMeta } from '@/services/userService'

const tabs = ['Pending', 'Active Users', 'Approved', 'Denied']

export default function UserApprovals() {
  const [activeTab, setActiveTab] = useState(0)
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<UserMeta | null>(null)
  const [assignments, setAssignments] = useState<{ [key: number]: { company: string, department: string } }>({})
  const [editingUser, setEditingUser] = useState<PendingUser | null>(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    company: '',
    department: '',
    departments: [] as string[],
    department_access_mode: 'global' as 'global' | 'single' | 'multiple',
    status: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const loadUsersForTab = async (tabIndex: number) => {
    setLoading(true)
    try {
      let data: PendingUser[] = []
      if (tabIndex === 0) data = await userService.getPendingUsers()
      else if (tabIndex === 1) data = await userService.getActiveUsers()
      else if (tabIndex === 2) data = await userService.getAllUsers('active')
      else if (tabIndex === 3) data = await userService.getDeniedUsers()
      setUsers(data)
    } catch (err) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    userService.getMeta().then(setMeta).catch(() => toast.error('Failed to load user options'))
  }, [])

  useEffect(() => {
    loadUsersForTab(activeTab)
  }, [activeTab])

  const handleAssignmentChange = (userId: number, field: 'company' | 'department', value: string) => {
    setAssignments(prev => ({
      ...prev,
      [userId]: { ...prev[userId] || { company: '', department: '' }, [field]: value }
    }))
  }

  const approve = async (user: PendingUser) => {
    try {
      const { company, department } = assignments[user.id] || { company: user.company !== 'Unknown' ? user.company : '', department: user.department !== 'Unknown' ? user.department : '' }
      
      await userService.approveUser(user.id, company, department)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      toast.success('User approved')
    } catch {
      toast.error('Failed to approve user')
    }
  }

  const deny = async (id: number) => {
    try {
      await userService.denyUser(id)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      toast.error('User denied')
    } catch {
      toast.error('Failed to deny user')
    }
  }

  const openEdit = (user: PendingUser) => {
    setEditingUser(user)
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      company: user.company === 'Unknown' ? '' : user.company,
      department: user.department === 'Unknown' ? '' : user.department,
      departments: user.department_access_mode === 'multiple'
        ? user.department_access
        : user.department && user.department !== 'Unknown'
          ? [user.department]
          : [],
      department_access_mode: user.department_access_mode,
      status: user.status || (activeTab === 1 || activeTab === 2 ? 'active' : tabs[activeTab].toLowerCase()),
    })
  }

  const saveEdit = async () => {
    if (!editingUser) return
    try {
      setSavingEdit(true)
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        company: form.company,
        department:
          form.department_access_mode === 'single'
            ? form.departments[0] || form.department
            : '',
        departments:
          form.department_access_mode === 'multiple'
            ? form.departments
            : [],
        status: form.status,
      }
      const updated = await userService.updateUser(editingUser.id, payload)
      setUsers((prev) => {
        const next = prev.map((user) => (user.id === updated.id ? updated : user))
        const currentTabStatus =
          activeTab === 0 ? 'pending' :
          activeTab === 1 ? 'active' :
          activeTab === 2 ? 'active' :
          'denied'

        if ((updated.status || '').toLowerCase() !== currentTabStatus) {
          return next.filter((user) => user.id !== updated.id)
        }
        return next
      })
      setEditingUser(null)
      toast.success('User updated')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update user')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]">
              <Users className="h-3.5 w-3.5" />
              Access Control
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review pending registrations, update active user records, and keep company and department access aligned with the way your support team operates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/82 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {tabs[activeTab]}
            </span>
            <span className="rounded-full bg-white/82 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {users.length} users
            </span>
          </div>
        </div>
      </div>

      <div className="card p-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setActiveTab(i)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeTab === i ? 'bg-[#4E5A7A] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="card p-10 text-center text-slate-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="card p-10 text-center text-slate-400">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No {tabs[activeTab].toLowerCase()} users found</p>
          </div>
        ) : users.map((user) => (
          <div key={user.id} className="card p-5 flex items-center gap-4">
            <Avatar name={`${user.first_name} ${user.last_name}`} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900">{user.first_name} {user.last_name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
              <div className="flex gap-2 mt-2 flex-wrap items-center">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 capitalize">{user.role.replace('_', ' ')}</span>
                
                {activeTab === 0 ? (
                  <>
                    <DropdownSelect
                      value={assignments[user.id]?.company ?? (user.company !== 'Unknown' ? user.company : '')}
                      onChange={(value) => handleAssignmentChange(user.id, 'company', value)}
                      placeholder="Global Access (All Companies)"
                      buttonClassName="min-h-0 rounded-xl px-3 py-2 text-xs"
                      panelClassName="rounded-2xl"
                      optionClassName="rounded-xl px-2.5 py-2"
                      maxPanelHeightClassName="max-h-48"
                      options={(meta?.companies ?? []).map((company) => ({ value: company, label: company }))}
                    />

                    <DropdownSelect
                      value={assignments[user.id]?.department ?? (user.department !== 'Unknown' ? user.department : '')}
                      onChange={(value) => handleAssignmentChange(user.id, 'department', value)}
                      placeholder="Global Access (All Departments)"
                      buttonClassName="min-h-0 rounded-xl px-3 py-2 text-xs"
                      panelClassName="rounded-2xl"
                      optionClassName="rounded-xl px-2.5 py-2"
                      maxPanelHeightClassName="max-h-48"
                      options={(meta?.departments ?? []).map((department) => ({ value: department, label: department }))}
                    />
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#4E5A7A]/10 text-[#4E5A7A]">{user.company !== 'Unknown' ? user.company : 'Global Access'}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{user.department !== 'Unknown' ? user.department : 'Global Access'}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {activeTab === 0 && (
                <>
                  <button onClick={() => deny(user.id)} className="btn-danger rounded-xl p-2.5" title="Deny">
                    <X className="w-4 h-4" />
                  </button>
                  <button onClick={() => approve(user)} className="btn-primary rounded-xl p-2.5" title="Approve">
                    <Check className="w-4 h-4" />
                  </button>
                </>
              )}
              {activeTab === 1 && (
                <>
                  <button onClick={() => openEdit(user)} className="btn-secondary rounded-xl p-2.5" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <span className="rounded-xl bg-[#4E5A7A]/10 px-3 py-1.5 text-sm font-semibold text-[#4E5A7A]">Active</span>
                </>
              )}
              {activeTab === 2 && (
                <>
                  <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-600">Approved</span>
                </>
              )}
              {activeTab === 3 && (
                <>
                  <span className="rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600">Denied</span>
                </>
              )}
            </div>
          </div>
        ))}
        {activeTab === 0 && users.length > 0 && (
          <button className="w-full rounded-[22px] border-2 border-dashed border-[#4E5A7A]/30 py-3 text-sm font-semibold text-[#4E5A7A] transition-colors hover:bg-[#4E5A7A]/5">
            View All Pending Requests {'>'}
          </button>
        )}
      </div>

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <DropdownSelect
                value={form.role}
                onChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
                options={(meta?.roles ?? []).map((role) => ({ value: role.value, label: role.label }))}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <DropdownSelect
                value={form.status}
                onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                options={(meta?.statuses ?? []).map((status) => ({
                  value: status,
                  label: status.charAt(0).toUpperCase() + status.slice(1),
                }))}
              />
            </div>
            <div>
              <label className="label">Company Access</label>
              <DropdownSelect
                value={form.company}
                onChange={(value) => setForm((prev) => ({ ...prev, company: value }))}
                placeholder="Global Access (All Companies)"
                options={(meta?.companies ?? []).map((company) => ({ value: company, label: company }))}
              />
            </div>
            <div>
              <label className="label">Department Access</label>
              <DropdownSelect
                value={form.department_access_mode}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    department_access_mode: value as 'global' | 'single' | 'multiple',
                    department: '',
                    departments: [],
                  }))
                }
                options={[
                  { value: 'global', label: 'Global Access (All Departments)' },
                  { value: 'single', label: 'Single Department' },
                  { value: 'multiple', label: 'Multiple Departments' },
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">
                {form.department_access_mode === 'multiple' ? 'Permitted Departments' : 'Department'}
              </label>
              {form.department_access_mode === 'global' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  This user can work with all departments in the permitted company.
                </div>
              ) : form.department_access_mode === 'single' ? (
                <DropdownSelect
                  value={form.departments[0] || ''}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      department: value,
                      departments: value ? [value] : [],
                    }))
                  }
                  placeholder="Select department..."
                  options={(meta?.departments ?? []).map((department) => ({ value: department, label: department }))}
                />
              ) : (
                <DropdownSelect
                  multiple
                  value={form.departments}
                  onChange={(value) => setForm((prev) => ({ ...prev, departments: value }))}
                  placeholder="Select departments..."
                  maxPanelHeightClassName="max-h-64"
                  summaryFormatter={(selected) => {
                    if (selected.length === 0) return 'Select departments...'
                    if (selected.length <= 2) return selected.join(', ')
                    return `${selected.length} departments selected`
                  }}
                  options={(meta?.departments ?? []).map((department) => ({
                    value: department,
                    label: department,
                    description: 'Select to include this department',
                  }))}
                />
              )}
              {form.department_access_mode === 'multiple' && (
                <p className="mt-1 text-xs text-slate-400">
                  Choose one or more departments from the same dropdown list.
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveEdit} disabled={savingEdit}>
              <Save className="w-4 h-4" />
              {savingEdit ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

