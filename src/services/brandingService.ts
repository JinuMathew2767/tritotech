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

export function getBrandingSettings(): BrandingSettings {
  if (typeof window === 'undefined') return DEFAULT_BRANDING_SETTINGS

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BRANDING_SETTINGS

    const parsed = JSON.parse(raw) as Partial<BrandingSettings>
    return {
      appName: typeof parsed.appName === 'string' && parsed.appName.trim()
        ? parsed.appName
        : DEFAULT_BRANDING_SETTINGS.appName,
      timezone: typeof parsed.timezone === 'string' && parsed.timezone.trim()
        ? parsed.timezone
        : DEFAULT_BRANDING_SETTINGS.timezone,
      logoDataUrl: typeof parsed.logoDataUrl === 'string' && parsed.logoDataUrl
        ? parsed.logoDataUrl
        : null,
    }
  } catch {
    return DEFAULT_BRANDING_SETTINGS
  }
}

export function saveBrandingSettings(settings: BrandingSettings) {
  if (typeof window === 'undefined') return

  const next = {
    appName: settings.appName.trim() || DEFAULT_BRANDING_SETTINGS.appName,
    timezone: settings.timezone.trim() || DEFAULT_BRANDING_SETTINGS.timezone,
    logoDataUrl: settings.logoDataUrl || null,
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(BRANDING_EVENT, { detail: next }))
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
