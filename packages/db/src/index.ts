import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema/index.js'

export * from './schema/index.js'
export { schema }

let _db: ReturnType<typeof drizzle> | null = null

export function getDb(dbPath?: string) {
  if (_db) return _db
  const path = dbPath ?? process.env.DATABASE_PATH ?? './agentboard.db'
  const client = createClient({ url: `file:${path}` })
  _db = drizzle(client, { schema })
  return _db
}
