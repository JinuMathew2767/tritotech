import api from './api'

export interface Notification {
  id: number
  title: string
  body: string
  read: boolean
  created_at: string
  ticket_id?: number
}

const notificationService = {
  async list(): Promise<Notification[]> {
    const { data } = await api.get<Notification[]>('/notifications/')
    return data
  },

  async markRead(id: number): Promise<void> {
    await api.patch(`/notifications/${id}/`, { read: true })
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/mark_all_read/')
  },
}

export default notificationService
