import type { LucideIcon } from 'lucide-react'

interface AssetCardProps {
  title: string
  value: number
  helper: string
  icon: LucideIcon
  iconTone: string
  iconBg: string
}

export default function AssetCard({ title, value, helper, icon: Icon, iconTone, iconBg }: AssetCardProps) {
  return (
    <div className="metric-tile">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
          <p className="mt-1.5 text-[1.9rem] font-extrabold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${iconTone}`} />
        </div>
      </div>
    </div>
  )
}
