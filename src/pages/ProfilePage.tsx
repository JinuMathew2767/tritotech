import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Camera,
  ChevronRight,
  Lock,
  Mail,
  Pencil,
  Phone,
  Save,
  Tags,
  ToggleLeft,
  ToggleRight,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { initials } from '@/utils/formatters'
import toast from 'react-hot-toast'
import userService from '@/services/userService'

type FieldProps = {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: 'text' | 'email' | 'tel'
  icon?: LucideIcon
  editable?: boolean
}

function ProfileField({ label, value, onChange, type = 'text', icon: Icon, editable = false }: FieldProps) {
  const displayValue = value.trim() || '-'
  const isInteractive = editable && !!onChange
  const containerClassName = isInteractive
    ? 'input flex items-center gap-3 border border-rose-300/70 bg-white/70 shadow-[0_0_0_1px_rgba(251,113,133,0.18),0_10px_30px_rgba(244,63,94,0.14),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl'
    : 'input flex items-center gap-3'

  return (
    <div>
      <label className="label mb-2">{label}</label>
      <div className={containerClassName}>
        {Icon ? <Icon className={`h-4 w-4 shrink-0 ${isInteractive ? 'text-rose-400' : 'text-slate-400'}`} /> : null}
        {isInteractive ? (
          <input
            className="min-w-0 flex-1 bg-transparent text-slate-800 outline-none"
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <span className="truncate text-slate-800">{displayValue}</span>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setFirstName(user?.first_name || '')
    setLastName(user?.last_name || '')
    setEmail(user?.email || '')
    setMobileNumber(user?.mobile_number || '')
  }, [user])

  const resetForm = () => {
    setFirstName(user?.first_name || '')
    setLastName(user?.last_name || '')
    setEmail(user?.email || '')
    setMobileNumber(user?.mobile_number || '')
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      await userService.updateMyProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        mobile_number: mobileNumber.trim(),
      })
      await refreshUser()
      setIsEditing(false)
      toast.success('Profile saved')
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const companyDisplay = user?.company?.trim() ? user.company : 'Global Access'
  const departmentDisplay =
    user?.department_access_mode === 'global'
      ? 'Global Access'
      : user?.department_access?.length
        ? user.department_access.join(', ')
        : user?.department?.trim() || 'Global Access'

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:max-w-xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/dashboard" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 text-base font-bold text-slate-900 sm:text-lg">Profile & Preferences</h1>
        {isEditing ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                resetForm()
                setIsEditing(false)
              }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500"
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={() => void saveProfile()}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#4E5A7A]"
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#4E5A7A]"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>

      <div className="mb-8 flex flex-col items-center">
        <div className="relative mb-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#4E5A7A] text-2xl font-extrabold text-white">
            {initials(`${user?.first_name ?? ''} ${user?.last_name ?? ''}`)}
          </div>
          <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#4E5A7A]">
            <Camera className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
        <p className="text-lg font-bold text-slate-900">{user?.first_name} {user?.last_name}</p>
        <p className="text-sm capitalize text-slate-500">{user?.role?.replace('_', ' ')}</p>
        {user?.employee_id ? (
          <span className="mt-2 rounded-full bg-[#4E5A7A]/10 px-3 py-1 text-xs font-semibold text-[#4E5A7A]">
            ID: {user.employee_id}
          </span>
        ) : null}
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Personal Information</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {isEditing ? 'Editing' : 'View Only'}
          </span>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProfileField label="First Name" value={firstName} onChange={setFirstName} editable={isEditing} />
            <ProfileField label="Last Name" value={lastName} onChange={setLastName} editable={isEditing} />
          </div>
          <ProfileField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            icon={Mail}
            editable={isEditing}
          />
          <ProfileField
            label="Mobile Number"
            value={mobileNumber}
            onChange={setMobileNumber}
            type="tel"
            icon={Phone}
            editable={isEditing}
          />
          <ProfileField label="Company" value={companyDisplay} icon={Building2} />
          <ProfileField label="Department" value={departmentDisplay} icon={Tags} />
        </div>
      </div>

      <div className="card mb-4">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Notification Preferences</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { label: 'Email Updates', desc: 'Ticket status changes and replies', state: emailUpdates, set: setEmailUpdates },
            { label: 'Push Notifications', desc: 'Browser push alerts', state: pushNotif, set: setPushNotif },
            { label: 'SMS Alerts', desc: 'Critical ticket alerts via SMS', state: smsAlerts, set: setSmsAlerts },
          ].map(({ label, desc, state, set }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <button onClick={() => set(!state)}>
                {state ? <ToggleRight className="h-8 w-8 text-[#4E5A7A]" /> : <ToggleLeft className="h-8 w-8 text-slate-300" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Security</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-800">Change Password</span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-[#4E5A7A]" />
              <div>
                <p className="text-sm font-medium text-slate-800">Two-Factor Authentication</p>
                <p className="text-xs font-semibold text-[#4E5A7A]">Enabled - Secure</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
