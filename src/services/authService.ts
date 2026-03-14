import api from './api'

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  company: string
  department: string
  role: string
}

export interface AuthUser {
  id: number
  first_name: string
  last_name: string
  email: string
  role: 'employee' | 'it_staff' | 'admin'
  company: string
  department: string
  avatar?: string
  employee_id?: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: AuthUser
}

export interface ForgotPasswordResponse {
  message: string
  resetToken?: string
  resetUrl?: string
  deliveryMethod?: 'email' | 'local_fallback'
}

const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    return data
  },

  async signup(payload: SignupPayload): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/register', payload)
    return data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('Logout API failed, continuing local clear', error)
    } finally {
      localStorage.clear()
    }
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/auth/me')
    return data
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const { data } = await api.post<ForgotPasswordResponse>('/auth/password-reset', { email })
    return data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>('/auth/password-reset/confirm', { token, password })
    return data
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
}

export default authService
