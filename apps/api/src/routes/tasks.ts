import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { tasks } from '@agentboard/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  status: z.enum(['backlog', 'in_progress', 'review', 'done', 'recurring']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.string().default('user'),
  tags: z.array(z.string()).default([]),
})

const updateSchema = createSchema.partial()

export async function tasksRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.select().from(tasks).orderBy(tasks.createdAt)
  })

  app.post<{ Body: unknown }>('/', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const [task] = await db.insert(tasks).values({
      id: randomUUID(),
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assignedTo: body.assignedTo,
      tags: JSON.stringify(body.tags),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning()
    reply.code(201).send({ ...task, tags: JSON.parse(task.tags) })
  })

  app.patch<{ Params: { id: string }; Body: unknown }>('/:id', async (req) => {
    const body = updateSchema.parse(req.body)
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.status !== undefined) updates.status = body.status
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)

    const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, req.params.id)).returning()
    return { ...task, tags: JSON.parse(task.tags) }
  })

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await db.delete(tasks).where(eq(tasks.id, req.params.id))
    reply.code(204).send()
  })
}
