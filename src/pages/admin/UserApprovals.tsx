import { useEffect, useState } from 'react'
import { Check, Pencil, Save, User, Users, X } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import DropdownSelect from '@/components/ui/DropdownSelect'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import userService from '@/services/userService'
import type { PendingUser, UserMeta } from '@/services/userService'
import clsx from 'clsx'

const tabs = ['Pending', 'Active Users', 'Approved', 'Denied']

const statusTone: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-50 text-emerald-700',
  denied: 'bg-rose-50 text-rose-700',
}

export default function UserApprovals() {
  const [activeTab, setActiveTab] = useState(0)
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<UserMeta | null>(null)
  const [assignments, setAssignments] = useState<Record<number, { company: string; department: string }>>({})
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

  const activeLabel = tabs[activeTab]

  const loadUsersForTab = async (tabIndex: number) => {
    setLoading(true)
    try {
      let data: PendingUser[] = []
      if (tabIndex === 0) data = await userService.getPendingUsers()
      else if (tabIndex === 1) data = await userService.getActiveUsers()
      else if (tabIndex === 2) data = await userService.getAllUsers('active')
      else if (tabIndex === 3) data = await userService.getDeniedUsers()
      setUsers(data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    userService.getMeta().then(setMeta).catch(() => toast.error('Failed to load user options'))
  }, [])

  useEffect(() => {
    void loadUsersForTab(activeTab)
  }, [activeTab])

  const handleAssignmentChange = (userId: number, field: 'company' | 'department', value: string) => {
    setAssignments((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || { company: '', department: '' }), [field]: value },
    }))
  }

  const approve = async (user: PendingUser) => {
    try {
      const { company, department } = assignments[user.id] || {
        company: user.company !== 'Unknown' ? user.company : '',
        department: user.department !== 'Unknown' ? user.department : '',
      }

      await userService.approveUser(user.id, company, department)
      setUsers((prev) => prev.filter((item) => item.id !== user.id))
      toast.success('User approved')
    } catch {
      toast.error('Failed to approve user')
    }
  }

  const deny = async (id: number) => {
    try {
      await userService.denyUser(id)
      setUsers((prev) => prev.filter((item) => item.id !== id))
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
      departments:
        user.department_access_mode === 'multiple'
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
        department: form.department_access_mode === 'single' ? form.departments[0] || form.department : '',
        departments: form.department_access_mode === 'multiple' ? form.departments : [],
        status: form.status,
      }
      const updated = await userService.updateUser(editingUser.id, payload)
      setUsers((prev) => {
        const next = prev.map((user) => (user.id === updated.id ? updated : user))
        const currentTabStatus = activeTab === 0 ? 'pending' : activeTab === 1 ? 'active' : activeTab === 2 ? 'active' : 'denied'

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
      <PageHeader
        eyebrow={
          <>
            <Users className="h-3.5 w-3.5" />
            Access Control
          </>
        }
        title="User Management"
        description="Review pending registrations, maintain active user records, and keep company or department access aligned with how your support operation works."
        meta={
          <>
            <span className="page-meta-chip">{activeLabel}</span>
            <span className="page-meta-chip">{users.length} users</span>
          </>
        }
      />

      <section className="glass-table">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={clsx(
                  'filter-pill',
                  activeTab === index ? 'filter-pill-active' : 'filter-pill-inactive'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : users.length === 0 ? (
          <div className="px-5 py-14 text-center text-slate-500">
            <User className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No {activeLabel.toLowerCase()} users found.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Access</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const displayStatus = (user.status || (activeTab === 0 ? 'pending' : activeTab === 3 ? 'denied' : 'active')).toLowerCase()
                    return (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">
                            {user.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {activeTab === 0 ? (
                            <div className="grid gap-2 md:grid-cols-2">
                              <DropdownSelect
                                value={assignments[user.id]?.company ?? (user.company !== 'Unknown' ? user.company : '')}
                                onChange={(value) => handleAssignmentChange(user.id, 'company', value)}
                                placeholder="All companies"
                                buttonClassName="min-h-0 rounded-xl px-3 py-2 text-xs"
                                optionClassName="rounded-xl px-2.5 py-2"
                                maxPanelHeightClassName="max-h-48"
                                options={(meta?.companies ?? []).map((company) => ({ value: company, label: company }))}
                              />

                              <DropdownSelect
                                value={assignments[user.id]?.department ?? (user.department !== 'Unknown' ? user.department : '')}
                                onChange={(value) => handleAssignmentChange(user.id, 'department', value)}
                                placeholder="All departments"
                                buttonClassName="min-h-0 rounded-xl px-3 py-2 text-xs"
                                optionClassName="rounded-xl px-2.5 py-2"
                                maxPanelHeightClassName="max-h-48"
                                options={(meta?.departments ?? []).map((department) => ({
                                  value: department,
                                  label: department,
                                }))}
                              />
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#0f7cb8]/8 px-2.5 py-1 text-xs font-semibold text-[#163b63]">
                                {user.company !== 'Unknown' ? user.company : 'All companies'}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {user.department !== 'Unknown' ? user.department : 'All departments'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[displayStatus] || 'bg-slate-100 text-slate-700'}`}>
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {activeTab === 0 ? (
                              <>
                                <button onClick={() => deny(user.id)} className="btn-danger px-2.5 py-1 text-xs" title="Deny">
                                  <X className="h-3.5 w-3.5" />
                                  Deny
                                </button>
                                <button onClick={() => approve(user)} className="btn-primary px-2.5 py-1 text-xs" title="Approve">
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                              </>
                            ) : activeTab === 1 ? (
                              <button onClick={() => openEdit(user)} className="btn-secondary px-2.5 py-1 text-xs" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 lg:hidden">
              {users.map((user) => {
                const displayStatus = (user.status || (activeTab === 0 ? 'pending' : activeTab === 3 ? 'denied' : 'active')).toLowerCase()
                return (
                  <div key={user.id} className="rounded-[16px] border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">
                            {user.role.replace('_', ' ')}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[displayStatus] || 'bg-slate-100 text-slate-700'}`}>
                            {displayStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#0f7cb8]/8 px-2.5 py-1 text-xs font-semibold text-[#163b63]">
                        {user.company !== 'Unknown' ? user.company : 'All companies'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {user.department !== 'Unknown' ? user.department : 'All departments'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeTab === 0 ? (
                        <>
                          <button onClick={() => deny(user.id)} className="btn-danger px-2.5 py-1 text-xs">
                            <X className="h-3.5 w-3.5" />
                            Deny
                          </button>
                          <button onClick={() => approve(user)} className="btn-primary px-2.5 py-1 text-xs">
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        </>
                      ) : activeTab === 1 ? (
                        <button onClick={() => openEdit(user)} className="btn-secondary px-2.5 py-1 text-xs">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First Name</label>
              <input
                className="input"
                value={form.first_name}
                onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                className="input"
                value={form.last_name}
                onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div className="surface-muted px-3 py-2 text-sm text-slate-500">
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
                  options={(meta?.departments ?? []).map((department) => ({
                    value: department,
                    label: department,
                  }))}
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
              {form.department_access_mode === 'multiple' ? (
                <p className="mt-1 text-xs text-slate-400">
                  Choose one or more departments from the same dropdown list.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </button>
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
