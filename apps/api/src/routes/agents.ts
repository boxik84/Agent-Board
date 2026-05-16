import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { agents, activityLog } from '@agentboard/db'
import { eq, and } from 'drizzle-orm'

const createSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().min(1),
  title: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  reportsTo: z.string().uuid().optional(),
  adapterType: z.string().default('openclaw'),
  adapterConfig: z.record(z.unknown()).default({}),
  budgetMonthlyCents: z.number().int().min(0).default(0),
})

const updateSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  title: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  reportsTo: z.string().uuid().nullable().optional(),
  adapterType: z.string().optional(),
  adapterConfig: z.record(z.unknown()).optional(),
  budgetMonthlyCents: z.number().int().min(0).optional(),
  status: z.enum(['active', 'paused', 'idle', 'running', 'error', 'terminated']).optional(),
})

export async function agentsRoutes(app: FastifyInstance) {
  app.get('/', async (req) => {
    const { companyId } = req.query as { companyId?: string }
    if (companyId) {
      return db.select().from(agents).where(eq(agents.companyId, companyId))
    }
    return db.select().from(agents)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1)
    if (!agent) return reply.code(404).send({ error: 'Not found' })
    return agent
  })

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const adapterConfigStr = JSON.stringify(body.adapterConfig)
    const [agent] = await db.insert(agents).values({
      ...body,
      adapterConfig: adapterConfigStr,
    }).returning()
    await db.insert(activityLog).values({
      companyId: body.companyId,
      actorType: 'user',
      actorId: (req.user as { sub: string }).sub,
      action: 'hire',
      entityType: 'agent',
      entityId: agent.id,
      details: JSON.stringify({ name: agent.name, role: agent.role }),
    })
    return reply.code(201).send(agent)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() }
    if (body.adapterConfig !== undefined) {
      updateData.adapterConfig = JSON.stringify(body.adapterConfig)
    }
    const [agent] = await db.update(agents)
      .set(updateData as any)
      .where(eq(agents.id, id))
      .returning()
    if (!agent) return reply.code(404).send({ error: 'Not found' })
    return agent
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [agent] = await db.update(agents)
      .set({ status: 'terminated', updatedAt: new Date().toISOString() })
      .where(eq(agents.id, id))
      .returning()
    if (!agent) return reply.code(404).send({ error: 'Not found' })
    await db.insert(activityLog).values({
      companyId: agent.companyId,
      actorType: 'user',
      actorId: (req.user as { sub: string }).sub,
      action: 'terminate',
      entityType: 'agent',
      entityId: agent.id,
      details: JSON.stringify({ name: agent.name }),
    })
    return { ok: true }
  })
}
