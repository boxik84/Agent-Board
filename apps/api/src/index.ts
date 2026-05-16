import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth.js'
import { companiesRoutes } from './routes/companies.js'
import { agentsRoutes } from './routes/agents.js'
import { issuesRoutes } from './routes/issues.js'
import { heartbeatsRoutes } from './routes/heartbeats.js'
import { costsRoutes } from './routes/costs.js'
import { webhooksRoutes } from './routes/webhooks.js'
import { eventsRoutes } from './routes/events.js'
import { startScheduler } from './scheduler/index.js'
import { filesRoutes } from './routes/files.js'
import { tasksRoutes } from './routes/tasks.js'
import { memoryRoutes } from './routes/memory.js'
import { teamRoutes } from './routes/team.js'
import { notificationsRoutes } from './routes/notifications.js'
import { activityRoutes } from './routes/activity.js'
import { db } from './db.js'
import { companies } from '@agentboard/db'
import { randomUUID } from 'crypto'

const app = Fastify({ logger: { level: 'info' } })

await app.register(cors, { origin: true })
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-me' })

app.addHook('onRequest', async (req, reply) => {
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/webhooks', '/api/health']
  const isPublic = publicPaths.some(p => req.url.startsWith(p))
  if (isPublic) return
  try {
    await req.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(companiesRoutes, { prefix: '/api/companies' })
await app.register(agentsRoutes, { prefix: '/api/agents' })
await app.register(issuesRoutes, { prefix: '/api/issues' })
await app.register(heartbeatsRoutes, { prefix: '/api/heartbeats' })
await app.register(costsRoutes, { prefix: '/api/costs' })
await app.register(webhooksRoutes, { prefix: '/api/webhooks' })
await app.register(eventsRoutes, { prefix: '/api/events' })
await app.register(filesRoutes, { prefix: '/api/agent-files' })
await app.register(tasksRoutes, { prefix: '/api/tasks' })
await app.register(memoryRoutes, { prefix: '/api/memory' })
await app.register(teamRoutes, { prefix: '/api/team' })
await app.register(notificationsRoutes, { prefix: '/api/notifications' })
await app.register(activityRoutes, { prefix: '/api/activity' })

app.get('/api/health', async () => ({ ok: true }))
app.get('/api/company', async () => {
  const [co] = await db.select().from(companies).limit(1)
  return co ?? null
})

// Auto-seed default company if none exists
const existing = await db.select().from(companies).limit(1)
if (existing.length === 0) {
  await db.insert(companies).values({
    id: randomUUID(),
    name: 'AgentBoard',
    mission: 'AI agent orchestration platform',
    status: 'active',
  })
  console.log('Default company seeded')
}

startScheduler()

const port = Number(process.env.PORT ?? 3001)
await app.listen({ port, host: '0.0.0.0' })
console.log(`AgentBoard API running on http://localhost:${port}`)
