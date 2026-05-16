import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { companies, activityLog } from '@agentboard/db'
import { eq } from 'drizzle-orm'

const createSchema = z.object({
  name: z.string().min(1),
  mission: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  mission: z.string().optional(),
  status: z.enum(['active', 'paused']).optional(),
})

export async function companiesRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db.select().from(companies).orderBy(companies.createdAt)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1)
    if (!company) return reply.code(404).send({ error: 'Not found' })
    return company
  })

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const [company] = await db.insert(companies).values(body).returning()
    await db.insert(activityLog).values({
      companyId: company.id,
      actorType: 'user',
      actorId: (req.user as { sub: string }).sub,
      action: 'create',
      entityType: 'company',
      entityId: company.id,
      details: JSON.stringify({ name: company.name }),
    })
    return reply.code(201).send(company)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const [company] = await db.update(companies)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(companies.id, id))
      .returning()
    if (!company) return reply.code(404).send({ error: 'Not found' })
    return company
  })

  app.get('/:id/activity', async (req) => {
    const { id } = req.params as { id: string }
    return db.select().from(activityLog)
      .where(eq(activityLog.companyId, id))
      .orderBy(activityLog.createdAt)
      .limit(200)
  })
}
