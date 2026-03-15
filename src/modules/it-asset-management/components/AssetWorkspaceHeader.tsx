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
  default: 'border-slate-200 bg-white/85 text-slate-700',
  success: 'border-emerald-100 bg-emerald-50/90 text-emerald-700',
  warning: 'border-amber-100 bg-amber-50/90 text-amber-700',
  danger: 'border-red-100 bg-red-50/90 text-red-700',
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
    <div className={clsx('card relative overflow-hidden', compact ? 'p-3.5' : 'p-5')}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(78,90,122,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(78,90,122,0.08),transparent_28%)]" />

      <div className={clsx('relative z-10 flex flex-col', compact ? 'gap-3' : 'gap-5')}>
        <div className={clsx('flex flex-col xl:flex-row xl:items-start xl:justify-between', compact ? 'gap-3' : 'gap-4')}>
          <div className="max-w-3xl">
            <div
              className={clsx(
                'inline-flex items-center rounded-full border border-[#4E5A7A]/10 bg-[#4E5A7A]/10 font-semibold uppercase tracking-[0.16em] text-[#4E5A7A]',
                compact ? 'gap-1.5 px-2.5 py-0.5 text-[10px]' : 'gap-2 px-3 py-1 text-[11px]'
              )}
            >
              <BadgeIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {badgeLabel}
            </div>
            <h1
              className={clsx(
                'font-extrabold leading-[0.98] tracking-[-0.05em] text-slate-900',
                compact ? 'mt-2 text-[1.95rem]' : 'mt-3 text-[2.2rem]'
              )}
            >
              {title}
            </h1>
            <p className={clsx('text-slate-500', compact ? 'mt-2 text-[13px] font-medium leading-6' : 'mt-2 text-[14px] font-medium leading-7')}>
              {description}
            </p>
          </div>

          {actions.length > 0 && (
            <div className={clsx('flex flex-wrap items-center xl:justify-end', compact ? 'gap-1.5' : 'gap-2')}>
              {actions.map(({ label, to, icon: Icon, tone = 'secondary' }) => (
                <Link
                  key={`${label}-${to}`}
                  to={to}
                  className={clsx(
                    tone === 'primary' ? 'btn-primary' : 'btn-secondary',
                    compact ? 'gap-1.5 px-3 py-2 text-[12px]' : 'gap-2'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {stats.length > 0 && (
          <div className={clsx('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
            {stats.map(({ label, value, tone = 'default' }) => (
              <div
                key={`${label}-${value}`}
                className={clsx(
                  'border shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)]',
                  compact ? 'rounded-xl px-3 py-1.5' : 'rounded-2xl px-3.5 py-2.5',
                  statToneClasses[tone]
                )}
              >
                <p className="ui-data-label">{label}</p>
                <p className={clsx('font-semibold tracking-[-0.015em] text-current', compact ? 'mt-1 text-[13px] leading-5' : 'mt-1 text-[14px] leading-5')}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
