import api from './api'

export interface Notification {
  id: number
  title: string
  body: string
  read: boolean
  created_at: string
  ticket_id?: number
}

export interface NotificationListResponse {
  items: Notification[]
  unread_count: number
}

const notificationService = {
  async list(): Promise<NotificationListResponse> {
    const { data } = await api.get<NotificationListResponse>('/notifications')
    return data
  },

  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}`)
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/mark-all-read')
  },
}

export default notificationService
