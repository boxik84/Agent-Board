import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createId } from '../utils.js'
import { sql } from 'drizzle-orm'
import { companies } from './companies.js'
import { agents } from './agents.js'

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey().$defaultFn(createId),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done'],
  }).notNull().default('backlog'),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'urgent'],
  }).notNull().default('medium'),
  identifier: text('identifier').notNull(),
  issueNumber: integer('issue_number').notNull(),
  parentId: text('parent_id'),
  labels: text('labels').notNull().default('[]'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const issueComments = sqliteTable('issue_comments', {
  id: text('id').primaryKey().$defaultFn(createId),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorType: text('author_type', { enum: ['user', 'agent', 'system'] }).notNull().default('user'),
  authorId: text('author_id'),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})
