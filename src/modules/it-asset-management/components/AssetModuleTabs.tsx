import { Boxes, CalendarClock, FolderKanban, Repeat2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'

type AssetModuleTabId = 'dashboard' | 'master' | 'transactions' | 'analytics'

const tabs: Array<{ id: AssetModuleTabId; label: string; to: string; icon: typeof Boxes }> = [
  { id: 'dashboard', label: 'Dashboard', to: '/it-assets/dashboard', icon: Boxes },
  { id: 'master', label: 'Asset Master', to: '/it-assets/master', icon: FolderKanban },
  { id: 'transactions', label: 'Transactions', to: '/it-assets/transactions', icon: Repeat2 },
  { id: 'analytics', label: 'Renewals', to: '/it-assets/analytics', icon: CalendarClock },
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
      <div className={clsx('grid gap-2 sm:grid-cols-2 2xl:grid-cols-4', compact && 'xl:gap-1.5')}>
        {tabs.map(({ id, label, to, icon: Icon }) => (
          <Link
            key={id}
            to={to}
            className={clsx(
              'flex border transition-all',
              compact ? 'items-center gap-2.5 rounded-xl px-3 py-2.5' : 'items-center gap-3 rounded-2xl px-3.5 py-3',
              activeTab === id
                ? 'border-[#4E5A7A]/25 bg-[#4E5A7A]/10 text-[#4E5A7A] shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div
              className={clsx(
                'flex flex-shrink-0 items-center justify-center rounded-xl',
                compact ? 'h-8 w-8' : 'h-9 w-9',
                activeTab === id ? 'bg-white/80 text-[#4E5A7A]' : 'bg-slate-100 text-slate-500'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 self-center">
              <p className={clsx('ui-card-title', compact ? 'text-[14px]' : 'text-[15px]')}>{label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
