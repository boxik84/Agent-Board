import type { FastifyInstance } from 'fastify'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import os from 'os'

const MEMORY_DIR = join(os.homedir(), '.claude', 'projects', 'C--Users-karol-Desktop-Claude-Code-Project', 'memory')

export async function memoryRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    try {
      const files = await readdir(MEMORY_DIR)
      const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'MEMORY.md')

      const memories = await Promise.all(mdFiles.map(async (filename) => {
        const content = await readFile(join(MEMORY_DIR, filename), 'utf-8')
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/m)
        if (!frontmatterMatch) return { filename, name: filename.replace('.md', ''), type: 'unknown', description: '', body: content }

        const fm = frontmatterMatch[1]
        const body = frontmatterMatch[2].trim()
        const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? filename.replace('.md', '')
        const type = fm.match(/^type:\s*(.+)$/m)?.[1]?.trim() ?? 'unknown'
        const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? ''

        return { filename, name, type, description, body }
      }))

      return memories.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    } catch {
      return []
    }
  })
}
