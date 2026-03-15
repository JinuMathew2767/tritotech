import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Camera, ToggleLeft, ToggleRight, ChevronRight, Lock, Pencil, Save, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { initials } from '@/utils/formatters'
import toast from 'react-hot-toast'
import userService from '@/services/userService'

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
    // Pull the latest profile from the hosted API when this screen opens.
    void refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setFirstName(user?.first_name || '')
    setLastName(user?.last_name || '')
    setEmail(user?.email || '')
    setMobileNumber(user?.mobile_number || '')
  }, [user])

  const info = [
    { icon: '🏢', label: 'Company', value: user?.company ?? '—' },
    { icon: '🏷️', label: 'Department', value: user?.department ?? '—' },
  ]

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

  const renderField = ({
    label,
    value,
    onChange,
    type = 'text',
  }: {
    label: string
    value: string
    onChange: (value: string) => void
    type?: 'text' | 'email' | 'tel'
  }) => (
    <div>
      <label className="label">{label}</label>
      {isEditing ? (
        <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="input flex items-center text-slate-800">{value.trim() || '—'}</div>
      )}
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold text-slate-900">Profile & Preferences</h1>
        {isEditing ? (
          <div className="flex items-center gap-2">
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

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-[#4E5A7A] flex items-center justify-center text-white text-2xl font-extrabold">
            {initials(`${user?.first_name ?? ''} ${user?.last_name ?? ''}`)}
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 bg-[#4E5A7A] rounded-full flex items-center justify-center border-2 border-white">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-lg font-bold text-slate-900">{user?.first_name} {user?.last_name}</p>
        <p className="text-sm text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        {user?.employee_id && (
          <span className="mt-2 text-xs font-semibold bg-[#4E5A7A]/10 text-[#4E5A7A] px-3 py-1 rounded-full">
            ID: {user.employee_id}
          </span>
        )}
      </div>

      {/* Personal Information */}
      <div className="card mb-4">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Personal Information</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {isEditing ? 'Editing' : 'View Only'}
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {renderField({ label: 'First Name', value: firstName, onChange: setFirstName })}
            {renderField({ label: 'Last Name', value: lastName, onChange: setLastName })}
          </div>
          {renderField({ label: 'Email', value: email, onChange: setEmail, type: 'email' })}
          {renderField({ label: 'Mobile Number', value: mobileNumber, onChange: setMobileNumber, type: 'tel' })}
        </div>
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {info.map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-[#4E5A7A]/10 rounded-lg flex items-center justify-center text-sm">{icon}</div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-medium text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card mb-4">
        <div className="px-4 py-3 border-b border-slate-100">
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
                {state ? <ToggleRight className="w-8 h-8 text-[#4E5A7A]" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Security</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-800">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Lock className="w-4 h-4 text-[#4E5A7A]" />
              <div>
                <p className="text-sm font-medium text-slate-800">Two-Factor Authentication</p>
                <p className="text-xs text-[#4E5A7A] font-semibold">Enabled · Secure</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

