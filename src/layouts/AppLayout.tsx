import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Boxes,
  LayoutDashboard,
  Ticket,
  BarChart2,
  Settings,
  Users,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  FileText,
  Clock,
  Route,
  Inbox,
} from 'lucide-react'
import { initials } from '@/utils/formatters'
import clsx from 'clsx'
import { fetchBrandingSettings, getBrandingSettings, subscribeToBrandingSettings } from '@/services/brandingService'
import notificationService, { type Notification } from '@/services/notificationService'
import { timeAgo } from '@/utils/formatters'

const navByRole = {
  employee: [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'My Tickets', to: '/tickets', icon: Ticket },
  ],
  it_staff: [
    { label: 'Dashboard', to: '/agent/dashboard', icon: LayoutDashboard },
    { label: 'Assigned Tickets', to: '/agent/tickets', icon: Ticket },
    { label: 'IT Assets', to: '/it-assets/dashboard', icon: Boxes },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Ticket Desk', to: '/agent/dashboard', icon: Ticket },
    { label: 'Assigned Tickets', to: '/agent/tickets', icon: Inbox },
    { label: 'IT Assets', to: '/it-assets/dashboard', icon: Boxes },
    { label: 'User Management', to: '/admin/approvals', icon: Users },
    { label: 'Analytics', to: '/admin/analytics', icon: BarChart2 },
    { label: 'Routing', to: '/admin/routing', icon: Route },
    { label: 'SLA', to: '/admin/sla', icon: Clock },
    { label: 'Audit Logs', to: '/admin/audit', icon: FileText },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ],
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [branding, setBranding] = useState(() => getBrandingSettings())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsPanelStyle, setNotificationsPanelStyle] = useState<CSSProperties>({})
  const bellButtonRef = useRef<HTMLButtonElement | null>(null)
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null)

  const role = user?.role ?? 'employee'
  const navItems = navByRole[role] ?? navByRole.employee

  useEffect(() => {
    const unsubscribe = subscribeToBrandingSettings(() => setBranding(getBrandingSettings()))

    void fetchBrandingSettings()
      .then((settings) => setBranding(settings))
      .catch(() => undefined)

    return unsubscribe
  }, [])

  useEffect(() => {
    setNotificationsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!notificationsOpen) return

    const updatePanelPosition = () => {
      if (!bellButtonRef.current) return

      const rect = bellButtonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const gutter = 12
      const panelWidth = Math.min(352, viewportWidth - gutter * 2)
      const left = Math.min(
        Math.max(rect.right - panelWidth, gutter),
        viewportWidth - panelWidth - gutter
      )

      setNotificationsPanelStyle({
        position: 'fixed',
        top: rect.bottom + 10,
        left,
        width: panelWidth,
        zIndex: 120,
      })
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!bellButtonRef.current?.contains(target) && !notificationsPanelRef.current?.contains(target)) {
        setNotificationsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false)
      }
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [notificationsOpen])

  useEffect(() => {
    if (!user) return

    let active = true
    const loadNotifications = async (showLoader = false) => {
      if (showLoader) setNotificationsLoading(true)
      try {
        const data = await notificationService.list()
        if (!active) return
        setNotifications(data.items)
        setUnreadCount(data.unread_count)
      } catch {
        if (!active) return
      } finally {
        if (showLoader && active) setNotificationsLoading(false)
      }
    }

    void loadNotifications(true)
    const intervalId = window.setInterval(() => {
      void loadNotifications(false)
    }, 60000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [user])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleBellToggle = async () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)

    if (nextOpen) {
      setNotificationsLoading(true)
      try {
        const data = await notificationService.list()
        setNotifications(data.items)
        setUnreadCount(data.unread_count)
      } catch {
        setNotifications([])
      } finally {
        setNotificationsLoading(false)
      }
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationService.markRead(notification.id)
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
        )
        setUnreadCount((current) => Math.max(0, current - 1))
      } catch {
        // keep navigation responsive even if read state update fails
      }
    }

    setNotificationsOpen(false)
    if (notification.ticket_id) {
      navigate(`/tickets/${notification.ticket_id}`)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications((current) => current.map((item) => ({ ...item, read: true })))
      setUnreadCount(0)
    } catch {
      // no-op for now
    }
  }

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/60 px-4 py-5">
        <div className="flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/52 px-3 py-3 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)] backdrop-blur-md">
          <div
            className={clsx(
              'flex flex-shrink-0 items-center justify-center overflow-hidden',
              branding.logoDataUrl
                ? 'h-12 w-16 rounded-2xl border border-white/70 bg-white p-1.5 shadow-sm'
                : 'h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] shadow-[0_14px_24px_-18px_rgba(78,90,122,0.45)]'
            )}
          >
            {branding.logoDataUrl ? (
              <img
                src={branding.logoDataUrl}
                alt={`${branding.appName} logo`}
                className="h-full w-full object-contain"
              />
            ) : (
              <Shield className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-bold leading-tight tracking-tight text-slate-900">
              {branding.appName}
            </p>
            <p className="text-xs font-medium capitalize text-slate-400">
              {role.replace('_', ' ')} Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ label, to, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(`${to}/`)
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={clsx(active ? 'sidebar-link-active' : 'sidebar-link')}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/60 px-3 py-3">
        <div
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/65 bg-white/55 p-2.5 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.4)] backdrop-blur-md transition-colors hover:bg-white/75"
          onClick={() => setUserMenuOpen((current) => !current)}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/75 bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] text-xs font-bold text-white shadow-[0_14px_24px_-18px_rgba(78,90,122,0.45)]">
            {initials(`${user?.first_name ?? ''} ${user?.last_name ?? ''}`)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
        {userMenuOpen && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-white/70 bg-white/86 text-sm shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2.5 text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Users className="h-4 w-4" /> Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const notificationsPanel = notificationsOpen
    ? createPortal(
        <div
          ref={notificationsPanelRef}
          style={notificationsPanelStyle}
          className="overflow-hidden rounded-[24px] border border-white/70 bg-white/92 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-400">{unreadCount} unread</p>
            </div>
            <button
              onClick={() => void handleMarkAllRead()}
              className="text-xs font-semibold text-[#4E5A7A] disabled:text-slate-300"
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {notificationsLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  className={clsx(
                    'w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                    !notification.read && 'bg-rose-50/40'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={clsx(
                        'mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full',
                        notification.read ? 'bg-slate-200' : 'bg-rose-400'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        <span className="whitespace-nowrap text-[11px] text-slate-400">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{notification.body}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(78,90,122,0.14),transparent_24%),linear-gradient(180deg,#f4f8fb_0%,#eef3f7_100%)]">
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-white/60 bg-white/72 backdrop-blur-xl lg:flex">
        {renderSidebarContent()}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative h-full w-64 border-r border-white/60 bg-white/82 shadow-xl backdrop-blur-xl">
            <button
              className="absolute right-3 top-3 rounded-xl bg-white/70 p-1.5 text-slate-400 shadow-sm backdrop-blur-md transition-colors hover:text-slate-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-3 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl">
          <button
            className="rounded-2xl border border-white/70 bg-white/70 p-2 text-slate-500 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden max-w-md flex-1 sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full rounded-xl border border-white/75 bg-white/82 py-2 pl-9 pr-4 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-md focus:border-[#4E5A7A] focus:outline-none focus:ring-2 focus:ring-[#4E5A7A]/20"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                ref={bellButtonRef}
                onClick={() => void handleBellToggle()}
                className="relative rounded-2xl border border-white/70 bg-white/70 p-2.5 text-slate-500 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white"
              >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <>
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              ) : null}
              </button>
            </div>
            <Link
              to="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/75 bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] text-xs font-bold text-white shadow-[0_14px_24px_-18px_rgba(78,90,122,0.45)]"
            >
              {initials(`${user?.first_name ?? ''} ${user?.last_name ?? ''}`)}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {notificationsPanel}
    </div>
  )
}

