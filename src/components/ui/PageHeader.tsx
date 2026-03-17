import type { ReactNode } from 'react'
import clsx from 'clsx'

interface PageHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <section className={clsx('page-header', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-subtitle">{description}</p> : null}
        </div>

        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>

      {meta ? <div className="page-meta">{meta}</div> : null}
    </section>
  )
}
