import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/ui/Modal'
import type { PendingUser } from '@/services/userService'
import type { Ticket } from '@/services/ticketService'

interface AssignTicketModalProps {
  open: boolean
  ticket: Ticket | null
  assignees: PendingUser[]
  saving: boolean
  currentUserId?: number
  onClose: () => void
  onAssignToUser: (ticketId: number, userId: number) => Promise<void> | void
  onAssignToMe: (ticketId: number) => Promise<void> | void
}

export default function AssignTicketModal({
  open,
  ticket,
  assignees,
  saving,
  currentUserId,
  onClose,
  onAssignToUser,
  onAssignToMe,
}: AssignTicketModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    if (!open || !ticket) return
    setSelectedUserId(ticket.assigned_to?.id ? String(ticket.assigned_to.id) : '')
  }, [open, ticket])

  const selectedAssignee = useMemo(
    () => assignees.find((assignee) => String(assignee.id) === selectedUserId),
    [assignees, selectedUserId]
  )

  return (
    <Modal open={open} onClose={onClose} title="Assign Ticket" size="lg">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold text-[#4E5A7A]">{ticket?.ticket_number}</p>
          <p className="text-sm font-semibold text-slate-900">{ticket?.subject}</p>
          <p className="text-xs text-slate-500 mt-1">
            {ticket?.assigned_to ? `Currently assigned to ${ticket.assigned_to.name}` : 'Currently unassigned'}
          </p>
        </div>

        <div>
          <label className="label">Assign To</label>
          <select
            className="input"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">Select a team member</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.first_name} {assignee.last_name} ({assignee.role.replace('_', ' ')})
              </option>
            ))}
          </select>
          {selectedAssignee && (
            <p className="text-xs text-slate-500 mt-1">
              {selectedAssignee.email}
            </p>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={!ticket || saving || currentUserId === undefined}
            onClick={() => ticket && onAssignToMe(ticket.id)}
          >
            Assign To Me
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              type="button"
              className="btn-primary"
              disabled={!ticket || !selectedUserId || saving}
              onClick={() => ticket && onAssignToUser(ticket.id, Number(selectedUserId))}
            >
              {saving ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

