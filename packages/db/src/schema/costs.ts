import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { companies } from './companies.js'
import { agents } from './agents.js'
import { heartbeatRuns } from './heartbeats.js'

export const costEvents = sqliteTable('cost_events', {
  id: text('id').primaryKey().$defaultFn(createId),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull().references(() => heartbeatRuns.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('anthropic'),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costCents: integer('cost_cents').notNull().default(0),
  occurredAt: text('occurred_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
