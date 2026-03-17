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
  default: 'border border-slate-200 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.2)]',
  soft: 'border border-slate-200 shadow-[0_6px_14px_-16px_rgba(15,23,42,0.12)]',
}

const fallbackVariantMap = {
  default: 'border border-[#163b63] bg-[linear-gradient(135deg,#163b63_0%,#0f7cb8_100%)] text-white shadow-[0_10px_20px_-16px_rgba(15,124,184,0.28)]',
  soft: 'border border-slate-200 bg-[#e8f1f8] text-[#163b63] shadow-[0_6px_14px_-16px_rgba(15,23,42,0.12)]',
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
        'relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full',
        fallbackVariantMap[variant],
        sizeMap[size],
        className
      )}
    >
      <span className="absolute inset-0 flex items-center justify-center text-center font-semibold leading-none tracking-[0.02em]">
        {initials(name)}
      </span>
    </div>
  )
}

