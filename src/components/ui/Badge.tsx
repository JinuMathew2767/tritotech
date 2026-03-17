import clsx from 'clsx'
import { statusColor, statusLabel, priorityColor, priorityLabel } from '@/utils/formatters'

interface BadgeProps {
  label?: string
  className?: string
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={clsx(
        'ui-chip-text inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1',
        statusColor[status] ?? 'bg-slate-100 text-slate-600',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {statusLabel[status] ?? status}
    </span>
  )
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <span
      className={clsx(
        'ui-chip-text inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1',
        priorityColor[priority] ?? 'bg-slate-100 text-slate-600',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {priorityLabel[priority] ?? priority}
    </span>
  )
}

export function Badge({ label, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'ui-chip-text inline-flex items-center gap-1.5 rounded-full border border-[#0f7cb8]/15 bg-[#0f7cb8]/8 px-2.5 py-1 text-[#163b63]',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  )
}

