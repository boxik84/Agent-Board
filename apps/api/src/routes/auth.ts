import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db.js'
import { users } from '@agentboard/db'
import { eq } from 'drizzle-orm'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    if (existing.length > 0) return reply.code(400).send({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(body.password, 10)
    const [user] = await db.insert(users).values({ email: body.email, passwordHash }).returning()
    const token = app.jwt.sign({ sub: user.id, email: user.email })
    return { token, user: { id: user.id, email: user.email } }
  })

  app.post('/login', async (req, reply) => {
    const body = loginSchema.parse(req.body)
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const token = app.jwt.sign({ sub: user.id, email: user.email })
    return { token, user: { id: user.id, email: user.email } }
  })

  app.get('/me', async (req) => {
    const payload = req.user as { sub: string; email: string }
    return { id: payload.sub, email: payload.email }
  })
}
