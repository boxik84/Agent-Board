export type AgentStatus = 'active' | 'paused' | 'idle' | 'running' | 'error' | 'terminated'
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done'
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent'
export type HeartbeatStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type InvocationSource = 'schedule' | 'manual' | 'event'
export type ScopeType = 'agent' | 'company'
export type BudgetIncidentType = 'warn' | 'hard_stop'
export type ActorType = 'user' | 'agent' | 'system'

export interface Company {
  id: string
  name: string
  mission: string | null
  status: 'active' | 'paused'
  createdAt: string
}

export interface Agent {
  id: string
  companyId: string
  name: string
  role: string
  title: string | null
  icon: string | null
  status: AgentStatus
  reportsTo: string | null
  adapterType: string
  adapterConfig: Record<string, unknown>
  budgetMonthlyCents: number
  spentMonthlyCents: number
  lastHeartbeatAt: string | null
  createdAt: string
}

export interface Routine {
  id: string
  agentId: string
  cronExpr: string
  enabled: boolean
  lastRanAt: string | null
  nextRunAt: string | null
  description: string | null
}

export interface HeartbeatRun {
  id: string
  agentId: string
  companyId: string
  status: HeartbeatStatus
  invocationSource: InvocationSource
  externalTaskId: string | null
  startedAt: string
  finishedAt: string | null
}

export interface Issue {
  id: string
  companyId: string
  agentId: string | null
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  identifier: string
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface IssueComment {
  id: string
  issueId: string
  authorType: ActorType
  authorId: string | null
  text: string
  createdAt: string
}

export interface CostEvent {
  id: string
  companyId: string
  agentId: string
  runId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
  occurredAt: string
}

export interface BudgetPolicy {
  id: string
  companyId: string
  scopeType: ScopeType
  scopeId: string
  monthlyCents: number
  warnPercent: number
  hardStopEnabled: boolean
}

export interface ActivityLogEntry {
  id: string
  companyId: string
  actorType: ActorType
  actorId: string | null
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown> | null
  createdAt: string
}
