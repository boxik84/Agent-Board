import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { notifications } from '@agentboard/db'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const createSchema = z.object({
  type: z.enum(['info', 'hire_request', 'task_request', 'approval', 'comment']).default('info'),
  title: z.string().min(1),
  body: z.string().default(''),
  fromAgentId: z.string().uuid().optional(),
  fromAgentName: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  requiresApproval: z.boolean().default(false),
})

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100)
  })

  app.post<{ Body: unknown }>('/', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const [n] = await db.insert(notifications).values({
      id: randomUUID(),
      ...body,
      requiresApproval: body.requiresApproval ? 1 : 0,
    }).returning()
    reply.code(201).send(n)
  })

  app.post<{ Params: { id: string } }>('/:id/approve', async (req, reply) => {
    const { id } = req.params
    const [n] = await db.update(notifications)
      .set({ status: 'approved' })
      .where(eq(notifications.id, id))
      .returning()
    if (!n) return reply.code(404).send({ error: 'Not found' })
    return n
  })

  app.post<{ Params: { id: string } }>('/:id/reject', async (req, reply) => {
    const { id } = req.params
    const [n] = await db.update(notifications)
      .set({ status: 'rejected' })
      .where(eq(notifications.id, id))
      .returning()
    if (!n) return reply.code(404).send({ error: 'Not found' })
    return n
  })

  app.patch<{ Params: { id: string } }>('/:id/read', async (req, reply) => {
    const { id } = req.params
    const [n] = await db.update(notifications)
      .set({ status: 'read' })
      .where(eq(notifications.id, id))
      .returning()
    return n
  })

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await db.delete(notifications).where(eq(notifications.id, id))
    reply.code(204).send()
  })
}
