import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { agents } from './agents.js'
import { companies } from './companies.js'

export const heartbeatRuns = sqliteTable('heartbeat_runs', {
  id: text('id').primaryKey().$defaultFn(createId),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
  }).notNull().default('queued'),
  invocationSource: text('invocation_source', {
    enum: ['schedule', 'manual', 'event'],
  }).notNull().default('manual'),
  externalTaskId: text('external_task_id'),
  contextSnapshot: text('context_snapshot'),  // JSON string
  startedAt: text('started_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  finishedAt: text('finished_at'),
})

export const heartbeatEvents = sqliteTable('heartbeat_events', {
  id: text('id').primaryKey().$defaultFn(createId),
  runId: text('run_id').notNull().references(() => heartbeatRuns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: text('payload'),  // JSON string
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
