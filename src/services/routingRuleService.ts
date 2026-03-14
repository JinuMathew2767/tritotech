import api from './api'

export interface RoutingRule {
  id: number
  name: string
  priority: number
  is_active: boolean
  company_id: number | null
  company: string | null
  department_id: number | null
  department: string | null
  category_id: number | null
  category: string | null
  assignee_user_id: number
  assignee_name: string
  created_at: string
  updated_at: string
  created_by_name: string | null
  updated_by_name: string | null
}

export interface RoutingRuleMeta {
  companies: Array<{ id: number; label: string }>
  departments: Array<{ id: number; label: string }>
  categories: Array<{ id: number; label: string }>
  assignees: Array<{ id: number; label: string; role: string }>
}

export interface RoutingRulePayload {
  name: string
  priority: number
  is_active: boolean
  company_id: number | null
  department_id: number | null
  category_id: number | null
  assignee_user_id: number
}

const routingRuleService = {
  async list(): Promise<RoutingRule[]> {
    const { data } = await api.get<RoutingRule[]>('/routing-rules')
    return data
  },

  async getMeta(): Promise<RoutingRuleMeta> {
    const { data } = await api.get<RoutingRuleMeta>('/routing-rules/meta')
    return data
  },

  async create(payload: RoutingRulePayload): Promise<RoutingRule> {
    const { data } = await api.post<RoutingRule>('/routing-rules', payload)
    return data
  },

  async update(ruleId: number, payload: RoutingRulePayload): Promise<RoutingRule> {
    const { data } = await api.patch<RoutingRule>(`/routing-rules/${ruleId}`, payload)
    return data
  },

  async remove(ruleId: number): Promise<void> {
    await api.delete(`/routing-rules/${ruleId}`)
  },
}

export default routingRuleService
