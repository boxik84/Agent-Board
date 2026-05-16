import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  hire: { label: 'Prijatý', color: 'text-emerald-400' },
  terminate: { label: 'Ukončený', color: 'text-red-400' },
  create: { label: 'Vytvorený', color: 'text-blue-400' },
  update: { label: 'Aktualizovaný', color: 'text-amber-400' },
  delete: { label: 'Zmazaný', color: 'text-red-400' },
  run: { label: 'Spustený', color: 'text-violet-400' },
  complete: { label: 'Dokončený', color: 'text-emerald-400' },
  error: { label: 'Chyba', color: 'text-red-400' },
}

const ENTITY_ICONS: Record<string, string> = {
  agent: '🤖',
  issue: '🎫',
  task: '✅',
  heartbeat: '💓',
  file: '📄',
  team: '👥',
}

export default function ActivityPage() {
  const { data: companyData } = useQuery({ queryKey: ['company'], queryFn: () => api.company.get() })
  const { data: activity = [], isLoading } = useQuery({
    queryKey: ['activity', companyData?.id],
    queryFn: () => api.activity.list(companyData?.id),
    enabled: !!companyData?.id,
    refetchInterval: 15000,
  })

  const entries = activity as any[]

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Aktivita</h1>
        <p className="text-muted-foreground mt-1 text-sm">História udalostí v spoločnosti</p>
      </div>

      {isLoading && <div className="text-muted-foreground text-sm">Načítavam...</div>}

      {!isLoading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Activity size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Žiadna aktivita</p>
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        {entries.length > 0 && (
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        )}

        <div className="space-y-1">
          {entries.map((e: any) => {
            const action = ACTION_LABELS[e.action] ?? { label: e.action, color: 'text-muted-foreground' }
            const entityIcon = ENTITY_ICONS[e.entityType] ?? '📋'
            let details: any = {}
            try { details = JSON.parse(e.details || '{}') } catch {}

            return (
              <div key={e.id} className="flex gap-4 pl-2">
                {/* Dot */}
                <div className="flex flex-col items-center">
                  <div className="size-4 rounded-full bg-muted border-2 border-border mt-3 flex-shrink-0 z-10" />
                </div>
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg leading-none">{entityIcon}</span>
                    <span className={`text-sm font-medium ${action.color}`}>{action.label}</span>
                    {details.name && (
                      <span className="text-sm text-foreground font-medium">"{details.name}"</span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{e.entityType}</span>
                    <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {e.actorId && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {e.actorType === 'user' ? 'Používateľ' : e.actorType === 'agent' ? 'Agent' : 'Systém'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
