import cron from 'node-cron'
import { runDueRoutines } from '../services/heartbeat-engine.js'
import { db } from '../db.js'
import { routines } from '@agentboard/db'
import { isNull, eq } from 'drizzle-orm'
import cronParser from 'cron-parser'
const { parseExpression } = cronParser

export function startScheduler() {
  // Tick every minute to check for due routines
  cron.schedule('* * * * *', async () => {
    try {
      await runDueRoutines()
    } catch (err) {
      console.error('Scheduler error:', err)
    }
  })

  // Compute nextRunAt for routines that don't have it yet
  cron.schedule('*/5 * * * *', async () => {
    const pending = await db.select().from(routines).where(isNull(routines.nextRunAt))
    for (const r of pending) {
      try {
        const interval = parseExpression(r.cronExpr, { currentDate: r.lastRanAt ?? new Date() })
        const next = interval.next().toDate()
        await db.update(routines).set({ nextRunAt: next }).where(eq(routines.id, r.id))
      } catch {
        // invalid cron expression — skip
      }
    }
  })

  console.log('Scheduler started')
}
