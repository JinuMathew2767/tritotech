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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
    <div className="min-h-screen flex">
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
            Welcome back
          </h1>
          <p className="text-slate-400 text-base">Sign in to access tickets, dashboards, analytics, and operational controls across the portal.</p>
          <div className="mt-10 space-y-3">
            {highlights.map((item) => (
              <div key={item} className="bg-white/5 rounded-xl p-4 border border-white/10 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Triton Group. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#f6f7f8]">
        <div className="w-full max-w-sm">
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
            <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@tritongroup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#4E5A7A] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#4E5A7A] font-semibold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

