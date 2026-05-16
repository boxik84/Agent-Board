import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function CompanySettingsPage() {
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: () => api.company.get() })
  const [name, setName] = useState('')
  const [mission, setMission] = useState('')

  useEffect(() => {
    if (company) {
      setName((company as any).name ?? '')
      setMission((company as any).mission ?? '')
    }
  }, [company])

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Nastavenia spoločnosti</h1>
        <p className="text-muted-foreground mt-1 text-sm">Základné informácie o spoločnosti</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Názov spoločnosti</label>
          <input
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Misia</label>
          <textarea
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={3}
            value={mission}
            onChange={e => setMission(e.target.value)}
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            onClick={() => toast.info('Ukladanie nie je ešte implementované')}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Uložiť zmeny
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-muted/10 p-6">
        <h2 className="font-semibold text-foreground mb-1">ID spoločnosti</h2>
        <p className="text-xs text-muted-foreground font-mono">{(company as any)?.id ?? '—'}</p>
      </div>

      <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <h2 className="font-semibold text-destructive mb-1">Nebezpečná zóna</h2>
        <p className="text-xs text-muted-foreground mb-3">Tieto akcie sú nevratné.</p>
        <button
          onClick={() => toast.error('Táto akcia nie je povolená')}
          className="px-4 py-2 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
        >
          Zmazať spoločnosť
        </button>
      </div>
    </div>
  )
}
