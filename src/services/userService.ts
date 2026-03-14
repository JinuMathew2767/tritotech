import api from './api'

export interface PendingUser {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  company: string
  department: string
  status?: string
  requested_at: string
}

export interface UserMeta {
  roles: Array<{ id: number; label: string; value: string }>
  companies: string[]
  departments: string[]
  statuses: string[]
}

export interface UserUpdatePayload {
  first_name: string
  last_name: string
  email: string
  role?: string
  company?: string
  department?: string
  status?: string
}

const userService = {
  async getAllUsers(status?: string): Promise<PendingUser[]> {
    const { data } = await api.get<PendingUser[]>('/users', { params: status ? { status } : undefined })
    return data
  },

  async getMeta(): Promise<UserMeta> {
    const { data } = await api.get<UserMeta>('/users/meta')
    return data
  },

  async getPendingUsers(): Promise<PendingUser[]> {
    const { data } = await api.get<PendingUser[]>('/users/pending')
    return data
  },

  async getActiveUsers(): Promise<PendingUser[]> {
    const { data } = await api.get<PendingUser[]>('/users/active')
    return data
  },

  async getDeniedUsers(): Promise<PendingUser[]> {
    const { data } = await api.get<PendingUser[]>('/users/denied')
    return data
  },

  async approveUser(userId: number, company?: string, department?: string): Promise<{ message: string }> {
    const { data } = await api.put<{ message: string }>(`/users/${userId}/approve`, { company, department })
    return data
  },

  async denyUser(userId: number): Promise<{ message: string }> {
    const { data } = await api.put<{ message: string }>(`/users/${userId}/deny`)
    return data
  },

  async updateUser(userId: number, payload: UserUpdatePayload): Promise<PendingUser> {
    const { data } = await api.patch<PendingUser>(`/users/${userId}`, payload)
    return data
  },

  async updateMyProfile(payload: Pick<UserUpdatePayload, 'first_name' | 'last_name' | 'email'>): Promise<PendingUser> {
    const { data } = await api.patch<PendingUser>('/users/me', payload)
    return data
  }
}

export default userService
