import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchBrandingSettings, getBrandingSettings } from '@/services/brandingService'
import toast from 'react-hot-toast'

const highlights = [
  'Track requests from creation through resolution',
  'Route incidents to the right support team',
  'Measure SLA performance with live dashboards',
  'Manage employee and admin access in one place',
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [branding, setBranding] = useState(() => getBrandingSettings())

  useEffect(() => {
    void fetchBrandingSettings()
      .then((settings) => setBranding(settings))
      .catch(() => undefined)
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await login(email.trim(), password.trim())
      navigate('/dashboard')
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Invalid credentials'
      toast.error(message)
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
          <span className="text-[1.55rem] font-extrabold leading-none tracking-[-0.035em] text-white">{branding.appName}</span>
        </div>

        <div>
          <h1 className="mb-4 text-[3.2rem] font-extrabold leading-[0.96] tracking-[-0.05em] text-white">Welcome back</h1>
          <p className="text-[1.05rem] font-medium leading-8 text-slate-400">
            Sign in to access tickets, dashboards, analytics, and operational controls across the portal.
          </p>
          <div className="mt-10 space-y-3">
            {highlights.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4 text-[15px] font-medium leading-7 tracking-[-0.01em] text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-600">(c) {new Date().getFullYear()} Triton Group. All rights reserved.</p>
      </div>

      <div className="flex flex-1 items-start justify-center px-4 py-6 sm:px-6 sm:py-10 lg:items-center lg:py-12">
        <div className="w-full max-w-md lg:max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#4E5A7A]">
              {branding.logoDataUrl ? (
                <img src={branding.logoDataUrl} alt={`${branding.appName} logo`} className="h-full w-full object-contain bg-white p-1" />
              ) : (
                <Shield className="h-4 w-4 text-white" />
              )}
            </div>
            <span className="text-[1.2rem] font-extrabold leading-none tracking-[-0.03em] text-slate-900">{branding.appName}</span>
          </div>

          <div className="auth-card lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
            <div className="mb-7">
              <h2 className="ui-page-title text-[2rem] sm:text-[2rem]">Sign In</h2>
              <p className="ui-body-muted mt-2">Enter your credentials to access the portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="auth-label">Email address</label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@tritongroup.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="auth-label !mb-0">Password</label>
                  <Link to="/forgot-password" className="text-[13px] font-medium text-[#4E5A7A] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input pr-11"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-[#4E5A7A] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
