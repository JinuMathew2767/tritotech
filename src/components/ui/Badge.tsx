import clsx from 'clsx'
import { statusColor, statusLabel, priorityColor, priorityLabel } from '@/utils/formatters'

interface BadgeProps {
  label?: string
  className?: string
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={clsx('ui-chip-text inline-flex items-center gap-1.5 rounded-full border border-white/60 px-2.5 py-1 shadow-sm', statusColor[status] ?? 'bg-slate-100 text-slate-600', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {statusLabel[status] ?? status}
    </span>
  )
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <span className={clsx('ui-chip-text inline-flex items-center gap-1.5 rounded-full border border-white/60 px-2.5 py-1 shadow-sm', priorityColor[priority] ?? 'bg-slate-100 text-slate-600', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {priorityLabel[priority] ?? priority}
    </span>
  )
}

export function Badge({ label, className }: BadgeProps) {
  return (
    <span className={clsx('ui-chip-text inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-[#4E5A7A]/10 px-2.5 py-1 text-[#4E5A7A] shadow-sm', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {label}
    </span>
  )
}

