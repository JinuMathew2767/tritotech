import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatDate = (iso: string) => format(parseISO(iso), 'MMM d, yyyy')
export const formatDateTime = (iso: string) => format(parseISO(iso), 'MMM d, yyyy · h:mm a')
export const timeAgo = (iso: string) => formatDistanceToNow(parseISO(iso), { addSuffix: true })
export const formatForDateTimeLocal = (iso?: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}
export const localDateTimeToIso = (value?: string | null) => {
  if (!value) return null
  return new Date(value).toISOString()
}

export const formatTicketNumber = (num: string) => num.startsWith('IT-') ? num : `IT-${num}`

export const truncate = (str: string, max = 60) =>
  str.length > max ? str.slice(0, max) + '…' : str

export const initials = (name: string) =>
  name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)

export const statusColor: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  assigned_pending: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
}

export const statusLabel: Record<string, string> = {
  open: 'Open',
  assigned_pending: 'Assigned Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
}

export const priorityColor: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export const priorityLabel: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
