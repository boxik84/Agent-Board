import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { heartbeatRuns, heartbeatEvents, routines } from '@agentboard/db'
import { eq, desc } from 'drizzle-orm'
import { triggerHeartbeat } from '../services/heartbeat-engine.js'
import cronParser from 'cron-parser'
const { parseExpression } = cronParser

const triggerSchema = z.object({
  agentId: z.string().uuid(),
  message: z.string().optional(),
})

const routineCreateSchema = z.object({
  agentId: z.string().uuid(),
  cronExpr: z.string(),
  description: z.string().optional(),
})

export async function heartbeatsRoutes(app: FastifyInstance) {
  app.get('/', async (req) => {
    const { agentId } = req.query as { agentId?: string }
    if (agentId) {
      return db.select().from(heartbeatRuns)
        .where(eq(heartbeatRuns.agentId, agentId))
        .orderBy(desc(heartbeatRuns.startedAt))
        .limit(100)
    }
    return db.select().from(heartbeatRuns)
      .orderBy(desc(heartbeatRuns.startedAt))
      .limit(100)
  })

  app.get('/:id/events', async (req) => {
    const { id } = req.params as { id: string }
    return db.select().from(heartbeatEvents)
      .where(eq(heartbeatEvents.runId, id))
      .orderBy(heartbeatEvents.createdAt)
  })

  app.post('/trigger', async (req, reply) => {
    const body = triggerSchema.parse(req.body)
    const run = await triggerHeartbeat(body.agentId, 'manual', body.message)
    return reply.code(201).send(run)
  })

  // Routines CRUD
  app.get('/routines', async (req) => {
    const { agentId } = req.query as { agentId?: string }
    if (agentId) {
      return db.select().from(routines).where(eq(routines.agentId, agentId))
    }
    return db.select().from(routines)
  })

  app.post('/routines', async (req, reply) => {
    const body = routineCreateSchema.parse(req.body)
    const interval = parseExpression(body.cronExpr)
    const nextRunAt = interval.next().toDate()
    const [routine] = await db.insert(routines).values({ ...body, nextRunAt }).returning()
    return reply.code(201).send(routine)
  })

  app.patch('/routines/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = z.object({ enabled: z.boolean().optional(), cronExpr: z.string().optional() }).parse(req.body)
    const [routine] = await db.update(routines).set(body).where(eq(routines.id, id)).returning()
    if (!routine) return reply.code(404).send({ error: 'Not found' })
    return routine
  })

  app.delete('/routines/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await db.delete(routines).where(eq(routines.id, id))
    return { ok: true }
  })
}
