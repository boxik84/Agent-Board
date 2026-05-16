import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Plus, X, Bot, User, Circle, ChevronDown, Loader2 } from 'lucide-react'
import { BOD_MEMBERS, BOD_BY_ID, BodAvatar } from '@/lib/bod'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Status = 'backlog' | 'in_progress' | 'review' | 'done'
type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  assignedTo: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

const PERSON_IDS = new Set(['user', 'bod-boxik', 'bod-angel', 'bod-torl'])

const COLUMNS: { key: Status; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'text-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-400' },
  { key: 'review', label: 'Review', color: 'text-yellow-400' },
  { key: 'done', label: 'Done', color: 'text-green-400' },
]

const PRIORITY_DOT: Record<Priority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
}

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}

function TaskCard({ task, onMove, onDelete, agentsMap }: { task: Task; onMove: (id: string, status: Status) => void; onDelete: (id: string) => void; agentsMap: Record<string, any> }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const otherStatuses = COLUMNS.filter(c => c.key !== task.status)

  return (
    <div className="group relative bg-card border border-border rounded-xl p-3 space-y-2 hover:border-border/80 transition-all hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug flex-1">{task.title}</p>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Circle size={8} className={cn('fill-current', PRIORITY_DOT[task.priority])} />
          <span className="text-xs text-muted-foreground">{PRIORITY_LABEL[task.priority]}</span>
        </div>

        <AssigneeChip assignedTo={task.assignedTo} agentsMap={agentsMap} />
      </div>

      {/* Move to column */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown size={11} /> Presunúť
        </button>
        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
            {otherStatuses.map(s => (
              <button
                key={s.key}
                onClick={() => { onMove(task.id, s.key); setMenuOpen(false) }}
                className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors', s.color)}
              >
                → {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AssigneeChip({ assignedTo, agentsMap }: { assignedTo: string; agentsMap: Record<string, any> }) {
  const bod = BOD_BY_ID[assignedTo] ?? (assignedTo === 'user' ? BOD_BY_ID['bod-boxik'] : null)
  if (bod) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BodAvatar id={bod.id} size={18} />
        <span>{bod.name}</span>
      </div>
    )
  }
  const agent = agentsMap[assignedTo]
  return (
    <div className="flex items-center gap-1.5 text-xs text-primary">
      <div className="size-[18px] rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs leading-none">{agent?.icon || '🤖'}</span>
      </div>
      <span className="truncate max-w-[90px]">{agent?.name ?? 'Agent'}</span>
    </div>
  )
}

function NewTaskForm({ defaultStatus, onClose, onCreate }: { defaultStatus: Status; onClose: () => void; onCreate: (data: any) => void }) {
  const [form, setForm] = useState({ title: '', description: '', status: defaultStatus, priority: 'medium' as Priority, assignedTo: 'user' as Assignee })

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
      <Input
        autoFocus
        placeholder="Názov úlohy..."
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        className="h-7 text-sm"
        onKeyDown={e => { if (e.key === 'Enter' && form.title.trim()) onCreate(form) }}
      />
      <Textarea
        placeholder="Popis (voliteľné)..."
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        className="text-xs resize-none h-16 bg-transparent"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Priorita</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Priradený</Label>
          <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v as Assignee }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Karol</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs flex-1" onClick={() => form.title.trim() && onCreate(form)}>Vytvoriť</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClose}>Zrušiť</Button>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [newInCol, setNewInCol] = useState<Status | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'persons' | 'agents'>('all')

  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
  })

  const { data: rawAgents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.agents.list(),
  })

  const agentsMap = useMemo(() =>
    Object.fromEntries((rawAgents as any[]).map((a: any) => [a.id, a]))
  , [rawAgents])

  const tasks = (rawTasks as Task[]).filter(t => {
    if (filterAssignee === 'persons') return PERSON_IDS.has(t.assignedTo)
    if (filterAssignee === 'agents') return !PERSON_IDS.has(t.assignedTo)
    return true
  })

  const createMut = useMutation({
    mutationFn: (data: any) => api.tasks.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setNewInCol(null); toast.success('Úloha vytvorená') },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.tasks.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Úloha zmazaná') },
  })

  const allTasks = rawTasks as Task[]
  const total = allTasks.length
  const done = allTasks.filter(t => t.status === 'done').length
  const inProgress = allTasks.filter(t => t.status === 'in_progress').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
      <Loader2 size={18} className="animate-spin" /> Načítavam...
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-foreground">Tasks</h1>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold text-foreground">{inProgress}</span>
                <span className="text-muted-foreground">In progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold text-foreground">{pct}%</span>
                <span className="text-muted-foreground">Completion</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <button
              onClick={() => setFilterAssignee('all')}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', filterAssignee === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              Všetky
            </button>
            <button
              onClick={() => setFilterAssignee('persons')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', filterAssignee === 'persons' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <User size={11} />
              Persons
            </button>
            <button
              onClick={() => setFilterAssignee('agents')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', filterAssignee === 'agents' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <Bot size={11} />
              Agents
            </button>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-0 min-w-max">
          {COLUMNS.map((col, idx) => {
            const colTasks = tasks.filter(t => t.status === col.key)
            return (
              <div key={col.key} className={cn('flex flex-col w-72 h-full', idx > 0 && 'border-l border-border')}>
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold uppercase tracking-wider', col.color)}>{col.label}</span>
                    <Badge variant="secondary" className="text-xs h-4 px-1.5">{colTasks.length}</Badge>
                  </div>
                  <button
                    onClick={() => setNewInCol(col.key)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                  {newInCol === col.key && (
                    <NewTaskForm
                      defaultStatus={col.key}
                      onClose={() => setNewInCol(null)}
                      onCreate={data => createMut.mutate(data)}
                    />
                  )}
                  {colTasks.length === 0 && newInCol !== col.key && (
                    <div className="h-24 flex items-center justify-center border border-dashed border-border/50 rounded-xl">
                      <span className="text-xs text-muted-foreground/40">Žiadne úlohy</span>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agentsMap={agentsMap}
                      onMove={(id, status) => updateMut.mutate({ id, data: { status } })}
                      onDelete={id => deleteMut.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
