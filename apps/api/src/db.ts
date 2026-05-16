import { getDb } from '@agentboard/db'

export const db = getDb(process.env.DATABASE_PATH ?? './agentboard.db')
