import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { costEvents, budgetPolicies, budgetIncidents, agents } from '@agentboard/db'
import { eq, and, gte, sql } from 'drizzle-orm'
import { z } from 'zod'

const policySchema = z.object({
  companyId: z.string().uuid(),
  scopeType: z.enum(['agent', 'company']),
  scopeId: z.string().uuid(),
  monthlyCents: z.number().int().min(0),
  warnPercent: z.number().int().min(0).max(100).default(80),
  hardStopEnabled: z.boolean().default(true),
})

export async function costsRoutes(app: FastifyInstance) {
  // Cost summary for the current calendar month
  app.get('/', async (req) => {
    const { companyId, agentId } = req.query as { companyId?: string; agentId?: string }
    const now = new Date()
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`

    const conditions: ReturnType<typeof gte>[] = [gte(costEvents.occurredAt, startOfMonth)]
    if (companyId) conditions.push(eq(costEvents.companyId, companyId) as any)
    if (agentId) conditions.push(eq(costEvents.agentId, agentId) as any)

    const rows = await db.select({
      agentId: costEvents.agentId,
      provider: costEvents.provider,
      model: costEvents.model,
      totalCents: sql<number>`SUM(cost_cents)`,
      totalInputTokens: sql<number>`SUM(input_tokens)`,
      totalOutputTokens: sql<number>`SUM(output_tokens)`,
      runCount: sql<number>`COUNT(DISTINCT run_id)`,
    })
      .from(costEvents)
      .where(and(...conditions))
      .groupBy(costEvents.agentId, costEvents.provider, costEvents.model)

    return rows
  })

  // Budget policies
  app.get('/budgets', async (req) => {
    const { companyId } = req.query as { companyId?: string }
    if (companyId) {
      return db.select().from(budgetPolicies).where(eq(budgetPolicies.companyId, companyId))
    }
    return db.select().from(budgetPolicies)
  })

  app.post('/budgets', async (req, reply) => {
    const body = policySchema.parse(req.body)
    const [policy] = await db.insert(budgetPolicies).values(body).returning()

    // Sync to agent.budgetMonthlyCents if scope is agent
    if (body.scopeType === 'agent') {
      await db.update(agents)
        .set({ budgetMonthlyCents: body.monthlyCents, updatedAt: new Date().toISOString() })
        .where(eq(agents.id, body.scopeId))
    }

    return reply.code(201).send(policy)
  })

  app.patch('/budgets/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = policySchema.partial().parse(req.body)
    const [policy] = await db.update(budgetPolicies)
      .set({ ...body, updatedAt: new Date().toISOString() })
      .where(eq(budgetPolicies.id, id))
      .returning()
    if (!policy) return reply.code(404).send({ error: 'Not found' })

    if (policy.scopeType === 'agent' && body.monthlyCents !== undefined) {
      await db.update(agents)
        .set({ budgetMonthlyCents: policy.monthlyCents, updatedAt: new Date().toISOString() })
        .where(eq(agents.id, policy.scopeId))
    }

    return policy
  })

  // Budget incidents
  app.get('/incidents', async (req) => {
    const { companyId } = req.query as { companyId?: string }
    if (companyId) {
      return db.select().from(budgetIncidents).where(eq(budgetIncidents.companyId, companyId))
    }
    return db.select().from(budgetIncidents)
  })
}
