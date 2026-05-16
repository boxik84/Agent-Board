import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../api/auth'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useMemo } from 'react'
import { BOD_MEMBERS, BodAvatar } from '@/lib/bod'
import {
  LayoutDashboard,
  Inbox,
  GitBranch,
  Ticket,
  Activity,
  DollarSign,
  Building2,
  LogOut,
  Bot,
  Plus,
  Settings,
  Users,
  Circle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'


function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
      {label}
    </p>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
  end,
}: {
  to: string
  icon: React.ElementType
  label: string
  badge?: number
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )
      }
    >
      <Icon size={14} />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="ml-auto text-xs bg-primary/20 text-primary rounded-full px-1.5 py-0.5 leading-none">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

function AgentNavItem({ id, name, icon, isRunning }: { id: string; name: string; icon: string; isRunning: boolean }) {
  return (
    <NavLink
      to={`/agents/${id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-primary/15 text-primary'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
        )
      }
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {isRunning && (
        <Circle size={6} className="fill-emerald-400 text-emerald-400 flex-shrink-0" />
      )}
    </NavLink>
  )
}

function CreateTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => api.agents.list() })
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedTo, setAssignedTo] = useState('bod-boxik')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')

  const ALL_ASSIGNEES = useMemo(() => [
    ...BOD_MEMBERS.map(b => ({ id: b.id, name: b.name, avatar: b.avatar, icon: null })),
    ...activeAgents.map((a: any) => ({ id: a.id, name: a.name, avatar: null, icon: a.icon || '🤖' })),
  ], [activeAgents])

  const assigneeOptions = useMemo(() =>
    search ? ALL_ASSIGNEES.filter(o => o.name.toLowerCase().includes(search.toLowerCase())) : ALL_ASSIGNEES
  , [ALL_ASSIGNEES, search])

  const selectedAssignee = ALL_ASSIGNEES.find(o => o.id === assignedTo)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await api.tasks.create({ title, description, priority, assignedTo, status: 'backlog' })
      toast.success('Úloha vytvorená')
      setTitle(''); setDescription(''); setPriority('medium'); setAssignedTo('bod-boxik'); setSearch('')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vytvoriť úlohu</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Názov *</label>
            <input
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Zadaj názov úlohy..."
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Popis</label>
            <textarea
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Voliteľný popis..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Priorita</label>
            <select
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="low">Nízka</option>
              <option value="medium">Stredná</option>
              <option value="high">Vysoká</option>
              <option value="critical">Kritická</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Priradiť</label>
            {/* Selected tag */}
            {selectedAssignee && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/25">
                  {selectedAssignee.avatar
                    ? <img src={selectedAssignee.avatar} className="size-4 rounded-full object-cover" />
                    : <span>{selectedAssignee.icon}</span>}
                  {selectedAssignee.name}
                  <button type="button" onClick={() => setAssignedTo('bod-boxik')} className="ml-0.5 hover:text-primary/60">×</button>
                </span>
              </div>
            )}
            <input
              className="w-full bg-muted/40 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Hľadaj osobu alebo agenta..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {/* Dropdown list — always visible */}
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg divide-y divide-border/50">
              {assigneeOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setAssignedTo(opt.id); setSearch('') }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors text-left',
                    assignedTo === opt.id
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-accent/60 text-foreground'
                  )}
                >
                  {opt.avatar
                    ? <img src={opt.avatar} className="size-5 rounded-full object-cover flex-shrink-0" />
                    : <span className="text-base">{opt.icon}</span>}
                  <span>{opt.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent/60 transition-colors">
              Zrušiť
            </button>
            <button type="submit" disabled={submitting || !title.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? 'Vytváram...' : 'Vytvoriť'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const logout = () => { clearToken(); navigate('/login') }
  const [createTaskOpen, setCreateTaskOpen] = useState(false)

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.agents.list(),
    refetchInterval: 15000,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    refetchInterval: 10000,
  })

  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')
  const cosAgent = activeAgents.find((a: any) =>
    a.role?.toLowerCase().includes('chief of staff') || a.name?.toLowerCase().includes('chief of staff')
  )
  const otherAgents = activeAgents.filter((a: any) => a.id !== cosAgent?.id)

  const unreadCount = (notifications as any[]).filter((n: any) => n.status === 'unread').length

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col flex-shrink-0 border-r border-sidebar-border bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_40%),rgba(18,18,22,0.85)] backdrop-blur-md">
        {/* Header */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center justify-center size-7 rounded-lg bg-primary/20 text-primary">
            <Bot size={15} />
          </div>
          <span className="font-semibold text-sm text-foreground">AgentBoard</span>
        </div>

        {/* Create Task Button */}
        <div className="px-2 pt-3 pb-1">
          <button
            onClick={() => setCreateTaskOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <Plus size={14} />
            Vytvoriť úlohu
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-1 px-2 overflow-y-auto">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" end />
          <NavItem to="/inbox" icon={Inbox} label="Inbox" badge={unreadCount || undefined} />

          <SectionHeader label="Spoločnosť" />
          <NavItem to="/tasks" icon={Ticket} label="Úlohy" />
          <NavItem to="/board-of-directors" icon={Users} label="Board of Directors" />
          <NavItem to="/org-chart" icon={GitBranch} label="Org Chart" />
          <NavItem to="/office" icon={Building2} label="Office" />
          <NavItem to="/budgets" icon={DollarSign} label="Rozpočty" />

          <SectionHeader label="Agenti" />
          {/* Chief of Staff */}
          {cosAgent && (
            <AgentNavItem
              id={cosAgent.id}
              name={cosAgent.name}
              icon={cosAgent.icon || '🧠'}
              isRunning={cosAgent.status === 'running'}
            />
          )}
          {/* Other agents */}
          {otherAgents.map((a: any) => (
            <AgentNavItem
              key={a.id}
              id={a.id}
              name={a.name}
              icon={a.icon || '🤖'}
              isRunning={a.status === 'running'}
            />
          ))}

          <SectionHeader label="Workspace" />
          <NavItem to="/heartbeats" icon={Activity} label="Heartbeats" />
          <NavItem to="/activity" icon={Activity} label="Aktivita" />
          <NavItem to="/company-settings" icon={Settings} label="Nastavenia" />
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={15} />
            Odhlásiť
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <Outlet />
      </main>

      <CreateTaskModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} />
    </div>
  )
}
