import type { FastifyReply } from 'fastify'

const clients = new Set<FastifyReply>()

export function sseAddClient(reply: FastifyReply) {
  clients.add(reply)
  reply.raw.on('close', () => clients.delete(reply))
}

export function sseEmit(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      client.raw.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}
