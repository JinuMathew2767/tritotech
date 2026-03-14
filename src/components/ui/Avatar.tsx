import clsx from 'clsx'
import { initials } from '@/utils/formatters'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
}

export default function Avatar({ name = '', src, size = 'sm', className }: AvatarProps) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={clsx('flex-shrink-0 rounded-full border border-white/80 object-cover shadow-[0_10px_22px_-16px_rgba(15,23,42,0.45)]', sizeMap[size], className)}
    />
  ) : (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] font-bold text-white shadow-[0_12px_24px_-16px_rgba(78,90,122,0.42)]',
        sizeMap[size],
        className
      )}
    >
      {initials(name)}
    </div>
  )
}

