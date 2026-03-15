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
        <div className="min-w-0 flex-1">
          <div className="min-h-[2.5rem]">
            <p className="ui-metric-label max-w-[12ch]">{title}</p>
          </div>
          <p className="ui-metric-value mt-1.5">{value}</p>
          <p className="ui-metric-helper mt-2 max-w-[19ch]">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-4.5 w-4.5 ${iconTone}`} />
        </div>
      </div>
    </div>
  )
}
