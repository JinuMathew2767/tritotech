import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Link as LinkIcon, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import authService from '@/services/authService'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'local_fallback' | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authService.forgotPassword(email.trim())
      setResetUrl(response.resetUrl ?? null)
      setDeliveryMethod(response.deliveryMethod ?? null)
      toast.success(response.message)
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Unable to generate a reset link'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] px-4 py-6 sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-12">
      <div className="card w-full max-w-md p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#4E5A7A] rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Forgot Password</h1>
            <p className="text-sm text-slate-500">Generate a reset link for your account</p>
          </div>
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

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Generating link...' : 'Send reset link'}
          </button>
        </form>

        {resetUrl && (
          <div className="mt-6 rounded-xl border border-[#4E5A7A]/20 bg-[#4E5A7A]/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <LinkIcon className="w-4 h-4 text-[#4E5A7A]" />
              Reset link ready
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {deliveryMethod === 'local_fallback'
                ? 'Email delivery is unavailable right now, so you can continue with the local reset link below.'
                : 'Email delivery is simulated in this local setup, so you can open the generated link directly.'}
            </p>
            <a href={resetUrl} className="mt-3 inline-flex text-sm font-semibold text-[#4E5A7A] hover:underline">
              Open reset page
            </a>
          </div>
        )}

        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

