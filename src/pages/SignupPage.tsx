import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield } from 'lucide-react'
import authService from '@/services/authService'
import companyService from '@/services/companyService'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'
import DropdownSelect from '@/components/ui/DropdownSelect'
import toast from 'react-hot-toast'

const defaultCompanies = [
  'Triton Middle East LLC',
  'Skymat Building Materials Trading LLC',
  'Smart Insulation Finishing Systems LLC',
  'Innotech Polimers Manufacturing LLC',
  'Triton-UVC Division',
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
  'Order Management',
]

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    company: '',
    department: '',
    role: '',
  })
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

  const setField =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }))

  const setSelect = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
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
    <div className="min-h-screen bg-[#f6f7f8] lg:flex">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0a1628] to-[#1a2e3a] p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-[#4E5A7A]">
            {branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1.5" />
            ) : (
              <Shield className="h-5 w-5 text-white" />
            )}
          </div>
          <span className="text-xl font-bold text-white">{branding.appName}</span>
        </div>

        <div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight text-white">Join the Triton IT ecosystem</h1>
          <p className="text-slate-400">Create your account to start submitting and tracking IT support tickets.</p>
          <div className="mt-8 space-y-3">
            {['Fast ticket submission', 'Real-time status tracking', 'Expert IT staff support', 'Knowledge base access'].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4E5A7A]/20 text-xs text-[#4E5A7A]">+</span>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-600">(c) {new Date().getFullYear()} Triton Group</p>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-10 lg:items-center lg:py-12">
        <div className="w-full max-w-md lg:max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#4E5A7A]">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1" />
              ) : (
                <Shield className="h-4 w-4 text-white" />
              )}
            </div>
            <span className="font-bold text-slate-900">{branding.appName}</span>
          </div>

          <div className="auth-card lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
            <div className="mb-7">
              <h2 className="text-[2rem] font-extrabold tracking-tight text-slate-900">Create Account</h2>
              <p className="mt-1 text-[15px] text-slate-500">Fill in your details so an admin can approve your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="auth-label">First name</label>
                  <input className="auth-input" placeholder="John" value={form.first_name} onChange={setField('first_name')} required />
                </div>
                <div>
                  <label className="auth-label">Last name</label>
                  <input className="auth-input" placeholder="Doe" value={form.last_name} onChange={setField('last_name')} required />
                </div>
              </div>

              <div>
                <label className="auth-label">Work email</label>
                <input type="email" className="auth-input" placeholder="john.doe@tritongroup.com" value={form.email} onChange={setField('email')} required />
              </div>

              <div>
                <label className="auth-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input pr-11"
                    placeholder="min. 8 characters"
                    value={form.password}
                    onChange={setField('password')}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="auth-label">Role</label>
                <DropdownSelect
                  value={form.role}
                  onChange={setSelect('role')}
                  placeholder="Select role..."
                  options={['Employee', 'IT Staff', 'Admin'].map((role) => ({ value: role, label: role }))}
                />
              </div>

              {form.role !== 'Admin' && form.role !== 'IT Staff' && (
                <>
                  <div>
                    <label className="auth-label">Company</label>
                    <DropdownSelect
                      value={form.company}
                      onChange={setSelect('company')}
                      placeholder="Select company..."
                      options={companies.map((company) => ({ value: company, label: company }))}
                    />
                  </div>

                  <div>
                    <label className="auth-label">Department</label>
                    <DropdownSelect
                      value={form.department}
                      onChange={setSelect('department')}
                      placeholder="Select department..."
                      options={departments.map((department) => ({ value: department, label: department }))}
                    />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#4E5A7A] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
