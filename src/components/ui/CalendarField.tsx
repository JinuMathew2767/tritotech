import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import clsx from 'clsx'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  startOfDay,
  setHours,
  setMinutes,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { createPortal } from 'react-dom'

type CalendarMode = 'date' | 'datetime'

type CalendarFieldProps = {
  value: string
  onChange: (value: string) => void
  mode?: CalendarMode
  placeholder?: string
  disabled?: boolean
  min?: string
  max?: string
  allowClear?: boolean
  defaultTime?: string
  buttonClassName?: string
  panelClassName?: string
}

const DATE_FORMAT = 'yyyy-MM-dd'
const DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm"
const WEEK_STARTS_ON = 6
const WEEKDAY_LABELS = ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']

const parseCalendarValue = (value: string, mode: CalendarMode) => {
  if (!value.trim()) return null
  const parsed = parse(value, mode === 'datetime' ? DATETIME_FORMAT : DATE_FORMAT, new Date())
  return isValid(parsed) ? parsed : null
}

const clampToDay = (value: Date) => startOfDay(value)

const isOutOfRange = (day: Date, minDate: Date | null, maxDate: Date | null) => {
  const normalizedDay = clampToDay(day)
  if (minDate && isBefore(normalizedDay, clampToDay(minDate))) return true
  if (maxDate && isAfter(normalizedDay, clampToDay(maxDate))) return true
  return false
}

export default function CalendarField({
  value,
  onChange,
  mode = 'date',
  placeholder,
  disabled = false,
  min,
  max,
  allowClear = true,
  defaultTime = '09:00',
  buttonClassName,
  panelClassName,
}: CalendarFieldProps) {
  const selectedDate = useMemo(() => parseCalendarValue(value, mode), [mode, value])
  const minDate = useMemo(() => parseCalendarValue(min ?? '', mode), [min, mode])
  const maxDate = useMemo(() => parseCalendarValue(max ?? '', mode), [max, mode])

  const [open, setOpen] = useState(false)
  const [renderPanel, setRenderPanel] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down')
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate ?? new Date())
  const [draftTime, setDraftTime] = useState(() => (selectedDate ? format(selectedDate, 'HH:mm') : defaultTime))

  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    setViewDate(selectedDate ?? new Date())
    setDraftTime(selectedDate ? format(selectedDate, 'HH:mm') : defaultTime)
  }, [defaultTime, selectedDate])

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
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
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
      const offset = 10
      const availableBelow = viewportHeight - rect.bottom - gutter
      const availableAbove = rect.top - gutter
      const openUpward = availableBelow < 320 && availableAbove > availableBelow
      const preferredWidth = mode === 'datetime' ? 340 : 312
      const width = Math.min(preferredWidth, viewportWidth - gutter * 2)
      const left = Math.min(Math.max(rect.right - width, gutter), viewportWidth - width - gutter)

      setOpenDirection(openUpward ? 'up' : 'down')
      setPanelStyle(
        openUpward
          ? {
              position: 'fixed',
              left,
              width,
              bottom: Math.max(viewportHeight - rect.top + offset, gutter),
              zIndex: 140,
            }
          : {
              position: 'fixed',
              left,
              width,
              top: Math.min(rect.bottom + offset, viewportHeight - gutter),
              zIndex: 140,
            }
      )
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [renderPanel])

  const calendarDays = useMemo(() => {
    const intervalStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: WEEK_STARTS_ON })
    const intervalEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: WEEK_STARTS_ON })
    return eachDayOfInterval({ start: intervalStart, end: intervalEnd })
  }, [viewDate])

  const displayLabel = selectedDate
    ? format(selectedDate, mode === 'datetime' ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy')
    : placeholder || (mode === 'datetime' ? 'Select date and time' : 'dd/mm/yyyy')

  const commitDate = (day: Date, closeAfterSelect = mode === 'date') => {
    if (isOutOfRange(day, minDate, maxDate)) return

    if (mode === 'datetime') {
      const [hours, minutes] = draftTime.split(':').map((part) => Number(part))
      const nextValue = format(setMinutes(setHours(day, hours || 0), minutes || 0), DATETIME_FORMAT)
      onChange(nextValue)
      setViewDate(day)
      if (closeAfterSelect) setOpen(false)
      return
    }

    onChange(format(day, DATE_FORMAT))
    setViewDate(day)
    if (closeAfterSelect) setOpen(false)
  }

  const handleTimeChange = (timeValue: string) => {
    setDraftTime(timeValue)
    const baseDate = selectedDate ?? viewDate ?? new Date()
    const [hours, minutes] = timeValue.split(':').map((part) => Number(part))
    onChange(format(setMinutes(setHours(baseDate, hours || 0), minutes || 0), DATETIME_FORMAT))
  }

  const handleToday = () => {
    const now = new Date()
    setViewDate(now)

    if (mode === 'datetime') {
      const nextTime = format(now, 'HH:mm')
      setDraftTime(nextTime)
      onChange(format(now, DATETIME_FORMAT))
      return
    }

    onChange(format(now, DATE_FORMAT))
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
  }

  const panel =
    renderPanel && !disabled
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className={clsx(
              'origin-top transform-gpu overflow-hidden rounded-[18px] border border-slate-200 bg-white p-2.5 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.24)] transition duration-150 ease-out',
              openDirection === 'up' && 'origin-bottom',
              panelVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : openDirection === 'up'
                  ? 'translate-y-1.5 scale-[0.985] opacity-0'
                  : '-translate-y-1.5 scale-[0.985] opacity-0',
              panelClassName
            )}
          >
            <div className="rounded-[16px] border border-slate-200 bg-slate-50/80 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="ui-kicker">
                    {mode === 'datetime' ? 'Date And Time' : 'Calendar'}
                  </p>
                  <p className="ui-section-title mt-0.5">{format(viewDate, 'MMMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewDate((current) => addMonths(current, -1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-400 hover:text-slate-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDate((current) => addMonths(current, 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-400 hover:text-slate-800"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {mode === 'datetime' && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="time"
                    value={draftTime}
                    onChange={(event) => handleTimeChange(event.target.value)}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none"
                  />
                </div>
              )}

              <div className="mt-3 grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
                  >
                    {label}
                  </div>
                ))}

                {calendarDays.map((day) => {
                  const selected = selectedDate ? isSameDay(day, selectedDate) : false
                  const muted = !isSameMonth(day, viewDate)
                  const disabledDay = isOutOfRange(day, minDate, maxDate)
                  const today = isToday(day)

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => commitDate(day)}
                      disabled={disabledDay}
                      className={clsx(
                        'flex h-9 items-center justify-center rounded-xl text-sm font-semibold transition-all',
                        selected
                          ? 'bg-[linear-gradient(135deg,#163b63_0%,#0f7cb8_100%)] text-white shadow-[0_12px_24px_-18px_rgba(15,124,184,0.35)]'
                          : today
                            ? 'border border-[#0f7cb8]/25 bg-[#0f7cb8]/8 text-[#163b63]'
                            : 'text-slate-700 hover:bg-slate-100/80',
                        muted && !selected && 'text-slate-300',
                        disabledDay && 'cursor-not-allowed opacity-35'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  onClick={handleToday}
                  className="rounded-xl border border-[#0f7cb8]/20 bg-[#0f7cb8]/8 px-3 py-1.5 text-xs font-semibold text-[#163b63] transition-colors hover:bg-[#0f7cb8]/12"
                >
                  {mode === 'datetime' ? 'Now' : 'Today'}
                </button>
                <div className="flex items-center gap-2">
                  {allowClear && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  )}
                  {mode === 'datetime' && (
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-[#123251] bg-[linear-gradient(135deg,#163b63_0%,#0f7cb8_100%)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_24px_-18px_rgba(15,124,184,0.35)]"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
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
          'input flex w-full items-center justify-between gap-3 text-left transition-all',
          open && 'border-[#0f7cb8] ring-2 ring-[#0f7cb8]/12',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
          buttonClassName
        )}
      >
        <span className={clsx('truncate', selectedDate ? 'text-slate-800' : 'text-slate-400')}>
          {displayLabel}
        </span>
        <CalendarDays className={clsx('h-4 w-4 shrink-0 transition-colors', open ? 'text-[#163b63]' : 'text-slate-400')} />
      </button>
      {panel}
    </div>
  )
}
