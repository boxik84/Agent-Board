import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, Play, Trash2, ChevronDown, ChevronUp, Pause } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'info' | 'destructive' | 'secondary'> = {
  active: 'success',
  idle: 'info',
  running: 'warning',
  paused: 'secondary',
  error: 'destructive',
  terminated: 'secondary',
}

function AgentCard({ agent, allAgents, onTrigger, onUpdate, onTerminate }: any) {
  const [expanded, setExpanded] = useState(false)
  const manager = allAgents.find((a: any) => a.id === agent.reportsTo)
  const budgetPct = agent.budgetMonthlyCents > 0
    ? Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100) : 0

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0">
              {agent.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{agent.name}</span>
                <Badge variant={STATUS_BADGE[agent.status]}>{agent.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {agent.role}{agent.title ? ` · ${agent.title}` : ''}
                {manager ? ` · Reports to ${manager.name}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="icon-sm" variant="ghost" onClick={() => onTrigger(agent.id)} title="Trigger heartbeat">
              <Play size={14} />
            </Button>
            {agent.status === 'paused' && (
              <Button size="icon-sm" variant="ghost" onClick={() => onUpdate(agent.id, { status: 'active' })} title="Obnoviť">
                <Pause size={14} />
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" onClick={() => onTerminate(agent.id)} title="Ukončiť" className="hover:text-destructive">
              <Trash2 size={14} />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>
        </div>

        {agent.budgetMonthlyCents > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Rozpočet</span>
              <span>${(agent.spentMonthlyCents / 100).toFixed(2)} / ${(agent.budgetMonthlyCents / 100).toFixed(2)}</span>
            </div>
            <Progress value={Math.min(budgetPct, 100)} className={budgetPct >= 80 ? '[&>div]:bg-destructive' : ''} />
          </div>
        )}

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Adapter: <span className="text-foreground">{agent.adapterType}</span></span>
            <span>Posledný heartbeat: <span className="text-foreground">
              {agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toLocaleString() : 'Nikdy'}
            </span></span>
            {agent.reportsTo && <span>Reports to: <span className="text-foreground">{manager?.name ?? agent.reportsTo}</span></span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AgentsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', title: '', icon: '🤖', reportsTo: '', budgetMonthlyCents: 0 })

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })

  const createMut = useMutation({
    mutationFn: (data: object) => api.agents.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); setShowForm(false); toast.success('Agent vytvorený') },
    onError: (e: any) => toast.error(e.message),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.agents.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  })
  const terminateMut = useMutation({
    mutationFn: (id: string) => api.agents.terminate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent ukončený') },
  })
  const triggerMut = useMutation({
    mutationFn: (agentId: string) => api.heartbeats.trigger(agentId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['heartbeats'] }); toast.success('Heartbeat spustený') },
    onError: (e: any) => toast.error(e.message),
  })

  const active = agents.filter((a: any) => a.status !== 'terminated')

  const submitForm = () => {
    if (!form.name.trim() || !form.role.trim()) { toast.error('Vyplňte meno a rolu'); return }
    createMut.mutate({
      ...form,
      companyId: company?.id,
      reportsTo: form.reportsTo || undefined,
      budgetMonthlyCents: Number(form.budgetMonthlyCents),
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Agenti</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={15} /> Pridať agenta
        </Button>
      </div>

      {showForm && (
        <Card className="py-4">
          <CardContent className="space-y-3">
            <h3 className="font-semibold text-foreground">Nový agent</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Meno *</Label>
                <Input placeholder="Meno agenta" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Rola *</Label>
                <Input placeholder="napr. CEO" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Titul</Label>
                <Input placeholder="Titul (voliteľné)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Ikona</Label>
                <Input placeholder="Emoji" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Nadriadený</Label>
                <Select value={form.reportsTo || 'none'} onValueChange={v => setForm(f => ({ ...f, reportsTo: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="— Nadriadený —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Žiadny —</SelectItem>
                    {active.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.icon} {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mesačný rozpočet ($)</Label>
                <Input type="number" min={0} value={form.budgetMonthlyCents / 100}
                  onChange={e => setForm(f => ({ ...f, budgetMonthlyCents: Math.round(Number(e.target.value) * 100) }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submitForm} disabled={createMut.isPending}>
                {createMut.isPending ? 'Vytváram...' : 'Vytvoriť'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Zrušiť</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {active.map((agent: any) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            allAgents={agents}
            onTrigger={(id: string) => triggerMut.mutate(id)}
            onUpdate={(id: string, data: any) => updateMut.mutate({ id, data })}
            onTerminate={(id: string) => terminateMut.mutate(id)}
          />
        ))}
        {active.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            Žiadni agenti. Kliknite na "Pridať agenta".
          </div>
        )}
      </div>
    </div>
  )
}
