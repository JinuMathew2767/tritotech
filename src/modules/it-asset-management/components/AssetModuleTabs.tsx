import { Boxes, CalendarClock, FolderKanban, Repeat2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

type AssetModuleTabId = 'dashboard' | 'master' | 'transactions' | 'analytics'

const tabs: Array<{ id: AssetModuleTabId; label: string; hint: string; to: string; icon: typeof Boxes }> = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Overview and quick actions', to: '/it-assets/dashboard', icon: Boxes },
  { id: 'master', label: 'Asset Master', hint: 'Create and manage records', to: '/it-assets/master', icon: FolderKanban },
  { id: 'transactions', label: 'Asset Transactions', hint: 'Issue, return, and transfer', to: '/it-assets/transactions', icon: Repeat2 },
  { id: 'analytics', label: 'Expiry & Warranty Analytics', hint: 'Renewal and coverage watch', to: '/it-assets/analytics', icon: CalendarClock },
]

const getActiveTab = (pathname: string): AssetModuleTabId => {
  const [, root, section, subsection] = pathname.split('/')

  if (root !== 'it-assets') return 'dashboard'
  if (!section || section === 'dashboard') return 'dashboard'
  if (section === 'analytics') return 'analytics'
  if (section === 'transactions' || subsection === 'transactions') return 'transactions'
  if (section === 'master' || section === 'list' || section === 'add' || subsection === 'edit') return 'master'

  // Asset details pages should stay under the Asset Master tab.
  return 'master'
}

interface AssetModuleTabsProps {
  compact?: boolean
}

export default function AssetModuleTabs({ compact = true }: AssetModuleTabsProps) {
  const location = useLocation()
  const activeTab = getActiveTab(location.pathname)

  return (
    <div className={clsx('card', compact ? 'p-2.5' : 'p-3.5')}>
      <div className={clsx('grid xl:items-center', compact ? 'gap-2.5 xl:grid-cols-[210px_minmax(0,1fr)]' : 'gap-3 xl:grid-cols-[240px_minmax(0,1fr)]')}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">IT Asset Management</p>
          <p className={clsx('mt-1 text-slate-500', compact ? 'text-xs leading-5' : 'text-sm')}>
            Manage inventory, transactions, and renewal visibility from one workspace.
          </p>
        </div>
        <div className={clsx('grid gap-2 sm:grid-cols-2 2xl:grid-cols-4', compact && 'xl:gap-1.5')}>
          {tabs.map(({ id, label, hint, to, icon: Icon }) => (
            <Link
              key={id}
              to={to}
              className={clsx(
                'flex items-start border transition-all',
                compact ? 'gap-2.5 rounded-xl px-3 py-2' : 'gap-3 rounded-2xl px-3.5 py-3',
                activeTab === id
                  ? 'border-[#4E5A7A]/25 bg-[#4E5A7A]/10 text-[#4E5A7A] shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <div
                className={clsx(
                  'mt-0.5 flex flex-shrink-0 items-center justify-center rounded-xl',
                  compact ? 'h-8 w-8' : 'h-9 w-9',
                  activeTab === id ? 'bg-white/80 text-[#4E5A7A]' : 'bg-slate-100 text-slate-500'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className={clsx('font-semibold leading-5', compact ? 'text-[13px]' : 'text-sm')}>{label}</p>
                <p className={clsx('mt-0.5 text-slate-500', compact ? 'hidden text-[11px] leading-4 2xl:block' : 'text-xs leading-5')}>
                  {hint}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
