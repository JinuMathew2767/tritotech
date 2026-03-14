import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-2 justify-center">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-xl border border-white/70 bg-white/76 p-2 text-slate-500 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all ${
            p === page
              ? 'bg-[linear-gradient(135deg,#4E5A7A_0%,#1480b8_100%)] text-white shadow-[0_12px_24px_-18px_rgba(20,128,184,0.8)]'
              : 'border border-white/70 bg-white/76 text-slate-600 shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:bg-white'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-xl border border-white/70 bg-white/76 p-2 text-slate-500 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

