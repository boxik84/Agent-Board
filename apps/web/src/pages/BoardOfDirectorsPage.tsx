import { useRef, useState, useCallback } from 'react'
import { BOD_MEMBERS } from '@/lib/bod'

const MEMBERS_DATA = [
  {
    ...BOD_MEMBERS[0],
    description: 'Zakladateľ a predseda predstavenstva. Vízia, stratégia a celkový smer spoločnosti.',
    role: 'Chairman',
    color: '#f59e0b',
    bg: 'from-amber-500/20 to-yellow-500/5',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/40',
  },
  {
    ...BOD_MEMBERS[1],
    description: 'Viceprezident a technický riaditeľ. Zodpovedný za technológiu a AI agentov.',
    role: 'Vice Chairman · CTO',
    color: '#8b5cf6',
    bg: 'from-violet-500/20 to-purple-500/5',
    border: 'border-violet-500/30',
    ring: 'ring-violet-500/40',
  },
  {
    ...BOD_MEMBERS[2],
    description: 'Člen predstavenstva a administratívny riaditeľ. Operácie a compliance.',
    role: 'Chief of Admin',
    color: '#06b6d4',
    bg: 'from-cyan-500/20 to-blue-500/5',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/40',
  },
]

const CX = 400
const CY = 220

const NODES = [
  { member: MEMBERS_DATA[0], x: 0, y: -110, w: 240 },
  { member: MEMBERS_DATA[1], x: -210, y: 90, w: 210 },
  { member: MEMBERS_DATA[2], x: 210, y: 90, w: 210 },
]

export default function BoardOfDirectorsPage() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }, [offset])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.mx,
      y: dragStart.current.oy + e.clientY - dragStart.current.my,
    })
  }, [])

  const onMouseUp = useCallback(() => {
    setDragging(false)
    dragStart.current = null
  }, [])

  const n = NODES.map(node => ({ x: CX + node.x, y: CY + node.y }))
  const midY = n[0].y + 80

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Board of Directors</h1>
        <p className="text-muted-foreground mt-1 text-sm">Presuňte myšou pre pohyb po plátne</p>
      </div>

      {/* Draggable canvas */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{ cursor: dragging ? 'grabbing' : 'grab', minHeight: 320 }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          className="absolute inset-0 flex items-center justify-center select-none"
        >
          <div style={{ position: 'relative', transform: `translate(${offset.x}px, ${offset.y}px)` }}>
            {/* SVG connector lines */}
            <svg
              style={{
                position: 'absolute',
                width: CX * 2,
                height: CY * 2 + 100,
                left: -CX,
                top: -(CY + 50),
                overflow: 'visible',
                pointerEvents: 'none',
              }}
            >
              {/* Vertical from chairman down */}
              <line x1={n[0].x} y1={n[0].y + 78} x2={n[0].x} y2={midY} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              {/* Horizontal bar */}
              <line x1={n[1].x} y1={midY} x2={n[2].x} y2={midY} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              {/* Verticals down to members */}
              <line x1={n[1].x} y1={midY} x2={n[1].x} y2={n[1].y} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1={n[2].x} y1={midY} x2={n[2].x} y2={n[2].y} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 3" />
              {/* Dots at junctions */}
              <circle cx={n[1].x} cy={midY} r="3" fill="rgba(255,255,255,0.2)" />
              <circle cx={n[2].x} cy={midY} r="3" fill="rgba(255,255,255,0.2)" />
              <circle cx={n[0].x} cy={midY} r="3" fill="rgba(255,255,255,0.2)" />
            </svg>

            {/* Cards */}
            {NODES.map(({ member: m, x, y, w }, i) => (
              <div
                key={m.id}
                style={{
                  position: 'absolute',
                  left: CX + x - w / 2,
                  top: CY + y - (i === 0 ? 45 : 40),
                  width: w,
                }}
              >
                <div className={`rounded-2xl border ${m.border} bg-gradient-to-br ${m.bg} p-5 shadow-xl shadow-black/30 backdrop-blur-sm`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`rounded-full p-0.5 ring-2 ${m.ring} flex-shrink-0`}
                    >
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className={`${i === 0 ? 'size-14' : 'size-12'} rounded-full object-cover block`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm leading-tight truncate">{m.name}</p>
                      <span
                        className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${m.color}25`, color: m.color, border: `1px solid ${m.color}40` }}
                      >
                        {m.role}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-3 right-4 text-[10px] text-muted-foreground/30 pointer-events-none select-none">
          drag to pan
        </p>
      </div>

      {/* Table */}
      <div className="px-8 pb-8 pt-4 flex-shrink-0">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detaily</h2>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Člen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pozícia</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MEMBERS_DATA.map(m => (
                <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={m.avatar} alt={m.name} className="size-7 rounded-full object-cover ring-1 ring-border" />
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}30` }}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
