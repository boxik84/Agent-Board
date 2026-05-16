import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { teamMembers } from '@agentboard/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const schema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
  color: z.string().default('#6366f1'),
  reportsTo: z.string().uuid().optional(),
})

export async function teamRoutes(app: FastifyInstance) {
  app.get('/', async () => db.select().from(teamMembers).orderBy(teamMembers.name))

  app.post<{ Body: unknown }>('/', async (req, reply) => {
    const body = schema.parse(req.body)
    const [m] = await db.insert(teamMembers).values({
      id: randomUUID(), ...body,
      createdAt: new Date().toISOString(),
    }).returning()
    reply.code(201).send(m)
  })

  app.patch<{ Params: { id: string }; Body: unknown }>('/:id', async (req) => {
    const body = schema.partial().parse(req.body)
    const [m] = await db.update(teamMembers).set(body).where(eq(teamMembers.id, req.params.id)).returning()
    return m
  })

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await db.delete(teamMembers).where(eq(teamMembers.id, req.params.id))
    reply.code(204).send()
  })
}
