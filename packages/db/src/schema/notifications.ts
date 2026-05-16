import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  type: text('type').notNull().default('info'),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  fromAgentId: text('from_agent_id'),
  fromAgentName: text('from_agent_name'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  status: text('status').notNull().default('unread'),
  requiresApproval: integer('requires_approval').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
