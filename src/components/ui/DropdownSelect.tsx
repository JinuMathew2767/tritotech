import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface DropdownOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

type BaseProps = {
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  emptyMessage?: string
  buttonClassName?: string
  panelClassName?: string
  optionClassName?: string
  maxPanelHeightClassName?: string
}

type SingleSelectProps = BaseProps & {
  value: string
  onChange: (value: string) => void
  multiple?: false
}

type MultiSelectProps = BaseProps & {
  value: string[]
  onChange: (value: string[]) => void
  multiple: true
  summaryFormatter?: (selectedLabels: string[]) => string
}

type DropdownSelectProps = SingleSelectProps | MultiSelectProps

const defaultSummaryFormatter = (selectedLabels: string[]) => {
  if (selectedLabels.length === 0) return 'Select option(s)'
  if (selectedLabels.length <= 2) return selectedLabels.join(', ')
  return `${selectedLabels.length} selected`
}

export default function DropdownSelect(props: DropdownSelectProps) {
  const {
    options,
    placeholder = 'Select...',
    disabled = false,
    emptyMessage = 'No options available',
    buttonClassName,
    panelClassName,
    optionClassName,
    maxPanelHeightClassName = 'max-h-56',
  } = props

  const [open, setOpen] = useState(false)
  const [renderPanel, setRenderPanel] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down')
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const [contentMaxHeight, setContentMaxHeight] = useState<number | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      setRenderPanel(true)
      frameRef.current = window.requestAnimationFrame(() => setPanelVisible(true))
      return
    }

    setPanelVisible(false)
    closeTimerRef.current = window.setTimeout(() => {
      setRenderPanel(false)
      closeTimerRef.current = null
    }, 160)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!renderPanel) return

    const updatePanelPosition = () => {
      if (!rootRef.current) return

      const rect = rootRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const gutter = 12
      const offset = 8
      const availableBelow = viewportHeight - rect.bottom - gutter
      const availableAbove = rect.top - gutter
      const openUpward = availableBelow < 220 && availableAbove > availableBelow
      const width = Math.min(rect.width, viewportWidth - gutter * 2)
      const left = Math.min(Math.max(rect.left, gutter), viewportWidth - width - gutter)
      const maxHeight = Math.max(
        140,
        Math.min(openUpward ? availableAbove - offset : availableBelow - offset, 320)
      )

      setOpenDirection(openUpward ? 'up' : 'down')
      setContentMaxHeight(maxHeight)
      setPanelStyle(
        openUpward
          ? {
              position: 'fixed',
              left,
              width,
              bottom: Math.max(viewportHeight - rect.top + offset, gutter),
              zIndex: 80,
            }
          : {
              position: 'fixed',
              left,
              width,
              top: Math.min(rect.bottom + offset, viewportHeight - gutter),
              zIndex: 80,
            }
      )
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [renderPanel])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const optionMap = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])

  const selectedLabels = useMemo(() => {
    if (props.multiple) {
      return props.value.map((value) => optionMap.get(value)?.label || value).filter(Boolean)
    }
    if (!props.value) return []
    return [optionMap.get(props.value)?.label || props.value]
  }, [optionMap, props])

  const summary = props.multiple
    ? (props.summaryFormatter || defaultSummaryFormatter)(selectedLabels)
    : selectedLabels[0] || placeholder

  const toggleValue = (value: string) => {
    if (props.multiple) {
      const nextValue = props.value.includes(value)
        ? props.value.filter((item) => item !== value)
        : [...props.value, value]
      props.onChange(nextValue)
      return
    }

    props.onChange(value)
    setOpen(false)
  }

  const isSelected = (value: string) => (props.multiple ? props.value.includes(value) : props.value === value)

  const panel =
    renderPanel && !disabled
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className={clsx(
              'origin-top transform-gpu rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.28)] backdrop-blur-md transition duration-150 ease-out',
              openDirection === 'up' && 'origin-bottom',
              panelVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : openDirection === 'up'
                  ? 'translate-y-1.5 scale-[0.985] opacity-0'
                  : '-translate-y-1.5 scale-[0.985] opacity-0',
              panelClassName
            )}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">{emptyMessage}</div>
            ) : (
              <div
                style={contentMaxHeight ? { maxHeight: `${contentMaxHeight}px` } : undefined}
                className={clsx('space-y-2 overflow-y-auto pr-1', maxPanelHeightClassName)}
              >
                {options.map((option) => {
                  const selected = isSelected(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => !option.disabled && toggleValue(option.value)}
                      disabled={option.disabled}
                      className={clsx(
                        'flex w-full items-start gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all',
                        selected
                          ? 'border-rose-300/65 bg-rose-50/70 shadow-[0_14px_30px_-26px_rgba(251,113,133,0.38)]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                        option.disabled && 'cursor-not-allowed opacity-50',
                        optionClassName
                      )}
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-[#4E5A7A]">
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-5 text-slate-800">{option.label}</span>
                        {option.description ? (
                          <span className="block text-[11px] leading-4 text-slate-400">{option.description}</span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>,
          document.body
        )
      : null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        className={clsx(
          'input flex w-full items-center justify-between gap-3 text-left transition-colors',
          open && 'border-rose-300 ring-4 ring-rose-200/45',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
          buttonClassName
        )}
      >
        <span className={clsx('truncate', selectedLabels.length === 0 ? 'text-slate-400' : 'text-slate-800')}>
          {summary}
        </span>
        <ChevronDown
          className={clsx(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180 text-[#ef5c7a]'
          )}
        />
      </button>
      {panel}
    </div>
  )
}
