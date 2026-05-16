import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { issues, issueComments, activityLog } from '@agentboard/db'
import { eq, and, sql } from 'drizzle-orm'

const createSchema = z.object({
  companyId: z.string().uuid(),
  agentId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  parentId: z.string().uuid().optional(),
  labels: z.array(z.string()).default([]),
})

const updateSchema = z.object({
  agentId: z.string().uuid().nullable().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  labels: z.array(z.string()).optional(),
})

const commentSchema = z.object({
  text: z.string().min(1),
})

async function nextIssueNumber(companyId: string): Promise<number> {
  const result = await db.select({ max: sql<number>`COALESCE(MAX(issue_number), 0)` })
    .from(issues)
    .where(eq(issues.companyId, companyId))
  return (result[0]?.max ?? 0) + 1
}

export async function issuesRoutes(app: FastifyInstance) {
  app.get('/', async (req) => {
    const { companyId, status, agentId } = req.query as {
      companyId?: string; status?: string; agentId?: string
    }
    let query = db.select().from(issues)
    const conditions = []
    if (companyId) conditions.push(eq(issues.companyId, companyId))
    if (status) conditions.push(eq(issues.status, status as any))
    if (agentId) conditions.push(eq(issues.agentId, agentId))
    if (conditions.length > 0) return query.where(and(...conditions)).orderBy(issues.createdAt)
    return query.orderBy(issues.createdAt)
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const [issue] = await db.select().from(issues).where(eq(issues.id, id)).limit(1)
    if (!issue) return reply.code(404).send({ error: 'Not found' })
    return issue
  })

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const num = await nextIssueNumber(body.companyId)
    const identifier = `ISSUE-${num}`
    const labelsJson = JSON.stringify(body.labels ?? [])
    const [issue] = await db.insert(issues).values({
      ...body,
      labels: labelsJson,
      issueNumber: num,
      identifier,
    }).returning()
    await db.insert(activityLog).values({
      companyId: body.companyId,
      actorType: 'user',
      actorId: (req.user as { sub: string }).sub,
      action: 'create',
      entityType: 'issue',
      entityId: issue.id,
      details: JSON.stringify({ title: issue.title, identifier }),
    })
    return reply.code(201).send(issue)
  })

  app.patch('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateSchema.parse(req.body)
    const updateData: any = { ...body, updatedAt: new Date().toISOString() }
    if (body.labels !== undefined) updateData.labels = JSON.stringify(body.labels)
    const [issue] = await db.update(issues)
      .set(updateData)
      .where(eq(issues.id, id))
      .returning()
    if (!issue) return reply.code(404).send({ error: 'Not found' })
    return issue
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    await db.delete(issues).where(eq(issues.id, id))
    reply.code(204).send()
  })

  app.get('/:id/comments', async (req) => {
    const { id } = req.params as { id: string }
    return db.select().from(issueComments).where(eq(issueComments.issueId, id)).orderBy(issueComments.createdAt)
  })

  app.post('/:id/comments', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = commentSchema.parse(req.body)
    const userId = (req.user as { sub: string }).sub
    const [comment] = await db.insert(issueComments).values({
      issueId: id,
      authorType: 'user',
      authorId: userId,
      text: body.text,
    }).returning()
    return reply.code(201).send(comment)
  })
}
