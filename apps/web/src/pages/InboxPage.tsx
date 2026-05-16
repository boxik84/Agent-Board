import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { formatDistanceToNow } from 'date-fns'
import { Check, X, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  info: 'Informácia',
  hire_request: 'Žiadosť o prijatie',
  task_request: 'Žiadosť o úlohu',
  approval: 'Schválenie',
  comment: 'Komentár',
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  hire_request: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  task_request: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  approval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  comment: 'bg-muted/40 text-muted-foreground border-border',
}

export default function InboxPage() {
  const qc = useQueryClient()
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    refetchInterval: 8000,
  })

  const approve = useMutation({
    mutationFn: (id: string) => api.notifications.approve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Schválené') },
  })
  const reject = useMutation({
    mutationFn: (id: string) => api.notifications.reject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.error('Zamietnuté') },
  })
  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const all = notifications as any[]
  const unread = all.filter(n => n.status === 'unread')
  const rest = all.filter(n => n.status !== 'unread')

  if (isLoading) return <div className="p-8 text-muted-foreground text-sm">Načítavam...</div>

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Správy od agentov vyžadujúce pozornosť
        </p>
      </div>

      {all.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Inbox je prázdny</p>
        </div>
      )}

      {unread.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Nové ({unread.length})
          </h2>
          <div className="space-y-2">
            {unread.map(n => (
              <NotificationCard
                key={n.id}
                n={n}
                onApprove={() => approve.mutate(n.id)}
                onReject={() => reject.mutate(n.id)}
                onRead={() => markRead.mutate(n.id)}
              />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Skôr
          </h2>
          <div className="space-y-2">
            {rest.map(n => (
              <NotificationCard key={n.id} n={n} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationCard({
  n,
  onApprove,
  onReject,
  onRead,
}: {
  n: any
  onApprove?: () => void
  onReject?: () => void
  onRead?: () => void
}) {
  const isUnread = n.status === 'unread'
  const typeColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.info

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isUnread ? 'bg-muted/30 border-border' : 'bg-muted/10 border-border/50 opacity-70'
      )}
      onClick={() => isUnread && onRead?.()}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', typeColor)}>
              {TYPE_LABELS[n.type] ?? n.type}
            </span>
            {n.fromAgentName && (
              <span className="text-xs text-muted-foreground">od {n.fromAgentName}</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{n.title}</p>
          {n.body && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>}
          {n.status === 'approved' && (
            <span className="mt-2 inline-block text-xs text-emerald-400 font-medium">✓ Schválené</span>
          )}
          {n.status === 'rejected' && (
            <span className="mt-2 inline-block text-xs text-red-400 font-medium">✗ Zamietnuté</span>
          )}
        </div>
      </div>
      {n.requiresApproval && n.status === 'unread' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={e => { e.stopPropagation(); onApprove?.() }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
          >
            <Check size={12} />
            Schváliť
          </button>
          <button
            onClick={e => { e.stopPropagation(); onReject?.() }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
          >
            <X size={12} />
            Zamietnuť
          </button>
        </div>
      )}
    </div>
  )
}
