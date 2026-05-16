import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey().$defaultFn(createId),
  name: text('name').notNull(),
  mission: text('mission'),
  status: text('status', { enum: ['active', 'paused'] }).notNull().default('active'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
