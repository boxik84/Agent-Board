import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { agents } from './agents.js'

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey().$defaultFn(createId),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  cronExpr: text('cron_expr').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastRanAt: text('last_ran_at'),
  nextRunAt: text('next_run_at'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
