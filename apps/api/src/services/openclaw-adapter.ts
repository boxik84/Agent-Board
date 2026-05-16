import { setTimeout as sleep } from 'node:timers/promises'

export interface SubmitTaskOptions {
  runId: string
  agentId: string
  message: string
  timeoutSeconds?: number
  adapterConfig?: Record<string, unknown>
}

const host = process.env.OPENCLAW_HOST ?? 'mock'
const token = process.env.OPENCLAW_TOKEN ?? ''
const callbackBase = process.env.CALLBACK_BASE_URL ?? 'http://localhost:3001'

export async function submitTask(opts: SubmitTaskOptions): Promise<{ taskId: string }> {
  const { runId, agentId, message, timeoutSeconds = 300, adapterConfig = {} } = opts

  if (host === 'mock') {
    const taskId = `mock-${runId}`
    // Simulate async completion — self-calls the webhook endpoint after 3s
    sleep(3000).then(async () => {
      try {
        await fetch(`${callbackBase}/api/webhooks/openclaw/${runId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            status: 'succeeded',
            output: `[MOCK] Agent completed: ${message.slice(0, 80)}`,
            error: null,
            completedAt: new Date().toISOString(),
            inputTokens: 512,
            outputTokens: 256,
            model: 'claude-sonnet-4-6',
          }),
        })
      } catch (err) {
        console.error('Mock callback failed:', err)
      }
    })
    return { taskId }
  }

  const openclawAgentId = (adapterConfig.agentId as string) ?? 'main'
  const url = `${host}/hooks/agent`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      name: `run-${runId}`,
      agentId: openclawAgentId,
      deliver: false,
      timeoutSeconds,
      webhookUrl: `${callbackBase}/api/webhooks/openclaw/${runId}`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenClaw rejected task: ${res.status} ${text}`)
  }

  const json = await res.json() as { ok: boolean; taskId?: string }
  return { taskId: json.taskId ?? runId }
}
