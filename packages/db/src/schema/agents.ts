import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { companies } from './companies.js'

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey().$defaultFn(createId),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  title: text('title'),
  icon: text('icon').default('🤖'),
  status: text('status', {
    enum: ['active', 'paused', 'idle', 'running', 'error', 'terminated'],
  }).notNull().default('active'),
  reportsTo: text('reports_to'),
  adapterType: text('adapter_type').notNull().default('openclaw'),
  adapterConfig: text('adapter_config').notNull().default('{}'),  // stored as JSON string
  budgetMonthlyCents: integer('budget_monthly_cents').notNull().default(0),
  spentMonthlyCents: integer('spent_monthly_cents').notNull().default(0),
  lastHeartbeatAt: text('last_heartbeat_at'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
