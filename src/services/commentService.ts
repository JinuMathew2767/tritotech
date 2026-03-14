import api from './api'

export interface Comment {
  id: number
  ticket_id: number
  body: string
  is_internal: boolean
  author: { id: number; name: string; role: string; avatar?: string }
  created_at: string
  attachments?: string[]
}

export interface CreateCommentPayload {
  ticket_id: number
  body: string
  is_internal?: boolean
  attachments?: File[]
}

const commentService = {
  async list(ticketId: number): Promise<Comment[]> {
    const { data } = await api.get<Comment[]>(`/tickets/${ticketId}/comments/`)
    return data
  },

  async create(payload: CreateCommentPayload): Promise<Comment> {
    const { data } = await api.post<Comment>(`/tickets/${payload.ticket_id}/comments/`, {
      body: payload.body,
      is_internal: payload.is_internal ?? false,
    })
    return data
  },
}

export default commentService
