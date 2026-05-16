const getToken = () => localStorage.getItem('token') ?? ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? err.message ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string) =>
      request<{ token: string; user: { id: string; email: string } }>('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ id: string; email: string }>('/api/auth/me'),
  },
  company: {
    get: () => request<any>('/api/company'),
  },
  agents: {
    list: (companyId?: string) =>
      request<any[]>(`/api/agents${companyId ? `?companyId=${companyId}` : ''}`),
    get: (id: string) => request<any>(`/api/agents/${id}`),
    create: (data: object) =>
      request<any>('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      request<any>(`/api/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    terminate: (id: string) =>
      request<any>(`/api/agents/${id}`, { method: 'DELETE' }),
    files: {
      list: (agentId: string) => request<any[]>(`/api/agent-files/${agentId}/files`),
      create: (agentId: string, data: { name: string; type?: string; content?: string }) =>
        request<any>(`/api/agent-files/${agentId}/files`, { method: 'POST', body: JSON.stringify(data) }),
      update: (agentId: string, fileId: string, data: { name?: string; content?: string }) =>
        request<any>(`/api/agent-files/${agentId}/files/${fileId}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (agentId: string, fileId: string) =>
        request<void>(`/api/agent-files/${agentId}/files/${fileId}`, { method: 'DELETE' }),
    },
  },
  issues: {
    list: (params?: { companyId?: string; status?: string; agentId?: string }) => {
      const q = new URLSearchParams(params as any).toString()
      return request<any[]>(`/api/issues${q ? `?${q}` : ''}`)
    },
    create: (data: object) =>
      request<any>('/api/issues', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) =>
      request<any>(`/api/issues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/api/issues/${id}`, { method: 'DELETE' }),
  },
  heartbeats: {
    list: (agentId?: string) =>
      request<any[]>(`/api/heartbeats${agentId ? `?agentId=${agentId}` : ''}`),
    trigger: (agentId: string, message?: string) =>
      request<any>('/api/heartbeats/trigger', { method: 'POST', body: JSON.stringify({ agentId, message }) }),
    events: (runId: string) => request<any[]>(`/api/heartbeats/${runId}/events`),
  },
  costs: {
    summary: (companyId?: string) =>
      request<any[]>(`/api/costs${companyId ? `?companyId=${companyId}` : ''}`),
  },
  tasks: {
    list: () => request<any[]>('/api/tasks'),
    create: (data: object) => request<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<any>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  },
  memory: {
    list: () => request<any[]>('/api/memory'),
  },
  notifications: {
    list: () => request<any[]>('/api/notifications'),
    create: (data: object) => request<any>('/api/notifications', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) => request<any>(`/api/notifications/${id}/approve`, { method: 'POST' }),
    reject: (id: string) => request<any>(`/api/notifications/${id}/reject`, { method: 'POST' }),
    markRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    delete: (id: string) => request<void>(`/api/notifications/${id}`, { method: 'DELETE' }),
  },
  activity: {
    list: (companyId?: string) => {
      const q = companyId ? `?companyId=${companyId}` : ''
      return request<any[]>(`/api/activity${q}`)
    },
  },
  team: {
    list: () => request<any[]>('/api/team'),
    create: (data: object) => request<any>('/api/team', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: object) => request<any>(`/api/team/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/team/${id}`, { method: 'DELETE' }),
  },
}

export function useSSE(onEvent: (data: any) => void) {
  let es: EventSource | null = null
  const connect = () => {
    es = new EventSource('/api/events')
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)) } catch {}
    }
    es.onerror = () => {
      es?.close()
      setTimeout(connect, 3000)
    }
  }
  connect()
  return () => es?.close()
}
