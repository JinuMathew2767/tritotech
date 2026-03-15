import clsx from 'clsx'
import { initials } from '@/utils/formatters'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'soft'
  className?: string
}

const sizeMap = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
}

const imageVariantMap = {
  default: 'border border-white/80 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.45)]',
  soft: 'border border-white/90 shadow-[0_8px_18px_-18px_rgba(15,23,42,0.18)]',
}

const fallbackVariantMap = {
  default: 'border border-white/70 bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] text-white shadow-[0_12px_24px_-16px_rgba(78,90,122,0.42)]',
  soft: 'border border-white/90 bg-[#dde6f3] text-[#56627f] shadow-[0_8px_18px_-18px_rgba(15,23,42,0.16)]',
}

export default function Avatar({ name = '', src, size = 'sm', variant = 'default', className }: AvatarProps) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={clsx('flex-shrink-0 rounded-full object-cover', imageVariantMap[variant], sizeMap[size], className)}
    />
  ) : (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-center rounded-full text-center font-semibold leading-none tracking-[0.02em]',
        fallbackVariantMap[variant],
        sizeMap[size],
        className
      )}
    >
      {initials(name)}
    </div>
  )
}

