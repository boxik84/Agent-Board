import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, ArrowRight, Flag, Tag, User, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'text-zinc-400', dot: 'bg-zinc-400' },
  { key: 'todo', label: 'To Do', color: 'text-blue-400', dot: 'bg-blue-400' },
  { key: 'in_progress', label: 'In Progress', color: 'text-violet-400', dot: 'bg-violet-400' },
  { key: 'in_review', label: 'In Review', color: 'text-orange-400', dot: 'bg-orange-400' },
  { key: 'done', label: 'Done', color: 'text-green-400', dot: 'bg-green-400' },
]

const PRIORITY_ICON: Record<string, { icon: string; color: string }> = {
  urgent: { icon: '⚡', color: 'text-red-400' },
  high: { icon: '▲', color: 'text-orange-400' },
  medium: { icon: '●', color: 'text-blue-400' },
  low: { icon: '▼', color: 'text-zinc-500' },
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgentná',
  high: 'Vysoká',
  medium: 'Stredná',
  low: 'Nízka',
}


const EMPTY_FORM = {
  title: '',
  description: '',
  status: 'backlog',
  priority: 'medium',
  agentId: '',
  parentId: '',
  labels: '',
}

export default function TicketsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: issues = [] } = useQuery({
    queryKey: ['issues', company?.id],
    queryFn: () => api.issues.list({ companyId: company?.id }),
    enabled: !!company?.id,
  })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })

  const createMut = useMutation({
    mutationFn: (data: object) => api.issues.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] })
      setOpen(false)
      setForm(EMPTY_FORM)
      toast.success('Ticket vytvorený')
    },
    onError: (e: any) => toast.error(e.message),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.issues.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.issues.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  })

  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')

  function handleCreate() {
    const labels = form.labels
      ? form.labels.split(',').map(l => l.trim()).filter(Boolean)
      : []
    createMut.mutate({
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      agentId: form.agentId || undefined,
      parentId: form.parentId || undefined,
      labels,
      companyId: company?.id,
    })
  }

  const issuesByStatus = (status: string) =>
    (issues as any[]).filter((i: any) => i.status === status)

  const totalByStatus = (status: string) => issuesByStatus(status).length

  const openCount = (issues as any[]).filter((i: any) => i.status !== 'done').length

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tickety</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{openCount} otvorených</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus size={15} /> Nový ticket
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={() => setFilterStatus(null)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${filterStatus === null ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
        >
          Všetky
        </button>
        {COLUMNS.map(col => (
          <button
            key={col.key}
            onClick={() => setFilterStatus(filterStatus === col.key ? null : col.key)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-colors ${filterStatus === col.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          >
            <div className={`size-1.5 rounded-full ${col.dot}`} />
            {col.label}
            <span className="opacity-60">{totalByStatus(col.key)}</span>
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto flex-1 pb-2 min-h-0">
        {COLUMNS.filter(col => filterStatus === null || col.key === filterStatus).map(col => (
          <div key={col.key} className="flex-shrink-0 w-72 flex flex-col gap-2 min-h-0">
            {/* Column header */}
            <div className="flex items-center justify-between px-1 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${col.dot}`} />
                <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded-full">
                {totalByStatus(col.key)}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {issuesByStatus(col.key).map((issue: any) => {
                const agent = (agents as any[]).find((a: any) => a.id === issue.agentId)
                const pi = PRIORITY_ICON[issue.priority]
                return (
                  <Card key={issue.id} className="py-0 gap-0 hover:border-border/80 transition-colors group">
                    <CardContent className="p-3.5">
                      {/* Top row */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-muted-foreground font-mono mb-1">{issue.identifier}</div>
                          <div className="text-sm text-foreground font-medium leading-snug">{issue.title}</div>
                        </div>
                        <span className={`text-sm shrink-0 mt-0.5 ${pi?.color}`} title={issue.priority}>
                          {pi?.icon}
                        </span>
                      </div>

                      {/* Description preview */}
                      {issue.description && (
                        <div className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
                          {issue.description}
                        </div>
                      )}

                      {/* Labels */}
                      {issue.labels && issue.labels !== '[]' && (() => {
                        try {
                          const parsed: string[] = JSON.parse(issue.labels)
                          return parsed.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {parsed.map((l: string) => (
                                <span key={l} className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-accent px-1.5 py-0.5 rounded-full">
                                  <Tag size={8} /> {l}
                                </span>
                              ))}
                            </div>
                          ) : null
                        } catch { return null }
                      })()}

                      {/* Agent + parent */}
                      {(agent || issue.parentId) && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                          {agent && (
                            <span className="flex items-center gap-1">
                              <User size={10} />
                              {agent.name}
                            </span>
                          )}
                          {issue.parentId && (
                            <span className="flex items-center gap-1">
                              <ChevronRight size={10} />
                              {(issues as any[]).find((i: any) => i.id === issue.parentId)?.identifier ?? '—'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Move buttons */}
                      <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        {COLUMNS.filter(c => c.key !== issue.status).map(c => (
                          <button
                            key={c.key}
                            onClick={() => updateMut.mutate({ id: issue.id, data: { status: c.key } })}
                            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent px-1.5 py-0.5 rounded transition-colors"
                          >
                            <ArrowRight size={9} /> {c.label}
                          </button>
                        ))}
                        <button
                          onClick={() => { if (confirm('Zmazať ticket?')) deleteMut.mutate(issue.id) }}
                          className="text-[10px] text-red-400/60 hover:text-red-400 px-1.5 py-0.5 rounded transition-colors ml-auto"
                        >
                          Zmazať
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {issuesByStatus(col.key).length === 0 && (
                <div className="border-2 border-dashed border-border/30 rounded-xl p-4 text-center text-xs text-muted-foreground/40">
                  Žiadne tickety
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Nový ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Názov *</Label>
              <Input
                placeholder="Čo je potrebné urobiť?"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Popis</Label>
              <Textarea
                placeholder="Detailnejší popis ticketu (voliteľné)…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="h-24 resize-none"
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-primary" /> Stav
                </Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map(c => (
                      <SelectItem key={c.key} value={c.key}>
                        <div className="flex items-center gap-2">
                          <div className={`size-1.5 rounded-full ${c.dot}`} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Flag size={13} /> Priorita
                </Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <span className={PRIORITY_ICON[k]?.color}>{PRIORITY_ICON[k]?.icon}</span>
                          {v}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee + Parent */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <User size={13} /> Priradiť agentovi
                </Label>
                <Select
                  value={form.agentId || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, agentId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Bez agenta —</SelectItem>
                    {activeAgents.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <ChevronRight size={13} /> Rodičovský ticket
                </Label>
                <Select
                  value={form.parentId || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, parentId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Žiadny —</SelectItem>
                    {(issues as any[]).map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.identifier} – {i.title.slice(0, 30)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Tag size={13} /> Štítky
              </Label>
              <Input
                placeholder="bug, feature, frontend (oddelené čiarkou)"
                value={form.labels}
                onChange={e => setForm(f => ({ ...f, labels: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleCreate}
                disabled={createMut.isPending || !form.title.trim()}
                className="flex-1"
              >
                {createMut.isPending ? 'Vytváram…' : 'Vytvoriť ticket'}
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setForm(EMPTY_FORM) }}>
                Zrušiť
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
