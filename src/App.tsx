import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicLayout from '@/layouts/PublicLayout'
import AppLayout from '@/layouts/AppLayout'

// Public pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'

// Employee pages
import EmployeeDashboard from '@/pages/employee/Dashboard'
import RaiseTicket from '@/pages/employee/RaiseTicket'
import MyTickets from '@/pages/employee/MyTickets'
import TicketDetail from '@/pages/employee/TicketDetail'

// IT Staff pages
import ITStaffDashboard from '@/pages/itstaff/Dashboard'
import AssignedTickets from '@/pages/itstaff/AssignedTickets'

// Admin pages
import AdminDashboard from '@/pages/admin/Dashboard'
import UserApprovals from '@/pages/admin/UserApprovals'
import Analytics from '@/pages/admin/Analytics'
import RoutingRules from '@/pages/admin/RoutingRules'
import SLAManagement from '@/pages/admin/SLAManagement'
import AuditLogs from '@/pages/admin/AuditLogs'
import AdminSettings from '@/pages/admin/Settings'

// Shared
import ProfilePage from '@/pages/ProfilePage'
import {
  AssetAnalytics,
  AssetDashboard,
  AssetDetails,
  AssetTransactionDocument,
  AssetTransactionHub,
  AssetTransactions,
  AssetList,
  AddAsset,
  EditAsset,
} from '@/modules/it-asset-management'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Employee routes */}
          <Route element={<ProtectedRoute roles={['employee']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<EmployeeDashboard />} />
              <Route path="/tickets" element={<MyTickets />} />
              <Route path="/tickets/new" element={<RaiseTicket />} />
            </Route>
          </Route>

          {/* IT Staff routes */}
          <Route element={<ProtectedRoute roles={['it_staff', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/agent/dashboard" element={<ITStaffDashboard />} />
              <Route path="/agent/tickets" element={<AssignedTickets />} />
              <Route path="/it-assets" element={<Navigate to="/it-assets/dashboard" replace />} />
              <Route path="/it-assets/dashboard" element={<AssetDashboard />} />
              <Route path="/it-assets/master" element={<AssetList />} />
              <Route path="/it-assets/list" element={<Navigate to="/it-assets/master" replace />} />
              <Route path="/it-assets/transactions" element={<AssetTransactionHub />} />
              <Route path="/it-assets/transactions/documents/:transactionNumber" element={<AssetTransactionDocument />} />
              <Route path="/it-assets/analytics" element={<AssetAnalytics />} />
              <Route path="/it-assets/add" element={<AddAsset />} />
              <Route path="/it-assets/:id/transactions" element={<AssetTransactions />} />
              <Route path="/it-assets/:id" element={<AssetDetails />} />
              <Route path="/it-assets/:id/edit" element={<EditAsset />} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/approvals" element={<UserApprovals />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/routing" element={<RoutingRules />} />
              <Route path="/admin/sla" element={<SLAManagement />} />
              <Route path="/admin/audit" element={<AuditLogs />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Shared authenticated routes */}
          <Route element={<ProtectedRoute roles={['employee', 'it_staff', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', fontSize: '14px', fontWeight: 500 },
          success: { iconTheme: { primary: '#4E5A7A', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}

export default App

