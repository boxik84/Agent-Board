import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, useSSE } from '../api/client'
import {
  Activity, Users, Ticket, Euro, Bot, CheckSquare,
  TrendingUp, Clock, CheckCircle2, XCircle, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const EUR_PER_USD_CENT = 0.0092
const CZK_PER_EUR = 25.3

function fmtEur(cents: number) { return (cents * EUR_PER_USD_CENT).toFixed(2) }
function fmtCzk(cents: number) { return Math.round(cents * EUR_PER_USD_CENT * CZK_PER_EUR).toLocaleString('cs-CZ') }

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-400',
  idle: 'bg-green-400',
  running: 'bg-blue-400 animate-pulse',
  paused: 'bg-yellow-400',
  terminated: 'bg-red-400',
}

const ISSUE_STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-zinc-500',
  todo: 'bg-blue-500',
  in_progress: 'bg-violet-500',
  in_review: 'bg-orange-500',
  done: 'bg-green-500',
}

const RUN_STATUS_COLORS: Record<string, string> = {
  succeeded: 'bg-green-500',
  failed: 'bg-red-500',
  running: 'bg-blue-500',
  queued: 'bg-zinc-500',
}

function StatCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub?: string
  icon: any; color: string; trend?: string
}) {
  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`flex items-center justify-center size-11 rounded-xl shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
          <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
        {trend && <div className="text-xs text-green-400 shrink-0">{trend}</div>}
      </CardContent>
    </Card>
  )
}

function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <div className="w-20 text-muted-foreground text-right shrink-0 capitalize">{d.label.replace('_', ' ')}</div>
          <div className="flex-1 h-5 rounded-sm bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-sm transition-all duration-500 ${d.color}`}
              style={{ width: `${Math.round((d.value / max) * 100)}%` }}
            />
          </div>
          <div className="w-6 text-foreground font-medium text-right">{d.value}</div>
        </div>
      ))}
    </div>
  )
}

function RunSparkline({ runs }: { runs: any[] }) {
  if (runs.length === 0) return <div className="text-muted-foreground text-xs">Žiadne behy</div>
  const last20 = runs.slice(0, 20).reverse()
  return (
    <div className="flex items-end gap-0.5 h-8">
      {last20.map((run, i) => (
        <div
          key={i}
          title={run.status}
          className={`flex-1 rounded-sm min-w-[4px] ${RUN_STATUS_COLORS[run.status] ?? 'bg-zinc-500'}`}
          style={{ height: `${run.status === 'succeeded' ? 100 : run.status === 'failed' ? 60 : 40}%` }}
        />
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const qc = useQueryClient()

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })
  const { data: runs = [] } = useQuery({
    queryKey: ['heartbeats'],
    queryFn: () => api.heartbeats.list(),
  })
  const { data: costs = [] } = useQuery({
    queryKey: ['costs', company?.id],
    queryFn: () => api.costs.summary(company?.id),
    enabled: !!company?.id,
  })
  const { data: issues = [] } = useQuery({
    queryKey: ['issues', company?.id],
    queryFn: () => api.issues.list({ companyId: company?.id }),
    enabled: !!company?.id,
  })
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: api.tasks.list,
  })

  useEffect(() => {
    return useSSE((event) => {
      if (['heartbeat_start', 'heartbeat_finish', 'budget_warn', 'budget_hard_stop'].includes(event.type)) {
        qc.invalidateQueries({ queryKey: ['heartbeats'] })
        qc.invalidateQueries({ queryKey: ['agents'] })
        qc.invalidateQueries({ queryKey: ['costs'] })
      }
    })
  }, [qc])

  const totalCostCents = costs.reduce((s: number, c: any) => s + (c.totalCents ?? 0), 0)
  const activeAgents = (agents as any[]).filter((a: any) => a.status !== 'terminated')
  const openIssues = (issues as any[]).filter((i: any) => i.status !== 'done')
  const inProgressTasks = (tasks as any[]).filter((t: any) => t.status === 'in_progress').length
  const succeededRuns = (runs as any[]).filter((r: any) => r.status === 'succeeded').length
  const failedRuns = (runs as any[]).filter((r: any) => r.status === 'failed').length
  const successRate = runs.length > 0 ? Math.round((succeededRuns / (runs as any[]).length) * 100) : 0

  const agentCostMap = (costs as any[]).reduce((m: Record<string, number>, c: any) => {
    m[c.agentId] = (m[c.agentId] ?? 0) + (c.totalCents ?? 0)
    return m
  }, {})

  // Issue breakdown by status
  const issueStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done']
  const issueBreakdown = issueStatuses.map(s => ({
    label: s,
    value: (issues as any[]).filter((i: any) => i.status === s).length,
    color: ISSUE_STATUS_COLORS[s],
  }))

  // Priority breakdown
  const priorities = ['urgent', 'high', 'medium', 'low']
  const priorityBreakdown = priorities.map(p => ({
    label: p,
    value: (issues as any[]).filter((i: any) => i.priority === p).length,
    color: p === 'urgent' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-blue-500' : 'bg-zinc-500',
  }))

  // Recent activity: last 8 runs
  const recentRuns = (runs as any[]).slice(0, 8)

  // Running agents
  const runningAgentIds = new Set(
    (runs as any[]).filter((r: any) => r.status === 'running').map((r: any) => r.agentId)
  )

  // Last run per agent
  const lastRunPerAgent: Record<string, any> = {}
  for (const run of (runs as any[])) {
    if (!lastRunPerAgent[run.agentId]) lastRunPerAgent[run.agentId] = run
  }

  const today = new Date()
  const todayRuns = (runs as any[]).filter((r: any) => {
    const d = new Date(r.startedAt)
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth()
  }).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{company?.name ?? 'Načítavanie...'}</p>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div className="font-medium text-foreground">{new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div>Úspešnosť: {successRate}%</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Aktívni agenti"
          value={activeAgents.length}
          sub={`${runningAgentIds.size} práve pracuje`}
          icon={Users}
          color="bg-violet-500/20 text-violet-400"
        />
        <StatCard
          label="Otvorené tickety"
          value={openIssues.length}
          sub={`z ${(issues as any[]).length} celkovo`}
          icon={Ticket}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          label="Behy dnes"
          value={todayRuns}
          sub={`${failedRuns} zlyhaní celkovo`}
          icon={Activity}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          label="Náklady tento mesiac"
          value={`€${fmtEur(totalCostCents)}`}
          sub={`${fmtCzk(totalCostCents)} Kč`}
          icon={Euro}
          color="bg-amber-500/20 text-amber-400"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Agent Activity — wide */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot size={15} className="text-violet-400" />
                <CardTitle className="text-sm">Čo robia agenti</CardTitle>
                {runningAgentIds.size > 0 && (
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
                    <span className="size-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    {runningAgentIds.size} aktívnych
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {activeAgents.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Žiadni agenti. Vytvorte agentov na stránke Agenti.</div>
              ) : (
                <div className="divide-y divide-border">
                  {activeAgents.map((agent: any) => {
                    const lastRun = lastRunPerAgent[agent.id]
                    const isRunning = runningAgentIds.has(agent.id)
                    const costCents = agentCostMap[agent.id] ?? 0
                    return (
                      <div key={agent.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className="size-9 rounded-full flex items-center justify-center text-base font-semibold"
                            style={{ background: `${agent.color ?? '#6366f1'}22`, color: agent.color ?? '#6366f1' }}
                          >
                            {agent.name?.charAt(0) ?? '?'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card ${STATUS_DOT[agent.status] ?? 'bg-zinc-500'}`} />
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{agent.name}</span>
                            <span className="text-xs text-muted-foreground">{agent.role}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {isRunning ? (
                              <span className="text-blue-400 flex items-center gap-1">
                                <Zap size={10} /> Práve beží heartbeat
                              </span>
                            ) : lastRun ? (
                              <span>
                                Posledný beh: {new Date(lastRun.startedAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                                {' — '}
                                <span className={lastRun.status === 'succeeded' ? 'text-green-400' : lastRun.status === 'failed' ? 'text-red-400' : 'text-muted-foreground'}>
                                  {lastRun.status}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">Ešte nezačal</span>
                            )}
                          </div>
                        </div>

                        {/* Cost */}
                        <div className="text-right text-xs shrink-0">
                          <div className="text-foreground font-medium">€{fmtEur(costCents)}</div>
                          {agent.budgetMonthlyCents > 0 && (
                            <div className="text-muted-foreground">
                              z €{fmtEur(agent.budgetMonthlyCents)}
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant={
                            agent.status === 'active' || agent.status === 'idle' ? 'success'
                              : agent.status === 'running' ? 'warning'
                              : agent.status === 'paused' ? 'secondary'
                              : 'destructive'
                          }
                          className="shrink-0 text-xs"
                        >
                          {agent.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent runs */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-green-400" />
                <CardTitle className="text-sm">Posledné behy</CardTitle>
                <div className="ml-auto">
                  <RunSparkline runs={runs} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentRuns.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Žiadne behy. Spustite heartbeat agenta.</div>
              ) : (
                <div className="divide-y divide-border">
                  {recentRuns.map((run: any) => {
                    const agent = (agents as any[]).find((a: any) => a.id === run.agentId)
                    return (
                      <div key={run.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div
                          className={`size-2 rounded-full shrink-0 ${RUN_STATUS_COLORS[run.status] ?? 'bg-zinc-500'}`}
                        />
                        <span className="text-sm text-foreground min-w-0 flex-1 truncate">
                          {agent?.name ?? '—'}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{run.invocationSource}</span>
                        <Badge variant={run.status === 'succeeded' ? 'success' : run.status === 'failed' ? 'destructive' : run.status === 'running' ? 'warning' : 'secondary'} className="text-xs shrink-0">
                          {run.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground shrink-0 w-14 text-right">
                          {new Date(run.startedAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Issue breakdown */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Ticket size={15} className="text-blue-400" />
                <CardTitle className="text-sm">Stav ticketov</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <MiniBarChart data={issueBreakdown} />
            </CardContent>
          </Card>

          {/* Priority breakdown */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-orange-400" />
                <CardTitle className="text-sm">Tickety podľa priority</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <MiniBarChart data={priorityBreakdown} />
            </CardContent>
          </Card>

          {/* Recent tasks */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckSquare size={15} className="text-violet-400" />
                <CardTitle className="text-sm">Úlohy</CardTitle>
                <span className="ml-auto text-xs text-muted-foreground">{inProgressTasks} prebieha</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {(tasks as any[]).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Žiadne úlohy.</div>
              ) : (
                <div className="divide-y divide-border">
                  {(tasks as any[]).slice(0, 6).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className={`size-1.5 rounded-full shrink-0 ${task.status === 'done' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : task.status === 'review' ? 'bg-orange-500' : 'bg-zinc-500'}`} />
                      <span className={`text-sm flex-1 truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                      </span>
                      <div className={`size-5 rounded-full flex items-center justify-center text-xs ${task.assignedTo === 'claude' ? 'bg-violet-500/20 text-violet-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {task.assignedTo === 'claude' ? 'C' : 'K'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Run stats */}
          <Card className="py-0 gap-0">
            <CardHeader className="px-4 pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-green-400" />
                <CardTitle className="text-sm">Úspešnosť behov</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Úspešné</span>
                <span className="text-green-400 font-medium">{succeededRuns}</span>
              </div>
              <Progress value={successRate} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <XCircle size={12} className="text-red-400" />
                  {failedRuns} zlyhaní
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {(runs as any[]).filter((r: any) => r.status === 'running').length} beží
                </div>
                <span className="font-medium text-foreground">{successRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
