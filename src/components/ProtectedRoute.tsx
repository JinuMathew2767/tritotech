import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { AuthUser } from '@/services/authService'

interface ProtectedRouteProps {
  roles?: AuthUser['role'][]
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#4E5A7A]/30 border-t-[#4E5A7A] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (roles && user && !roles.includes(user.role)) {
    const home = user.role === 'admin' ? '/admin/dashboard' : user.role === 'it_staff' ? '/agent/dashboard' : '/dashboard'
    return <Navigate to={home} replace />
  }

  return <Outlet />
}

