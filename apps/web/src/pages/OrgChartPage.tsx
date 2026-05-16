import { useState, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

// ─── Layout constants ───────────────────────────────────────────────────────────
const NODE_W = 210
const NODE_H = 76
const H_GAP  = 32
const V_GAP  = 72

const STATUS_DOT: Record<string, string> = {
  active: '#22c55e', idle: '#22c55e', running: '#3b82f6',
  paused: '#f59e0b', error: '#ef4444', terminated: '#6b7280',
}

const AI_MODELS: Record<string, string> = {
  openclaw: 'Claude', mock: 'Claude (mock)', anthropic: 'Claude',
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Tree layout algorithm ──────────────────────────────────────────────────────
interface LayoutNode { id: string; x: number; y: number }

function subtreeWidth(id: string, childrenOf: Record<string, string[]>): number {
  const ch = childrenOf[id] ?? []
  if (ch.length === 0) return NODE_W + H_GAP
  return ch.reduce((s, cid) => s + subtreeWidth(cid, childrenOf), 0)
}

function layoutTree(
  id: string, cx: number, y: number,
  childrenOf: Record<string, string[]>, out: LayoutNode[]
) {
  out.push({ id, x: cx - NODE_W / 2, y })
  const ch = childrenOf[id] ?? []
  if (!ch.length) return
  const total = ch.reduce((s, cid) => s + subtreeWidth(cid, childrenOf), 0)
  let cur = cx - total / 2
  for (const cid of ch) {
    const w = subtreeWidth(cid, childrenOf)
    layoutTree(cid, cur + w / 2, y + NODE_H + V_GAP, childrenOf, out)
    cur += w
  }
}

// ─── Node card ──────────────────────────────────────────────────────────────────
interface NodeData {
  id: string; name: string; role: string; title?: string
  icon?: string; status?: string; adapterType?: string
  isTeam?: boolean; color?: string; email?: string; isRoot?: boolean
}

function OrgNode({ node, x, y }: { node: NodeData; x: number; y: number; scale: number }) {
  const dot   = node.isTeam ? '#a855f7' : (STATUS_DOT[node.status ?? ''] ?? '#6b7280')
  const model = node.isTeam ? 'Team member' : (AI_MODELS[node.adapterType ?? ''] ?? 'Claude')
  const init  = initials(node.name)
  const bg    = node.color ?? '#6366f1'
  const isRoot = node.isRoot

  return (
    <foreignObject x={x} y={y} width={NODE_W} height={NODE_H} style={{ overflow: 'visible' }}>
      <div
        style={{
          width: NODE_W, height: NODE_H,
          background: isRoot ? 'rgba(30,40,60,0.97)' : 'rgba(22,22,32,0.97)',
          border: `1px solid ${isRoot ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
          boxShadow: isRoot ? '0 0 0 1px rgba(99,102,241,0.3), 0 4px 20px rgba(0,0,0,0.5)' : '0 2px 12px rgba(0,0,0,0.4)',
          cursor: 'default', userSelect: 'none',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `${bg}22`, border: `1.5px solid ${bg}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: bg, letterSpacing: 0.5,
        }}>
          {node.icon && !node.isTeam ? node.icon : init}
        </div>

        {/* Text */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#f1f5f9',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {node.name}
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(148,163,184,0.8)', marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {node.role}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, boxShadow: `0 0 4px ${dot}` }} />
            <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>{model}</span>
          </div>
        </div>
      </div>
    </foreignObject>
  )
}

// ─── Connector path ─────────────────────────────────────────────────────────────
function Connector({ fromX, fromY, toX, toY }: { fromX: number; fromY: number; toX: number; toY: number }) {
  const my = (fromY + toY) / 2
  return (
    <path
      d={`M ${fromX} ${fromY} C ${fromX} ${my}, ${toX} ${my}, ${toX} ${toY}`}
      fill="none"
      stroke="rgba(255,255,255,0.1)"
      strokeWidth={1.5}
    />
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────────
export default function OrgChartPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [transform, setTransform] = useState({ x: 0, y: 60, scale: 0.9 })
  const dragging = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [teamForm, setTeamForm] = useState({ name: '', role: '', email: '', color: '#6366f1', reportsTo: '' })

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })
  const { data: teamMembers = [], refetch: refetchTeam } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.team.list(),
  })

  // Build combined node list
  const allNodes: NodeData[] = useMemo(() => {
    const active = (agents as any[]).filter((a: any) => a.status !== 'terminated')
    const aNodes = active.map((a: any) => ({
      id: a.id, name: a.name, role: a.role, title: a.title,
      icon: a.icon, status: a.status, adapterType: a.adapterType,
      reportsTo: a.reportsTo, isTeam: false,
    }))
    const tNodes = (teamMembers as any[]).map((m: any) => ({
      id: `team-${m.id}`, name: m.name, role: m.role, email: m.email,
      color: m.color, reportsTo: m.reportsTo, isTeam: true,
    }))
    return [...aNodes, ...tNodes]
  }, [agents, teamMembers])

  // Build children map
  const childrenOf = useMemo(() => {
    const map: Record<string, string[]> = {}
    const idSet = new Set(allNodes.map(n => n.id))
    for (const n of allNodes) {
      const pid = (n as any).reportsTo
      const parent = pid && idSet.has(pid) ? pid : '__root__'
      if (!map[parent]) map[parent] = []
      map[parent].push(n.id)
    }
    return map
  }, [allNodes])

  // Compute layout
  const positions = useMemo<Record<string, LayoutNode>>(() => {
    const roots = childrenOf['__root__'] ?? []
    const out: LayoutNode[] = []
    const totalW = roots.reduce((s, rid) => s + subtreeWidth(rid, childrenOf), 0)
    const cx = totalW / 2
    for (const rid of roots) {
      layoutTree(rid, cx - totalW / 2 + (roots.indexOf(rid) > 0 ? 0 : 0), 20, childrenOf, out)
      break  // simplified: just layout from virtual root
    }
    // Reset: layout all roots side by side properly
    out.length = 0
    let curX = H_GAP
    for (const rid of roots) {
      const w = subtreeWidth(rid, childrenOf)
      layoutTree(rid, curX + w / 2 - H_GAP / 2, 20, childrenOf, out)
      curX += w
    }
    return Object.fromEntries(out.map(n => [n.id, n]))
  }, [childrenOf])

  // Compute edges
  const edges = useMemo(() => {
    const result: { from: string; to: string }[] = []
    for (const [parent, children] of Object.entries(childrenOf)) {
      if (parent === '__root__') continue
      for (const child of children) result.push({ from: parent, to: child })
    }
    return result
  }, [childrenOf])

  // Pan / zoom handlers
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => ({ ...t, scale: Math.max(0.2, Math.min(2.5, t.scale * delta)) }))
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragging.current = { sx: e.clientX, sy: e.clientY, tx: transform.x, ty: transform.y }
  }, [transform])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    setTransform(t => ({
      ...t,
      x: dragging.current!.tx + (e.clientX - dragging.current!.sx),
      y: dragging.current!.ty + (e.clientY - dragging.current!.sy),
    }))
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = null }, [])

  const resetView = () => setTransform({ x: 0, y: 60, scale: 0.9 })

  // Add team member
  const addTeamMember = async () => {
    if (!teamForm.name.trim() || !teamForm.role.trim()) return
    await api.team.create({
      name: teamForm.name, role: teamForm.role,
      email: teamForm.email || undefined,
      color: teamForm.color,
      reportsTo: teamForm.reportsTo || undefined,
    })
    refetchTeam()
    setShowAddTeam(false)
    setTeamForm({ name: '', role: '', email: '', color: '#6366f1', reportsTo: '' })
  }

  // Mark root nodes
  const rootIds = new Set(childrenOf['__root__'] ?? [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Org Chart</h1>
          <p className="text-xs text-muted-foreground">{allNodes.length} členov • scroll = zoom • ťahať = pohyb</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-1">
            <button onClick={() => setTransform(t => ({ ...t, scale: Math.min(2.5, t.scale * 1.2) }))}
              className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <ZoomIn size={14} />
            </button>
            <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale * 0.8) }))}
              className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <ZoomOut size={14} />
            </button>
            <button onClick={resetView}
              className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
              <Maximize2 size={14} />
            </button>
            <span className="text-xs text-muted-foreground px-2">{Math.round(transform.scale * 100)}%</span>
          </div>
          <button
            onClick={() => setShowAddTeam(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
          >
            + Člen tímu
          </button>
        </div>
      </div>

      {/* Add team member form */}
      {showAddTeam && (
        <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-card/30 flex items-end gap-3">
          <div className="flex-1 grid grid-cols-5 gap-2">
            <input placeholder="Meno *" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))}
              className="h-8 px-3 text-sm bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50" />
            <input placeholder="Pozícia *" value={teamForm.role} onChange={e => setTeamForm(f => ({ ...f, role: e.target.value }))}
              className="h-8 px-3 text-sm bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50" />
            <input placeholder="Email" value={teamForm.email} onChange={e => setTeamForm(f => ({ ...f, email: e.target.value }))}
              className="h-8 px-3 text-sm bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50" />
            <select value={teamForm.reportsTo} onChange={e => setTeamForm(f => ({ ...f, reportsTo: e.target.value }))}
              className="h-8 px-2 text-sm bg-secondary/50 border border-border rounded-lg text-foreground outline-none focus:border-primary/50">
              <option value="">— Nadriadený —</option>
              {(agents as any[]).filter((a: any) => a.status !== 'terminated').map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Farba:</label>
              <input type="color" value={teamForm.color} onChange={e => setTeamForm(f => ({ ...f, color: e.target.value }))}
                className="h-7 w-10 rounded cursor-pointer bg-transparent border border-border" />
            </div>
          </div>
          <button onClick={addTeamMember}
            className="h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-colors">
            Pridať
          </button>
          <button onClick={() => setShowAddTeam(false)}
            className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:bg-accent transition-colors">
            Zrušiť
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex-shrink-0 px-5 py-1.5 border-b border-border flex items-center gap-5">
        {[
          { color: '#22c55e', label: 'Active' },
          { color: '#3b82f6', label: 'Running' },
          { color: '#f59e0b', label: 'Paused' },
          { color: '#a855f7', label: 'Team member' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className="size-2 rounded-full" style={{ background: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* SVG canvas */}
      <div
        className="flex-1 overflow-hidden bg-[oklch(0.10_0.005_260)] cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ userSelect: 'none' }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          {/* Dot grid background */}
          <defs>
            <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="0" cy="0" r="0.8" fill="rgba(255,255,255,0.07)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Connectors */}
            {edges.map(({ from, to }) => {
              const fp = positions[from], tp = positions[to]
              if (!fp || !tp) return null
              return (
                <Connector
                  key={`${from}-${to}`}
                  fromX={fp.x + NODE_W / 2}
                  fromY={fp.y + NODE_H}
                  toX={tp.x + NODE_W / 2}
                  toY={tp.y}
                />
              )
            })}

            {/* Nodes */}
            {allNodes.map(node => {
              const pos = positions[node.id]
              if (!pos) return null
              return (
                <OrgNode
                  key={node.id}
                  node={{ ...node, isRoot: rootIds.has(node.id) }}
                  x={pos.x}
                  y={pos.y}
                  scale={transform.scale}
                />
              )
            })}
          </g>
        </svg>

        {allNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            Žiadni agenti. Pridajte agentov na stránke Agenti.
          </div>
        )}
      </div>
    </div>
  )
}
