import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, Send } from 'lucide-react'
import clsx from 'clsx'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import AssignTicketModal from '@/components/tickets/AssignTicketModal'
import CalendarField from '@/components/ui/CalendarField'
import DropdownSelect from '@/components/ui/DropdownSelect'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import ticketService, { type Ticket } from '@/services/ticketService'
import commentService, { type Comment } from '@/services/commentService'
import userService, { type PendingUser } from '@/services/userService'
import { formatDateTime, timeAgo, formatDate, formatForDateTimeLocal, localDateTimeToIso } from '@/utils/formatters'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [reply, setReply] = useState('')
  const [assignees, setAssignees] = useState<PendingUser[]>([])
  const [supportExpectedAt, setSupportExpectedAt] = useState('')
  const [ticketStatus, setTicketStatus] = useState<Ticket['status']>('open')
  const [sending, setSending] = useState(false)
  const [savingSla, setSavingSla] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    const tid = parseInt(id)
    const adminRequests = user?.role === 'admin' ? [userService.getActiveUsers()] : [Promise.resolve([] as PendingUser[])]

    Promise.all([ticketService.getById(tid), commentService.list(tid), ...adminRequests])
      .then(([t, c, activeUsers]) => {
        setTicket(t)
        setComments(c)
        const safeSupportExpected =
          t.support_expected_resolution_at && new Date(t.support_expected_resolution_at) < new Date(t.created_at)
            ? t.created_at
            : t.support_expected_resolution_at
        setSupportExpectedAt(formatForDateTimeLocal(safeSupportExpected))
        setTicketStatus(t.status)
        if (user?.role === 'admin') {
          setAssignees(activeUsers.filter((item) => item.role === 'admin' || item.role === 'it_staff'))
        }
      })
      .catch(() => toast.error('Failed to load ticket'))
      .finally(() => setLoading(false))
  }, [id, user?.role])

  const sendReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !ticket || ticket.status === 'resolved') return
    setSending(true)
    try {
      const comment = await commentService.create({ ticket_id: ticket.id, body: reply })
      setComments((prev) => [...prev, comment])
      setReply('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <PageLoader />
  if (!ticket) return <div className="p-6 text-center text-slate-400">Ticket not found.</div>

  const isSupportUser = user?.role === 'admin' || user?.role === 'it_staff'
  const isAdmin = user?.role === 'admin'
  const isResolved = ticket.status === 'resolved'
  const canStartTask =
    !!ticket.assigned_to &&
    ticket.status !== 'resolved' &&
    ticket.status !== 'in_progress' &&
    (isAdmin || ticket.assigned_to.id === user?.id)
  const actualResolutionAt = ticket.actual_resolution_at || null
  const normalizedSupportExpectedAt =
    ticket.support_expected_resolution_at && new Date(ticket.support_expected_resolution_at) < new Date(ticket.created_at)
      ? ticket.created_at
      : ticket.support_expected_resolution_at
  const hoursBetween = (from?: string | null, to?: string | null) =>
    from && to ? ((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60)).toFixed(1) : null
  const getDelta = (expected?: string | null, actual?: string | null) => {
    if (!expected || !actual) return null
    const deltaHours = (new Date(actual).getTime() - new Date(expected).getTime()) / (1000 * 60 * 60)
    const rounded = Math.abs(deltaHours).toFixed(1)
    return {
      text: deltaHours >= 0 ? `+${rounded}h later than expectation` : `-${rounded}h ahead of expectation`,
      tone: deltaHours >= 0 ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50',
    }
  }

  const customerDelta = getDelta(ticket.customer_expected_resolution_at, actualResolutionAt)
  const supportDelta = getDelta(normalizedSupportExpectedAt, actualResolutionAt)
  const slaCards = [
    {
      label: 'Customer Expected',
      value: ticket.customer_expected_resolution_at ? formatDateTime(ticket.customer_expected_resolution_at) : 'Not set',
      sub: hoursBetween(ticket.created_at, ticket.customer_expected_resolution_at) ? `${hoursBetween(ticket.created_at, ticket.customer_expected_resolution_at)} hrs from creation` : null,
    },
    {
      label: 'Support Proposed',
      value: normalizedSupportExpectedAt ? formatDateTime(normalizedSupportExpectedAt) : 'Not set',
      sub: normalizedSupportExpectedAt ? `${hoursBetween(ticket.created_at, normalizedSupportExpectedAt)} hrs from creation` : null,
    },
    {
      label: 'Actual Resolution',
      value: actualResolutionAt ? formatDateTime(actualResolutionAt) : 'Open',
      sub: actualResolutionAt ? `${hoursBetween(ticket.created_at, actualResolutionAt)} hrs actual` : null,
    },
  ]

  const meta = [
    { label: 'Category', value: ticket.category },
    { label: 'Priority', value: <PriorityBadge priority={ticket.priority} /> },
    { label: 'Status', value: <StatusBadge status={ticket.status} /> },
    { label: 'Assignee', value: ticket.assigned_to?.name || 'Unassigned' },
    { label: 'Created', value: formatDate(ticket.created_at) },
  ]
  const conversationItems = [
    {
      id: `request-${ticket.id}`,
      body: ticket.description,
      created_at: ticket.created_at,
      author: {
        id: ticket.created_by.id,
        name: ticket.created_by.name,
        avatar: ticket.created_by.avatar,
        role: 'employee',
      },
      roleLabel: 'Requester',
      isRequest: true,
    },
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      body: comment.body,
      created_at: comment.created_at,
      author: comment.author,
      roleLabel:
        comment.author.role === 'admin'
          ? 'Admin'
          : comment.author.role === 'it_staff'
            ? 'IT Staff'
            : 'Requester',
      isRequest: false,
    })),
  ]

  const handleAssignToMe = async () => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignToMe(ticket.id)
      setTicket(updated)
      setTicketStatus(updated.status)
      setAssignmentModalOpen(false)
      toast.success('Ticket assigned to you and ready to start')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to assign ticket')
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleAssignToUser = async (ticketId: number, userId: number) => {
    try {
      setSavingAssignment(true)
      const updated = await ticketService.assignTo(ticketId, userId)
      setTicket(updated)
      setTicketStatus(updated.status)
      setAssignmentModalOpen(false)
      toast.success('Ticket assigned and moved to Assigned Pending')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update assignee')
    } finally {
      setSavingAssignment(false)
    }
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    if (user?.role === 'employee') {
      navigate('/tickets')
      return
    }

    navigate('/agent/dashboard')
  }

  const persistTicketUpdate = async ({
    status,
    supportExpectedOverride,
    successMessage,
    failureMessage,
  }: {
    status: Ticket['status']
    supportExpectedOverride?: string | null
    successMessage: string
    failureMessage: string
  }) => {
    try {
      setSavingSla(true)
      const nextSupportExpected =
        supportExpectedOverride !== undefined ? supportExpectedOverride : localDateTimeToIso(supportExpectedAt)

      if (nextSupportExpected && new Date(nextSupportExpected) < new Date(ticket.created_at)) {
        toast.error('Support ETA cannot be earlier than the ticket creation time')
        return
      }

      const updated = await ticketService.updateSla(ticket.id, {
        status,
        support_expected_resolution_at: nextSupportExpected,
      })

      setTicket(updated)
      setSupportExpectedAt(formatForDateTimeLocal(updated.support_expected_resolution_at))
      setTicketStatus(updated.status)
      toast.success(successMessage)
    } catch {
      toast.error(failureMessage)
    } finally {
      setSavingSla(false)
    }
  }

  const handleStartTask = async () => {
    try {
      setSavingSla(true)
      const updated = await ticketService.startTask(ticket.id)
      setTicket(updated)
      setTicketStatus(updated.status)
      toast.success('Task started')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start task')
    } finally {
      setSavingSla(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f6f7f8]">
      <div className="border-b border-slate-100 bg-white px-4 py-4 flex-shrink-0">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="mt-0.5 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-[#4E5A7A]">{ticket.ticket_number}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{ticket.subject}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{ticket.category}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{ticket.company}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{formatDate(ticket.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_360px] xl:grid-cols-[minmax(0,1.6fr)_380px]">
          <section className="order-1 flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,252,0.9)_100%)] shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)] lg:min-h-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Conversation</h2>
                <p className="text-xs text-slate-400">
                  {conversationItems.length} message{conversationItems.length === 1 ? '' : 's'}
                </p>
              </div>
              {ticket.assigned_to && (
                <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-white/70 bg-[#4E5A7A]/8 px-3 py-1.5 text-xs font-semibold text-[#4E5A7A] sm:self-auto">
                  <span className="h-2 w-2 rounded-full bg-[#4E5A7A]" />
                  Assigned to {ticket.assigned_to.name}
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(78,90,122,0.06),transparent_30%),linear-gradient(180deg,#f8fafd_0%,#eef3f8_100%)] px-3 py-4 sm:px-4 sm:py-5">
              <div className="space-y-3.5">
                {conversationItems.map((item) => {
                  const isMe = item.author.id === user?.id
                  const isSupportReply = !isMe && item.author.role !== 'employee'
                  const bubbleClassName = isMe
                    ? 'rounded-br-[8px] border-transparent bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] text-white shadow-[0_18px_36px_-22px_rgba(78,90,122,0.52)]'
                    : isSupportReply
                      ? 'rounded-bl-[8px] border border-[#d9e2f2] bg-[linear-gradient(180deg,#f7faff_0%,#eef4ff_100%)] text-slate-800 shadow-[0_16px_30px_-24px_rgba(78,90,122,0.3)]'
                      : 'rounded-bl-[8px] border border-white/85 bg-white text-slate-800 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.2)]'
                  const rolePillClassName = isMe
                    ? 'bg-white/15 text-white/80'
                    : isSupportReply
                      ? 'bg-[#4E5A7A]/10 text-[#4E5A7A]'
                      : 'bg-slate-100 text-slate-500'

                  return (
                    <div key={item.id} className={clsx('flex items-end gap-2.5', isMe ? 'justify-end' : 'justify-start')}>
                      {!isMe && (
                        <Avatar
                          name={item.author.name}
                          src={item.author.avatar}
                          size="sm"
                          className="mb-1 shrink-0 ring-2 ring-white/80"
                        />
                      )}

                      <div className={clsx('max-w-[min(84%,28rem)] min-w-[11.5rem] px-4 py-3.5', bubbleClassName)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={clsx('inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', rolePillClassName)}>
                            {item.roleLabel}
                          </span>
                          <p className={clsx('text-sm font-semibold', isMe ? 'text-white' : 'text-slate-900')}>
                            {item.author.name}
                          </p>
                        </div>

                        <p className={clsx('mt-2 whitespace-pre-wrap text-[15px] leading-7', isMe ? 'text-white' : 'text-slate-700')}>
                          {item.body}
                        </p>

                        <div className={clsx('mt-3 flex items-center justify-between gap-3 text-[11px]', isMe ? 'text-white/65' : 'text-slate-400')}>
                          <span>{item.isRequest ? 'Ticket opened' : 'Reply'}</span>
                          <span>{timeAgo(item.created_at)}</span>
                        </div>
                      </div>

                      {isMe && (
                        <Avatar
                          name={item.author.name}
                          src={item.author.avatar}
                          size="sm"
                          className="mb-1 shrink-0 ring-2 ring-white/80"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <form onSubmit={sendReply} className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
              <div className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-2 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.18)]">
                <button
                  type="button"
                  disabled={isResolved}
                  className="rounded-2xl p-3 text-slate-400 transition-colors hover:bg-slate-50 hover:text-[#4E5A7A] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <textarea
                  className="min-h-[54px] max-h-32 flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                  rows={2}
                  placeholder={isResolved ? 'Ticket is resolved. Reopen it to continue the conversation.' : 'Write a thoughtful reply...'}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  disabled={isResolved}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply(e as unknown as FormEvent)
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isResolved || !reply.trim() || sending}
                  className="rounded-[20px] bg-[linear-gradient(135deg,#5b6785_0%,#434e69_100%)] p-3 text-white shadow-[0_16px_28px_-18px_rgba(78,90,122,0.48)] transition-all hover:-translate-y-0.5 hover:bg-[#1a95d0] active:scale-95 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </section>

          <aside className="order-2 min-h-0 space-y-4 lg:overflow-y-auto lg:pr-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Overview</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {meta.map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <div className="text-sm font-medium text-slate-800">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-400 mb-1">Requester</p>
                <p className="text-sm font-medium text-slate-800">{ticket.created_by.name}</p>
                <p className="text-xs text-slate-500 mt-1">{ticket.company} · {ticket.department}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">SLA Snapshot</h2>
              <div className="mt-4 space-y-3">
                {slaCards.map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <div className="text-sm font-medium text-slate-800">{value}</div>
                    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
                  </div>
                ))}
              </div>
              {(customerDelta || supportDelta) && (
                <div className="mt-3 space-y-2">
                  {customerDelta && (
                    <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${customerDelta.tone}`}>
                      Customer ETA Delta: {customerDelta.text}
                    </div>
                  )}
                  {supportDelta && (
                    <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${supportDelta.tone}`}>
                      Support ETA Delta: {supportDelta.text}
                    </div>
                  )}
                </div>
              )}
            </div>

            {isSupportUser && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Actions</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Support Proposed Resolution Time</label>
                    <CalendarField
                      mode="datetime"
                      value={supportExpectedAt}
                      onChange={setSupportExpectedAt}
                      disabled={isResolved}
                      min={ticket ? formatForDateTimeLocal(ticket.created_at) : undefined}
                      placeholder="Select date and time"
                    />
                  </div>
                  <div>
                    <label className="label">Ticket Status</label>
                    <DropdownSelect
                      value={ticketStatus}
                      onChange={(value) => setTicketStatus(value as Ticket['status'])}
                      disabled={isResolved}
                      options={[
                        { value: 'open', label: 'Open' },
                        ...(ticket.assigned_to ? [{ value: 'assigned_pending', label: 'Assigned Pending' }] : []),
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'resolved', label: 'Resolved' },
                      ]}
                    />
                  </div>

                  {!isResolved ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {canStartTask && (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={savingSla}
                          onClick={handleStartTask}
                        >
                          {savingSla ? 'Starting...' : 'Start Task'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={savingSla}
                        onClick={() =>
                          persistTicketUpdate({
                            status: 'resolved',
                            successMessage: 'Ticket marked as resolved',
                            failureMessage: 'Failed to resolve ticket',
                          })
                        }
                      >
                        Mark Resolved
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={savingSla}
                        onClick={() =>
                          persistTicketUpdate({
                            status: ticketStatus as Ticket['status'],
                            successMessage:
                              ticketStatus === 'resolved' ? 'Ticket marked as resolved' : 'Ticket updated',
                            failureMessage:
                              ticketStatus === 'resolved' ? 'Failed to resolve ticket' : 'Failed to update ticket',
                          })
                        }
                      >
                        {savingSla ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary w-full"
                      disabled={savingSla}
                      onClick={() =>
                        persistTicketUpdate({
                          status: ticket.assigned_to ? 'assigned_pending' : 'open',
                          supportExpectedOverride: ticket.support_expected_resolution_at ?? null,
                          successMessage: 'Ticket reopened',
                          failureMessage: 'Failed to reopen ticket',
                        })
                      }
                    >
                      Reopen Ticket
                    </button>
                  )}

                  {!isResolved && (
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-400 mb-1">Assignment</p>
                      <p className="text-sm font-medium text-slate-800">
                        {ticket.assigned_to ? ticket.assigned_to.name : 'Unassigned'}
                      </p>
                      <div className="mt-3">
                        {isAdmin ? (
                          <button
                            type="button"
                            className="btn-secondary w-full"
                            disabled={savingAssignment}
                            onClick={() => setAssignmentModalOpen(true)}
                          >
                            {ticket.assigned_to ? 'Manage assignment' : 'Assign'}
                          </button>
                        ) : (
                          !ticket.assigned_to && (
                            <button
                              type="button"
                              className="btn-secondary w-full"
                              disabled={savingAssignment}
                              onClick={handleAssignToMe}
                            >
                              {savingAssignment ? 'Assigning...' : 'Assign to me'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <AssignTicketModal
        open={assignmentModalOpen}
        ticket={ticket}
        assignees={assignees}
        saving={savingAssignment}
        currentUserId={user?.id}
        onClose={() => setAssignmentModalOpen(false)}
        onAssignToUser={handleAssignToUser}
        onAssignToMe={async () => {
          await handleAssignToMe()
        }}
      />
    </div>
  )
}

