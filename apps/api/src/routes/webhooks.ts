import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { heartbeatRuns } from '@agentboard/db'
import { eq } from 'drizzle-orm'
import { finishRun } from '../services/heartbeat-engine.js'

const callbackSchema = z.object({
  taskId: z.string().optional(),
  status: z.enum(['succeeded', 'failed', 'timed_out', 'cancelled']),
  output: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  completedAt: z.string().optional(),
  inputTokens: z.number().int().optional(),
  outputTokens: z.number().int().optional(),
  model: z.string().optional(),
})

export async function webhooksRoutes(app: FastifyInstance) {
  // OpenClaw completion callback
  app.post('/openclaw/:runId', async (req, reply) => {
    const { runId } = req.params as { runId: string }
    const body = callbackSchema.parse(req.body)

    const [run] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, runId)).limit(1)
    if (!run) return reply.code(404).send({ error: 'Run not found' })
    if (run.status !== 'running') return reply.send({ ok: true, skipped: true })

    const status = body.status === 'succeeded' ? 'succeeded' : 'failed'
    await finishRun(run.id, run.agentId, status, {
      output: body.output,
      error: body.error,
      inputTokens: body.inputTokens,
      outputTokens: body.outputTokens,
      model: body.model,
    })

    return { ok: true }
  })
}
