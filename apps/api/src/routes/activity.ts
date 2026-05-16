import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { activityLog } from '@agentboard/db'
import { eq, desc } from 'drizzle-orm'

export async function activityRoutes(app: FastifyInstance) {
  app.get('/', async (req) => {
    const { companyId } = req.query as { companyId?: string }
    if (companyId) {
      return db.select().from(activityLog)
        .where(eq(activityLog.companyId, companyId))
        .orderBy(desc(activityLog.createdAt))
        .limit(200)
    }
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(200)
  })
}
