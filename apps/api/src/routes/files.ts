import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db.js'
import { agentFiles, companies } from '@agentboard/db'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('text'),
  content: z.string().default(''),
})

const updateSchema = z.object({
  name: z.string().optional(),
  content: z.string().optional(),
})

export async function filesRoutes(app: FastifyInstance) {
  // GET /api/agents/:agentId/files
  app.get<{ Params: { agentId: string } }>('/:agentId/files', async (req) => {
    const files = await db.query.agentFiles.findMany({
      where: eq(agentFiles.agentId, req.params.agentId),
      orderBy: (f, { asc }) => [asc(f.name)],
    })
    return files
  })

  // POST /api/agents/:agentId/files
  app.post<{ Params: { agentId: string }; Body: unknown }>('/:agentId/files', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const [co] = await db.select().from(companies).limit(1)
    const [file] = await db.insert(agentFiles).values({
      id: randomUUID(),
      agentId: req.params.agentId,
      companyId: co?.id ?? '',
      name: body.name,
      type: body.type,
      content: body.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning()
    reply.code(201).send(file)
  })

  // PUT /api/agents/:agentId/files/:fileId
  app.put<{ Params: { agentId: string; fileId: string }; Body: unknown }>('/:agentId/files/:fileId', async (req) => {
    const body = updateSchema.parse(req.body)
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.content !== undefined) updates.content = body.content

    const [file] = await db.update(agentFiles)
      .set(updates)
      .where(and(eq(agentFiles.id, req.params.fileId), eq(agentFiles.agentId, req.params.agentId)))
      .returning()
    return file
  })

  // DELETE /api/agents/:agentId/files/:fileId
  app.delete<{ Params: { agentId: string; fileId: string } }>('/:agentId/files/:fileId', async (req, reply) => {
    await db.delete(agentFiles)
      .where(and(eq(agentFiles.id, req.params.fileId), eq(agentFiles.agentId, req.params.agentId)))
    reply.code(204).send()
  })
}
