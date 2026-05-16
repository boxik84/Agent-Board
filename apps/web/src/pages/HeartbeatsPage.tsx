import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Play, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  succeeded: 'success',
  failed: 'destructive',
  running: 'warning',
  queued: 'secondary',
  cancelled: 'secondary',
}

function RunRow({ run, agents }: { run: any; agents: any[] }) {
  const [expanded, setExpanded] = useState(false)
  const agent = agents.find((a: any) => a.id === run.agentId)
  const duration = run.finishedAt && run.startedAt
    ? Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)
    : null

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant={STATUS_BADGE[run.status] ?? 'secondary'}>{run.status}</Badge>
          <span className="text-sm text-foreground">{agent?.icon ?? '🤖'} {agent?.name ?? '—'}</span>
          <span className="text-xs text-muted-foreground hidden sm:block">{run.invocationSource}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {duration !== null && <span className="text-xs text-muted-foreground">{duration}s</span>}
          <span className="text-xs text-muted-foreground">{new Date(run.startedAt).toLocaleString()}</span>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-3 bg-secondary/20 text-xs space-y-2">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Run ID: <span className="text-foreground font-mono">{run.id.slice(0, 8)}…</span></span>
            {run.finishedAt && <span>Ukončený: <span className="text-foreground">{new Date(run.finishedAt).toLocaleString()}</span></span>}
          </div>
          {run.events && run.events.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-1">Udalosti:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {run.events.map((ev: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground flex-shrink-0">{new Date(ev.createdAt).toLocaleTimeString()}</span>
                    <span className="text-primary flex-shrink-0">[{ev.type}]</span>
                    <span className="text-foreground break-all">{typeof ev.payload === 'string' ? ev.payload : JSON.stringify(ev.payload)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function HeartbeatsPage() {
  const qc = useQueryClient()
  const [filterAgent, setFilterAgent] = useState('')
  const [triggerAgent, setTriggerAgent] = useState('')

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: runs = [] } = useQuery({
    queryKey: ['heartbeats'],
    queryFn: () => api.heartbeats.list(),
    refetchInterval: 5000,
  })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })

  const triggerMut = useMutation({
    mutationFn: (agentId: string) => api.heartbeats.trigger(agentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['heartbeats'] }); toast.success('Heartbeat spustený') },
    onError: (e: any) => toast.error(e.message),
  })

  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')
  const filtered = filterAgent ? (runs as any[]).filter((r: any) => r.agentId === filterAgent) : runs

  const stats = {
    total: (runs as any[]).length,
    succeeded: (runs as any[]).filter((r: any) => r.status === 'succeeded').length,
    failed: (runs as any[]).filter((r: any) => r.status === 'failed').length,
    running: (runs as any[]).filter((r: any) => r.status === 'running').length,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Heartbeats</h1>
        <div className="flex items-center gap-2">
          <Select value={filterAgent} onValueChange={setFilterAgent}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Všetci agenti" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Všetci agenti</SelectItem>
              {activeAgents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.icon} {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={triggerAgent} onValueChange={setTriggerAgent}>
            <SelectTrigger className="w-44"><SelectValue placeholder="— Spustiť agenta —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Spustiť agenta —</SelectItem>
              {activeAgents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.icon} {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={() => triggerAgent && triggerMut.mutate(triggerAgent)}
            disabled={!triggerAgent || triggerMut.isPending}
          >
            <Play size={15} /> Spustiť
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Celkovo', value: stats.total, color: 'text-foreground' },
          { label: 'Úspešné', value: stats.succeeded, color: 'text-green-400' },
          { label: 'Zlyhané', value: stats.failed, color: 'text-red-400' },
          { label: 'Bežiace', value: stats.running, color: 'text-yellow-400' },
        ].map(s => (
          <Card key={s.label} className="py-3 gap-1">
            <CardContent className="text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Run list */}
      <div className="space-y-2">
        {(filtered as any[]).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Žiadne behy. Spustite heartbeat agenta.
          </div>
        ) : (
          (filtered as any[]).map((run: any) => (
            <RunRow key={run.id} run={run} agents={agents as any[]} />
          ))
        )}
      </div>
    </div>
  )
}
