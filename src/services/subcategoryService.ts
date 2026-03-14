import api from './api'

export interface Subcategory {
  id: number
  category_id: number
  category_name: string
  name: string
  is_active: boolean
  ticket_count: number
}

export interface SubcategoryPayload {
  category_id: number
  name: string
  is_active?: boolean
}

const subcategoryService = {
  async list(params?: { category_id?: number; include_inactive?: boolean }): Promise<Subcategory[]> {
    const { data } = await api.get<Subcategory[]>('/subcategories', {
      params: {
        ...(params?.category_id ? { category_id: params.category_id } : {}),
        ...(params?.include_inactive ? { include_inactive: true } : {}),
      },
    })
    return data
  },

  async create(payload: SubcategoryPayload): Promise<Subcategory> {
    const { data } = await api.post<Subcategory>('/subcategories', payload)
    return data
  },

  async update(subcategoryId: number, payload: SubcategoryPayload): Promise<Subcategory> {
    const { data } = await api.patch<Subcategory>(`/subcategories/${subcategoryId}`, payload)
    return data
  },

  async remove(subcategoryId: number): Promise<void> {
    await api.delete(`/subcategories/${subcategoryId}`)
  },
}

export default subcategoryService
