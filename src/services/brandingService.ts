import api from '@/services/api'

export interface BrandingSettings {
  appName: string
  timezone: string
  logoDataUrl: string | null
}

const STORAGE_KEY = 'tritotech.branding'
const BRANDING_EVENT = 'tritotech:branding-changed'

export const DEFAULT_BRANDING_SETTINGS: BrandingSettings = {
  appName: 'Triton IT Support',
  timezone: 'Asia/Dubai',
  logoDataUrl: null,
}

const normalizeBrandingSettings = (value?: Partial<BrandingSettings> | null): BrandingSettings => ({
  appName: typeof value?.appName === 'string' && value.appName.trim()
    ? value.appName.trim()
    : DEFAULT_BRANDING_SETTINGS.appName,
  timezone: typeof value?.timezone === 'string' && value.timezone.trim()
    ? value.timezone.trim()
    : DEFAULT_BRANDING_SETTINGS.timezone,
  logoDataUrl: typeof value?.logoDataUrl === 'string' && value.logoDataUrl
    ? value.logoDataUrl
    : null,
})

const cacheBrandingSettings = (settings: BrandingSettings) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(BRANDING_EVENT, { detail: settings }))
}

export function getBrandingSettings(): BrandingSettings {
  if (typeof window === 'undefined') return DEFAULT_BRANDING_SETTINGS

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BRANDING_SETTINGS

    return normalizeBrandingSettings(JSON.parse(raw) as Partial<BrandingSettings>)
  } catch {
    return DEFAULT_BRANDING_SETTINGS
  }
}

export function saveBrandingSettings(settings: BrandingSettings) {
  cacheBrandingSettings(normalizeBrandingSettings(settings))
}

export async function fetchBrandingSettings(): Promise<BrandingSettings> {
  const { data } = await api.get('/branding')
  const normalized = normalizeBrandingSettings(data)
  cacheBrandingSettings(normalized)
  return normalized
}

export async function updateBrandingSettings(settings: BrandingSettings): Promise<BrandingSettings> {
  const payload = normalizeBrandingSettings(settings)
  const { data } = await api.patch('/branding', payload)
  const normalized = normalizeBrandingSettings(data)
  cacheBrandingSettings(normalized)
  return normalized
}

export function subscribeToBrandingSettings(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined

  const handleChange = () => callback()

  window.addEventListener(BRANDING_EVENT, handleChange)
  window.addEventListener('storage', handleChange)

  return () => {
    window.removeEventListener(BRANDING_EVENT, handleChange)
    window.removeEventListener('storage', handleChange)
  }
}
