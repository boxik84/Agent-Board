import { useState } from 'react'
import { toast } from 'sonner'
import { Bot } from 'lucide-react'
import { getCompanySettings, saveCompanySettings } from '@/lib/companySettings'

export default function CompanySettingsPage() {
  const saved = getCompanySettings()
  const [name, setName] = useState(saved.name)
  const [logo, setLogo] = useState(saved.logo)
  const [mission, setMission] = useState(saved.mission)

  const handleSave = () => {
    saveCompanySettings({ name, logo, mission })
    toast.success('Nastavenia uložené')
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Nastavenia spoločnosti</h1>
        <p className="text-muted-foreground mt-1 text-sm">Základné informácie o spoločnosti</p>
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-6 space-y-5">
        {/* Logo preview */}
        <div className="flex items-center gap-4 pb-4 border-b border-border/50">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/20 text-primary overflow-hidden flex-shrink-0">
            {logo ? (
              <img src={logo} alt="logo" className="size-12 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <Bot size={22} />
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{name || 'AgentBoard'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{mission || 'Misia spoločnosti...'}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Názov spoločnosti</label>
          <input
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Názov spoločnosti"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Logo URL</label>
          <input
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={logo}
            onChange={e => setLogo(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">URL obrázku loga (zobrazí sa v sidebari)</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Misia spoločnosti</label>
          <textarea
            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            rows={3}
            value={mission}
            onChange={e => setMission(e.target.value)}
            placeholder="Misia a vízia spoločnosti..."
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Uložiť zmeny
          </button>
        </div>
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
