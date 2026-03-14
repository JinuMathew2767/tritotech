import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield } from 'lucide-react'
import authService from '@/services/authService'
import companyService from '@/services/companyService'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'
import toast from 'react-hot-toast'

const defaultCompanies = [
  'Triton Middle East LLC',
  'Skymat Building Materials Trading LLC',
  'Smart Insulation Finishing Systems LLC',
  'Innotech Polimers Manufacturing LLC',
  'Triton-UVC Division',
  'Panagia'
]
const departments = [
  'Accounts',
  'Admin',
  'Cleaning',
  'Dispatch',
  'Driver',
  'Finance',
  'HR & Admin',
  'Lab',
  'Maintenance',
  'Molding',
  'Packing',
  'Printing',
  'Production',
  'Purchase',
  'Q.C.',
  'R&D',
  'Sales',
  'Stores',
  'Tape',
  'Design',
  'Process and Compliance',
  'Logistics',
  'Order Management'
]

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', company: '', department: '', role: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState(() => getBrandingSettings())
  const [companies, setCompanies] = useState<string[]>(defaultCompanies)

  useEffect(() => {
    void fetchBrandingSettings()
      .then((settings) => setBranding(settings))
      .catch(() => undefined)

    void companyService
      .listPublic()
      .then((items) => {
        if (items.length > 0) {
          setCompanies(items.map((item) => item.name))
        }
      })
      .catch(() => undefined)
  }, [])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.signup(form)
      toast.success('Account created! Awaiting admin approval.')
      navigate('/login')
    } catch {
      toast.error('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#0a1628] to-[#1a2e3a] p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#4E5A7A]">
            {branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1.5" />
            ) : (
              <Shield className="w-5 h-5 text-white" />
            )}
          </div>
          <span className="text-white font-bold text-xl">{branding.appName}</span>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Join the Triton IT ecosystem
          </h1>
          <p className="text-slate-400">Create your account to start submitting and tracking IT support tickets.</p>
          <div className="mt-8 space-y-3">
            {['Fast ticket submission', 'Real-time status tracking', 'Expert IT staff support', 'Knowledge base access'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="w-5 h-5 rounded-full bg-[#4E5A7A]/20 text-[#4E5A7A] flex items-center justify-center text-xs">✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Triton Group</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f6f7f8] overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden mb-8">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#4E5A7A]">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1" />
              ) : (
                <Shield className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="font-bold text-slate-900">{branding.appName}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
            <p className="text-slate-500 text-sm mt-1">Fill in your details — an admin will approve your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <input className="input" placeholder="John" value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" placeholder="Doe" value={form.last_name} onChange={set('last_name')} required />
              </div>
            </div>

            <div>
              <label className="label">Work email</label>
              <input type="email" className="input" placeholder="john.doe@tritongroup.com" value={form.email} onChange={set('email')} required />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={set('role')} required>
                <option value="">Select role…</option>
                {['Employee', 'IT Staff', 'Admin'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            {form.role !== 'Admin' && form.role !== 'IT Staff' && (
              <>
                <div>
                  <label className="label">Company</label>
                  <select className="input" value={form.company} onChange={set('company')} required>
                    <option value="">Select company…</option>
                    {companies.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Department</label>
                  <select className="input" value={form.department} onChange={set('department')} required>
                    <option value="">Select department…</option>
                    {departments.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#4E5A7A] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

