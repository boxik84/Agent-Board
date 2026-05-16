import { db } from '../db.js'
import {
  agents, heartbeatRuns, heartbeatEvents, costEvents,
  budgetIncidents, activityLog, routines,
} from '@agentboard/db'
import { eq, and, lte, isNotNull, sql, desc } from 'drizzle-orm'
import { submitTask } from './openclaw-adapter.js'
import { sseEmit } from './sse.js'

export async function triggerHeartbeat(agentId: string, source: 'manual' | 'schedule' | 'event', message?: string) {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
  if (!agent) throw new Error(`Agent ${agentId} not found`)
  if (agent.status === 'terminated') throw new Error('Agent is terminated')
  if (agent.status === 'paused') throw new Error('Agent is paused (budget exceeded)')

  // Budget check
  if (agent.budgetMonthlyCents > 0 && agent.spentMonthlyCents >= agent.budgetMonthlyCents) {
    await db.update(agents).set({ status: 'paused', updatedAt: new Date().toISOString() }).where(eq(agents.id, agentId))
    await db.insert(budgetIncidents).values({
      agentId,
      companyId: agent.companyId,
      incidentType: 'hard_stop',
      spentCents: agent.spentMonthlyCents,
      limitCents: agent.budgetMonthlyCents,
    })
    sseEmit({ type: 'budget_hard_stop', agentId, agentName: agent.name })
    throw new Error('Budget limit reached — agent paused')
  }

  // Create run record
  const [run] = await db.insert(heartbeatRuns).values({
    agentId,
    companyId: agent.companyId,
    status: 'running',
    invocationSource: source,
  }).returning()

  await db.update(agents).set({ status: 'running', lastHeartbeatAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(agents.id, agentId))
  sseEmit({ type: 'heartbeat_start', runId: run.id, agentId, agentName: agent.name })

  const taskMessage = message ?? `You are ${agent.name} (${agent.role}). Check your current tasks and continue your work.`

  try {
    const adapterConfig = typeof agent.adapterConfig === 'string'
      ? JSON.parse(agent.adapterConfig)
      : agent.adapterConfig as Record<string, unknown>
    const { taskId } = await submitTask({
      runId: run.id,
      agentId,
      message: taskMessage,
      adapterConfig,
    })

    await db.update(heartbeatRuns)
      .set({ externalTaskId: taskId })
      .where(eq(heartbeatRuns.id, run.id))

    await db.insert(heartbeatEvents).values({
      runId: run.id,
      type: 'task_submitted',
      payload: JSON.stringify({ taskId, message: taskMessage }),
    })

    await db.insert(activityLog).values({
      companyId: agent.companyId,
      actorType: 'system',
      action: 'heartbeat_triggered',
      entityType: 'agent',
      entityId: agentId,
      details: JSON.stringify({ runId: run.id, source }),
    })
  } catch (err) {
    await finishRun(run.id, agentId, 'failed', { error: String(err) })
    throw err
  }

  return run
}

export async function finishRun(
  runId: string,
  agentId: string,
  status: 'succeeded' | 'failed' | 'cancelled',
  payload?: {
    output?: string | null
    error?: string | null
    inputTokens?: number
    outputTokens?: number
    model?: string
  }
) {
  const [run] = await db.update(heartbeatRuns)
    .set({ status, finishedAt: new Date().toISOString() })
    .where(eq(heartbeatRuns.id, runId))
    .returning()

  if (!run) return

  await db.update(agents)
    .set({ status: status === 'succeeded' ? 'idle' : 'error', updatedAt: new Date().toISOString() })
    .where(eq(agents.id, agentId))

  await db.insert(heartbeatEvents).values({
    runId,
    type: status,
    payload: JSON.stringify(payload ?? {}),
  })

  // Record cost if token info available
  if (payload?.inputTokens || payload?.outputTokens) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
    if (agent) {
      const inputCost = Math.round(((payload.inputTokens ?? 0) / 1_000_000) * 300)  // $3 per M input
      const outputCost = Math.round(((payload.outputTokens ?? 0) / 1_000_000) * 1500) // $15 per M output
      const totalCents = inputCost + outputCost

      await db.insert(costEvents).values({
        companyId: agent.companyId,
        agentId,
        runId,
        provider: 'anthropic',
        model: payload.model ?? 'claude-sonnet-4-6',
        inputTokens: payload.inputTokens ?? 0,
        outputTokens: payload.outputTokens ?? 0,
        costCents: totalCents,
      })

      await db.update(agents)
        .set({ spentMonthlyCents: sql`spent_monthly_cents + ${totalCents}` })
        .where(eq(agents.id, agentId))

      // Warn at 80% threshold
      const updated = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1)
      const a = updated[0]
      if (a && a.budgetMonthlyCents > 0) {
        const pct = (a.spentMonthlyCents / a.budgetMonthlyCents) * 100
        if (pct >= 80 && pct < 100) {
          await db.insert(budgetIncidents).values({
            agentId,
            companyId: a.companyId,
            incidentType: 'warn',
            spentCents: a.spentMonthlyCents,
            limitCents: a.budgetMonthlyCents,
          })
          sseEmit({ type: 'budget_warn', agentId, agentName: a.name, percent: Math.round(pct) })
        }
      }
    }
  }

  sseEmit({ type: 'heartbeat_finish', runId, agentId, status, output: payload?.output })
}

export async function runDueRoutines() {
  const now = new Date().toISOString()
  const due = await db.select({ routine: routines, agent: agents })
    .from(routines)
    .innerJoin(agents, eq(routines.agentId, agents.id))
    .where(and(
      eq(routines.enabled, true),
      lte(routines.nextRunAt, now),
      isNotNull(routines.nextRunAt),
    ))

  for (const { routine, agent } of due) {
    try {
      await triggerHeartbeat(agent.id, 'schedule', routine.description ?? undefined)
      await db.update(routines)
        .set({ lastRanAt: now, nextRunAt: null })
        .where(eq(routines.id, routine.id))
    } catch (err) {
      console.error(`Routine ${routine.id} failed:`, err)
    }
  }
}
