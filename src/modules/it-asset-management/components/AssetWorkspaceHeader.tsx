import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface AssetHeaderAction {
  label: string
  to: string
  icon?: LucideIcon
  tone?: 'primary' | 'secondary'
}

interface AssetHeaderStat {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

interface AssetWorkspaceHeaderProps {
  badgeIcon: LucideIcon
  badgeLabel: string
  title: string
  description: string
  actions?: AssetHeaderAction[]
  stats?: AssetHeaderStat[]
  compact?: boolean
}

const statToneClasses: Record<NonNullable<AssetHeaderStat['tone']>, string> = {
  default: 'border-slate-300 bg-slate-50 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
}

export default function AssetWorkspaceHeader({
  badgeIcon: BadgeIcon,
  badgeLabel,
  title,
  description,
  actions = [],
  stats = [],
  compact = true,
}: AssetWorkspaceHeaderProps) {
  return (
    <div className={clsx('page-header', compact ? 'gap-3' : 'gap-4')}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="page-eyebrow">
            <BadgeIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            {badgeLabel}
          </div>
          <h1 className={clsx('font-semibold tracking-[-0.04em] text-slate-950', compact ? 'mt-2 text-[1.5rem]' : 'mt-2 text-[1.7rem]')}>
            {title}
          </h1>
          <p className={clsx('text-slate-600', compact ? 'mt-1 text-[13px] leading-6' : 'mt-2 text-[14px] leading-6')}>
            {description}
          </p>
        </div>

        {actions.length > 0 ? (
          <div className="page-header-actions">
            {actions.map(({ label, to, icon: Icon, tone = 'secondary' }) => (
              <Link
                key={`${label}-${to}`}
                to={to}
                className={clsx(tone === 'primary' ? 'btn-primary' : 'btn-secondary', compact ? 'px-3 py-2 text-[12px]' : '')}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                {label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <div className="page-meta">
          {stats.map(({ label, value, tone = 'default' }) => (
            <div
              key={`${label}-${value}`}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold',
                statToneClasses[tone]
              )}
            >
              <span className="mr-1 text-slate-500">{label}:</span>
              <span className="text-current">{value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
