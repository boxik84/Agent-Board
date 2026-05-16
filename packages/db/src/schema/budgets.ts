import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { companies } from './companies.js'
import { agents } from './agents.js'

export const budgetPolicies = sqliteTable('budget_policies', {
  id: text('id').primaryKey().$defaultFn(createId),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  scopeType: text('scope_type', { enum: ['agent', 'company'] }).notNull(),
  scopeId: text('scope_id').notNull(),
  monthlyCents: integer('monthly_cents').notNull(),
  warnPercent: integer('warn_percent').notNull().default(80),
  hardStopEnabled: integer('hard_stop_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const budgetIncidents = sqliteTable('budget_incidents', {
  id: text('id').primaryKey().$defaultFn(createId),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  incidentType: text('incident_type', { enum: ['warn', 'hard_stop'] }).notNull(),
  spentCents: integer('spent_cents').notNull(),
  limitCents: integer('limit_cents').notNull(),
  occurredAt: text('occurred_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
