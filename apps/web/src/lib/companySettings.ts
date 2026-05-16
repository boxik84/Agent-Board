import { useState, useEffect } from 'react'

const KEY = 'agentboard_company_settings'

export interface CompanySettings {
  name: string
  logo: string
  mission: string
}

const DEFAULTS: CompanySettings = {
  name: 'AgentBoard',
  logo: '',
  mission: '',
}

export function getCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function saveCompanySettings(s: Partial<CompanySettings>) {
  const current = getCompanySettings()
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...s }))
  window.dispatchEvent(new Event('company-settings-changed'))
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings>(getCompanySettings)

  useEffect(() => {
    const handler = () => setSettings(getCompanySettings())
    window.addEventListener('company-settings-changed', handler)
    return () => window.removeEventListener('company-settings-changed', handler)
  }, [])

  return settings
}
