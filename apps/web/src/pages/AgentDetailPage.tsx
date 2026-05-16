import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Circle, Play, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'instrukcie', label: 'Instrukcie' },
  { id: 'skills', label: 'Skills' },
  { id: 'konfiguracia', label: 'Konfigurácia' },
  { id: 'behy', label: 'Behy' },
  { id: 'rozpocet', label: 'Rozpočet' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 fill-emerald-400',
  running: 'text-blue-400 fill-blue-400',
  idle: 'text-muted-foreground fill-muted-foreground',
  paused: 'text-amber-400 fill-amber-400',
  error: 'text-red-400 fill-red-400',
  terminated: 'text-red-400/50 fill-red-400/50',
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState('dashboard')
  const qc = useQueryClient()

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', id],
    queryFn: () => api.agents.get(id!),
    enabled: !!id,
    refetchInterval: 10000,
  })

  const { data: runs = [] } = useQuery({
    queryKey: ['heartbeats', id],
    queryFn: () => api.heartbeats.list(id),
    enabled: !!id,
    refetchInterval: 10000,
  })

  const { data: costs = [] } = useQuery({
    queryKey: ['costs', id],
    queryFn: () => api.costs.summary(),
    enabled: !!id,
  })

  const { data: files = [] } = useQuery({
    queryKey: ['agent-files', id],
    queryFn: () => api.agents.files.list(id!),
    enabled: !!id,
  })

  const triggerRun = useMutation({
    mutationFn: () => api.heartbeats.trigger(id!, 'Manual trigger from agent detail'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['heartbeats', id] }); toast.success('Beh spustený') },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Načítavam agenta...</div>
  if (!agent) return <div className="p-8 text-muted-foreground text-sm">Agent nenájdený</div>

  const a = agent as any
  const allRuns = runs as any[]
  const agentCosts = (costs as any[]).filter(c => c.agentId === id)
  const agentFiles = files as any[]

  const statusColor = STATUS_COLORS[a.status] ?? STATUS_COLORS.idle

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-0">
        <div className="flex items-start gap-4 mb-6">
          <div className="text-5xl">{a.icon || '🤖'}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{a.name}</h1>
              <div className="flex items-center gap-1.5">
                <Circle size={8} className={statusColor} />
                <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{a.title || a.role}</p>
            {a.description && <p className="text-sm text-muted-foreground mt-2">{a.description}</p>}
          </div>
          <button
            onClick={() => triggerRun.mutate()}
            disabled={triggerRun.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
          >
            <Play size={13} />
            Spustiť
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {tab === 'dashboard' && <DashboardTab agent={a} runs={allRuns} costs={agentCosts} />}
        {tab === 'instrukcie' && <InstrukcieTab files={agentFiles} agentId={id!} />}
        {tab === 'skills' && <SkillsTab agent={a} />}
        {tab === 'konfiguracia' && <KonfiguraciaTab agent={a} agentId={id!} />}
        {tab === 'behy' && <BehyTab runs={allRuns} agentId={id!} />}
        {tab === 'rozpocet' && <RozpocetTab agent={a} costs={agentCosts} />}
      </div>
    </div>
  )
}

function DashboardTab({ agent, runs, costs }: { agent: any; runs: any[]; costs: any[] }) {
  const recent = runs.slice(0, 5)
  const totalRuns = runs.length
  const successRuns = runs.filter(r => r.status === 'completed').length
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0
  const totalCost = costs.reduce((s, c) => s + (c.totalCents ?? 0), 0)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Celkom behov" value={totalRuns} />
        <StatCard label="Úspešnosť" value={`${successRate}%`} />
        <StatCard label="Celkové náklady" value={`$${(totalCost / 100).toFixed(2)}`} />
      </div>

      {/* Last heartbeat */}
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Posledný heartbeat</h3>
        {agent.lastHeartbeatAt ? (
          <p className="text-sm text-foreground">
            {formatDistanceToNow(new Date(agent.lastHeartbeatAt), { addSuffix: true })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Žiadny heartbeat</p>
        )}
      </div>

      {/* Recent runs */}
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Posledné behy</h3>
        {recent.length === 0 && <p className="text-sm text-muted-foreground">Žiadne behy</p>}
        <div className="space-y-2">
          {recent.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 text-sm">
              <RunStatusDot status={r.status} />
              <span className="text-muted-foreground flex-1 truncate">{r.id.slice(0, 8)}…</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InstrukcieTab({ files, agentId }: { files: any[]; agentId: string }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [content, setContent] = useState('')

  const update = useMutation({
    mutationFn: ({ fileId, content }: { fileId: string; content: string }) =>
      api.agents.files.update(agentId, fileId, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-files', agentId] })
      setEditingId(null)
      toast.success('Uložené')
    },
  })

  const FILE_LABELS: Record<string, string> = {
    'soul.md': 'Osobnosť (soul.md)',
    'tools.md': 'Nástroje (tools.md)',
    'heartbeat.md': 'Heartbeat (heartbeat.md)',
    'agents.md': 'Agenti (agents.md)',
  }

  return (
    <div className="max-w-3xl space-y-4">
      {files.length === 0 && (
        <p className="text-sm text-muted-foreground">Žiadne inštrukčné súbory</p>
      )}
      {files.map((f: any) => (
        <div key={f.id} className="rounded-xl border border-border bg-muted/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm font-medium">{FILE_LABELS[f.name] ?? f.name}</span>
            {editingId === f.id ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { update.mutate({ fileId: f.id, content }) }}
                  className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Uložiť
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs px-3 py-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                >
                  Zrušiť
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingId(f.id); setContent(f.content ?? '') }}
                className="text-xs px-3 py-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
              >
                Upraviť
              </button>
            )}
          </div>
          {editingId === f.id ? (
            <textarea
              className="w-full bg-muted/20 px-4 py-3 text-xs font-mono focus:outline-none resize-none"
              rows={12}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          ) : (
            <pre className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-auto max-h-60">
              {f.content || '(prázdny súbor)'}
            </pre>
          )}
        </div>
      ))}
    </div>
  )
}

function SkillsTab(_: { agent: any }) {
  const skills = [
    { name: 'Web Search', icon: '🔍', enabled: true },
    { name: 'Code Execution', icon: '💻', enabled: false },
    { name: 'File Access', icon: '📁', enabled: true },
    { name: 'API Calls', icon: '🔌', enabled: true },
    { name: 'Memory', icon: '🧠', enabled: false },
  ]

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-foreground mb-4">Schopnosti a nástroje dostupné pre agenta.</p>
      <div className="space-y-2">
        {skills.map(s => (
          <div key={s.name} className="flex items-center justify-between rounded-xl border border-border bg-muted/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">{s.icon}</span>
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <div className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              s.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted/40 text-muted-foreground'
            )}>
              {s.enabled ? 'Aktívne' : 'Neaktívne'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function KonfiguraciaTab({ agent, agentId }: { agent: any; agentId: string }) {
  const qc = useQueryClient()
  const [name, setName] = useState(agent.name)
  const [model, setModel] = useState(agent.model ?? 'claude-sonnet-4-6')
  const [description, setDescription] = useState(agent.description ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.agents.update(agentId, { name, model, description })
      qc.invalidateQueries({ queryKey: ['agent', agentId] })
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('Uložené')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Meno agenta</label>
        <input
          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Model</label>
        <select
          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          value={model}
          onChange={e => setModel(e.target.value)}
        >
          <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          <option value="claude-opus-4-7">Claude Opus 4.7</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Popis</label>
        <textarea
          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <div className="pt-1">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Adapter</label>
        <div className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">
          {agent.adapterType}
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? 'Ukladám...' : 'Uložiť zmeny'}
      </button>
    </div>
  )
}

function BehyTab({ runs, agentId }: { runs: any[]; agentId: string }) {
  const qc = useQueryClient()
  const trigger = useMutation({
    mutationFn: () => api.heartbeats.trigger(agentId, 'Manual run'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['heartbeats', agentId] }); toast.success('Beh spustený') },
  })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Všetky behy agenta</p>
        <button
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
        >
          <Zap size={12} />
          Spustiť beh
        </button>
      </div>
      {runs.length === 0 && <p className="text-sm text-muted-foreground">Žiadne behy</p>}
      <div className="space-y-2">
        {runs.map((r: any) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 px-4 py-3">
            <RunStatusDot status={r.status} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-muted-foreground truncate">{r.id}</p>
              {r.summary && <p className="text-sm text-foreground mt-0.5 truncate">{r.summary}</p>}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground capitalize">{r.status}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RozpocetTab({ agent, costs }: { agent: any; costs: any[] }) {
  const totalCents = costs.reduce((s, c) => s + (c.totalCents ?? 0), 0)
  const budget = agent.budgetMonthlyCents ?? 0
  const pct = budget > 0 ? Math.min(100, Math.round((totalCents / budget) * 100)) : 0

  return (
    <div className="max-w-xl space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Mesačný rozpočet" value={`$${(budget / 100).toFixed(2)}`} />
        <StatCard label="Minuté tento mesiac" value={`$${(totalCents / 100).toFixed(4)}`} />
      </div>

      {budget > 0 && (
        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Využitie rozpočtu</span>
            <span className="text-xs font-medium text-foreground">{pct}%</span>
          </div>
          <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {costs.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Náklady podľa modelu</h3>
          <div className="space-y-2">
            {costs.map((c: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground font-mono text-xs">{c.model ?? 'unknown'}</span>
                <span className="text-foreground">${((c.totalCents ?? 0) / 100).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function RunStatusDot({ status }: { status: string }) {
  const color =
    status === 'completed' ? 'bg-emerald-400' :
    status === 'running' ? 'bg-blue-400 animate-pulse' :
    status === 'error' ? 'bg-red-400' :
    'bg-muted-foreground/40'
  return <div className={cn('size-2 rounded-full flex-shrink-0', color)} />
}
