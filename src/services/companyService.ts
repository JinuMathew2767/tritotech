import api from '@/services/api'

export interface PublicCompany {
  id: number
  name: string
}

const companyService = {
  async listPublic(): Promise<PublicCompany[]> {
    const { data } = await api.get('/companies/public-list')
    return data
  },
}

export default companyService
