import api from './api'

export interface DepartmentMaster {
  id: number
  name: string
  location: string
  is_active: boolean
  user_count: number
  employee_count: number
  ticket_count: number
}

export interface DepartmentPayload {
  name: string
  location?: string
  is_active?: boolean
}

const departmentService = {
  async list(includeInactive = false): Promise<DepartmentMaster[]> {
    const { data } = await api.get<DepartmentMaster[]>('/departments', {
      params: includeInactive ? { include_inactive: true } : undefined,
    })
    return data
  },

  async create(payload: DepartmentPayload): Promise<DepartmentMaster> {
    const { data } = await api.post<DepartmentMaster>('/departments', payload)
    return data
  },

  async update(departmentId: number, payload: DepartmentPayload): Promise<DepartmentMaster> {
    const { data } = await api.patch<DepartmentMaster>(`/departments/${departmentId}`, payload)
    return data
  },

  async remove(departmentId: number): Promise<void> {
    await api.delete(`/departments/${departmentId}`)
  },
}

export default departmentService
