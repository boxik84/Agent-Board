import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const agentFiles = sqliteTable('agent_files', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('text'),
  content: text('content').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
