import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  email: text('email'),
  color: text('color').notNull().default('#6366f1'),
  reportsTo: text('reports_to'),
  createdAt: text('created_at').notNull(),
})
