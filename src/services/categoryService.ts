import api from './api'

export interface Category {
  id: number
  name: string
  description: string | null
  is_active: boolean
  default_assignee_id: number | null
  default_assignee_name: string | null
  ticket_count: number
  subcategory_count: number
  routing_rule_count: number
}

export interface CategoryPayload {
  name: string
  description?: string | null
  is_active?: boolean
}

const categoryService = {
  async list(includeInactive = false): Promise<Category[]> {
    const { data } = await api.get<Category[]>('/categories', {
      params: includeInactive ? { include_inactive: true } : undefined,
    })
    return data
  },

  async create(payload: CategoryPayload): Promise<Category> {
    const { data } = await api.post<Category>('/categories', payload)
    return data
  },

  async update(categoryId: number, payload: CategoryPayload): Promise<Category> {
    const { data } = await api.patch<Category>(`/categories/${categoryId}`, payload)
    return data
  },

  async remove(categoryId: number): Promise<void> {
    await api.delete(`/categories/${categoryId}`)
  },
}

export default categoryService
