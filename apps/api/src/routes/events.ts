import type { FastifyInstance } from 'fastify'
import { sseAddClient } from '../services/sse.js'

export async function eventsRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    reply.raw.write('data: {"type":"connected"}\n\n')
    sseAddClient(reply)
    // Keep connection alive
    const keepAlive = setInterval(() => {
      reply.raw.write(': ping\n\n')
    }, 25000)
    reply.raw.on('close', () => clearInterval(keepAlive))
    // Never call reply.send() — streaming response
    await new Promise(() => {})
  })
}
