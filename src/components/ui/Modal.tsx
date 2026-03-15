import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(78,90,122,0.18),transparent_25%),rgba(15,23,42,0.45)] backdrop-blur-md" onClick={onClose} />
      <div className={clsx('relative max-h-[calc(100vh-1.5rem)] w-full overflow-hidden rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(246,250,253,0.84)_100%)] shadow-[0_36px_90px_-42px_rgba(15,23,42,0.65)] backdrop-blur-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-[26px]', sizeMap[size])}>
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90" />
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100/80 px-4 py-4 sm:px-5">
            <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
            <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-4 sm:max-h-[calc(100vh-8rem)] sm:p-5">{children}</div>
      </div>
    </div>
  )
}

