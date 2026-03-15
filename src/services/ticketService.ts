import api from './api'

export type TicketStatus = 'open' | 'assigned_pending' | 'in_progress' | 'resolved'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Ticket {
  id: number
  ticket_number: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string
  subcategory?: string
  company: string
  department: string
  departments: string[]
  created_by: { id: number; name: string; avatar?: string }
  assigned_to?: { id: number; name: string; avatar?: string }
  created_at: string
  updated_at: string
  customer_expected_resolution_at?: string | null
  support_expected_resolution_at?: string | null
  actual_resolution_at?: string | null
  sla_due?: string | null
  sla_status?: 'none' | 'on_track' | 'overdue' | 'resolved_on_time' | 'resolved_late'
  attachments?: string[]
}

export interface CreateTicketPayload {
  subject: string
  description: string
  priority: TicketPriority
  category: string
  subcategory?: string
  company: string
  department?: string
  departments?: string[]
  customer_expected_resolution_at?: string
  attachments?: File[]
}

export interface TicketListParams {
  status?: TicketStatus
  exclude_status?: TicketStatus
  priority?: TicketPriority
  search?: string
  page?: number
  page_size?: number
  assigned_to?: number
  assigned_to_me?: boolean
  assigned_only?: boolean
  unassigned_only?: boolean
  reopened_only?: boolean
  date_from?: string
  date_to?: string
}

export interface PaginatedTickets {
  count: number
  next: string | null
  previous: string | null
  results: Ticket[]
}

export interface TicketStats {
  active: number
  resolved: number
  total: number
  unassigned: number
  overdue: number
  status_breakdown: Array<{ label: string; value: number }>
  company_breakdown: Array<{ name: string; total: number; open: number; resolved: number; overdue: number; sla_met_pct: number }>
  department_breakdown: Array<{ name: string; total: number; open: number; resolved: number; overdue: number; sla_met_pct: number }>
  daily_trend: Array<{ date: string; day: string; created: number; resolved: number }>
  agent_leaderboard: Array<{ id: number; name: string; resolved: number; avg_resolution_hours: number | null }>
  recent_activity: Array<{ id: number; actor: string; action: string; category: string; created_at: string; ticket_id: number; ticket_number: string | null; old_value?: string | null; new_value?: string | null }>
  sla_analysis: {
    total_closed: number
    avg_customer_expected_hours: number | null
    avg_support_expected_hours: number | null
    avg_actual_resolution_hours: number | null
    met_customer_expectation_pct: number
    met_support_proposal_pct: number
  }
}

const ticketService = {
  async list(params?: TicketListParams): Promise<PaginatedTickets> {
    const { data } = await api.get<PaginatedTickets>('/tickets/', { params })
    return data
  },

  async getById(id: number): Promise<Ticket> {
    const { data } = await api.get<Ticket>(`/tickets/${id}/`)
    return data
  },

  async create(payload: CreateTicketPayload): Promise<Ticket> {
    const { attachments, ...jsonPayload } = payload
    const { data } = await api.post<Ticket>('/tickets/', jsonPayload)
    return data
  },

  async updateStatus(id: number, status: TicketStatus): Promise<Ticket> {
    const { data } = await api.patch<Ticket>(`/tickets/${id}/`, { status })
    return data
  },

  async updateSla(id: number, payload: { status?: TicketStatus; support_expected_resolution_at?: string | null }): Promise<Ticket> {
    const { data } = await api.patch<Ticket>(`/tickets/${id}/`, payload)
    return data
  },

  async assignToMe(id: number): Promise<Ticket> {
    const { data } = await api.post<Ticket>(`/tickets/${id}/assign_self/`)
    return data
  },

  async assignTo(id: number, userId: number): Promise<Ticket> {
    const { data } = await api.post<Ticket>(`/tickets/${id}/assign/`, { user_id: userId })
    return data
  },

  async startTask(id: number): Promise<Ticket> {
    const { data } = await api.post<Ticket>(`/tickets/${id}/start_task/`)
    return data
  },

  async getMyTickets(params?: TicketListParams): Promise<PaginatedTickets> {
    const { data } = await api.get<PaginatedTickets>('/tickets/my/', { params })
    return data
  },

  async getStats(): Promise<TicketStats> {
    const { data } = await api.get<TicketStats>('/tickets/stats/')
    return data
  },
}

export default ticketService
