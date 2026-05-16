import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { companies } from './companies.js'

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(createId),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  actorType: text('actor_type', { enum: ['user', 'agent', 'system'] }).notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details'),  // JSON string
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
