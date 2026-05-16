import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, useSSE } from '../api/client'
import { Activity, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ── World canvas ──────────────────────────────────────────────────────────
const W = 2400
const SPEED = 2.2
const TICK_MS = 30

// ── Room defs ─────────────────────────────────────────────────────────────
const ROOM_TECH    = { x: 0,    y: 0,   w: 780,  h: 680,  label: 'Tech Department' }
const ROOM_MEETING = { x: 780,  y: 0,   w: 720,  h: 680,  label: 'Meeting Room'    }
const ROOM_OFFICE  = { x: 1500, y: 0,   w: 900,  h: 680,  label: 'Office'          }
const ROOM_KITCHEN = { x: 0,    y: 710, w: 620,  h: 930,  label: 'Break Room'      }
const ROOM_OPEN    = { x: 620,  y: 710, w: 1780, h: 930,  label: 'Open Office'     }

// ── Desk center positions (world px) ─────────────────────────────────────
// Tech: Lead Dev at front-center, developers in back row
const TECH_DESK_LEAD = { x: 390,  y: 510 }  // prominent front desk
const TECH_DESKS_BACK = [
  { x: 140,  y: 230 }, { x: 390,  y: 230 }, { x: 640,  y: 230 },
]

const OFFICE_DESK_COS = { x: 1690, y: 230 }  // CoS (left side)
const OFFICE_DESK_CEO = { x: 2100, y: 230 }  // CEO / Founder (right side)
const OFFICE_DESKS = [OFFICE_DESK_COS, OFFICE_DESK_CEO]
const OPEN_DESKS = [
  { x: 760,  y: 980 }, { x: 1060, y: 980 }, { x: 1360, y: 980 },
  { x: 1660, y: 980 }, { x: 1960, y: 980 }, { x: 2260, y: 980 },
  { x: 880,  y: 1320},{ x: 1200, y: 1320},{ x: 1520, y: 1320 },
]

// ── Meeting table ─────────────────────────────────────────────────────────
const MTG = { cx: 1140, cy: 330, rx: 240, ry: 165 }

// ── Water cooler ──────────────────────────────────────────────────────────
const COOLER_POS = { x: 115, y: 1000 }

// ── Wander zones per home room ────────────────────────────────────────────
const ZONES = {
  tech:   { x0: 30,   y0: 100, x1: 750,  y1: 660 },
  office: { x0: 1530, y0: 100, x1: 2370, y1: 660 },
  open:   { x0: 650,  y0: 760, x1: 2370, y1: 1620 },
}

function randInZone(z: { x0: number; y0: number; x1: number; y1: number }) {
  return {
    x: z.x0 + Math.random() * (z.x1 - z.x0),
    y: z.y0 + Math.random() * (z.y1 - z.y0),
  }
}

interface Vec { x: number; y: number }
type WalkMode = 'wander' | 'to_desk' | 'at_desk' | 'to_meeting' | 'at_meeting' | 'to_cooler' | 'at_cooler'

interface Bot {
  id: string; name: string; color: string; role: string
  homeZone: 'tech' | 'office' | 'open'
  deskCenter: Vec; seatPos: Vec
  pos: Vec; target: Vec; facing: 1 | -1
  mode: WalkMode; walkPhase: number; idleTimer: number; status: string
}

function roleToZone(role: string): 'tech' | 'office' | 'open' {
  const r = role.toLowerCase()
  if (r.includes('developer') || r.includes('design developer') || r.includes('web developer') || r.includes('code developer') || r.includes('lead developer')) return 'tech'
  if (r.includes('chief') || r.includes('ceo') || r.includes('founder')) return 'office'
  return 'open'
}

function deskSeatPx(desk: Vec): Vec { return { x: desk.x, y: desk.y + 62 } }

function meetingSeatPx(i: number, total: number): Vec {
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2
  return { x: MTG.cx + MTG.rx * 0.84 * Math.cos(angle), y: MTG.cy + MTG.ry * 0.84 * Math.sin(angle) }
}

function dist(a: Vec, b: Vec) { return Math.hypot(a.x - b.x, a.y - b.y) }

const AGENT_COLORS = [
  '#7c3aed','#2563eb','#16a34a','#dc2626','#ea580c',
  '#0891b2','#be185d','#ca8a04','#4f46e5','#059669','#9333ea',
]

// ── Desk SVG ──────────────────────────────────────────────────────────────
function Desk({ cx, cy, active, wide }: { cx: number; cy: number; active: boolean; wide?: boolean }) {
  const dw = wide ? 160 : 120, dh = 72, monW = wide ? 90 : 68, monH = 52
  const monY = cy - dh / 2 - monH - 4
  return (
    <g>
      <rect x={cx - dw / 2 + 5} y={cy - dh / 2 + dh * 0.35 + 6} width={dw - 10} height={dh * 0.7} rx={6} fill="rgba(0,0,0,0.4)" />
      <rect x={cx - dw / 2} y={cy - dh / 2 + dh * 0.35} width={dw} height={dh * 0.7} rx={5}
        fill="rgba(32,20,8,0.97)" stroke={active ? 'rgba(96,165,250,0.3)' : 'rgba(150,100,35,0.25)'} strokeWidth={1.2} />
      <rect x={cx - dw / 2 + 8} y={cy - dh / 2 + dh * 0.5} width={dw - 16} height={1} fill="rgba(150,100,35,0.12)" />
      <rect x={cx - 3} y={cy - dh / 2 + dh * 0.35 - 10} width={6} height={12} rx={1} fill="rgba(38,38,58,0.95)" />
      <rect x={cx - 14} y={cy - dh / 2 + dh * 0.35 - 1} width={28} height={3} rx={1} fill="rgba(38,38,58,0.95)" />
      <rect x={cx - monW / 2} y={monY} width={monW} height={monH} rx={4}
        fill={active ? 'rgba(14,36,90,0.97)' : 'rgba(8,8,18,0.98)'}
        stroke={active ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.06)'} strokeWidth={1.2} />
      {active && <>
        <rect x={cx - monW / 2 + 7} y={monY + 9}  width={monW - 14} height={3} rx={1} fill="rgba(96,165,250,0.6)" />
        <rect x={cx - monW / 2 + 7} y={monY + 16} width={(monW - 14) * 0.75} height={2.5} rx={1} fill="rgba(96,165,250,0.38)" />
        <rect x={cx - monW / 2 + 7} y={monY + 22} width={(monW - 14) * 0.88} height={2.5} rx={1} fill="rgba(96,165,250,0.3)" />
        <rect x={cx - monW / 2 + 7} y={monY + 28} width={(monW - 14) * 0.6} height={2.5} rx={1} fill="rgba(96,165,250,0.22)" />
      </>}
      <rect x={cx - 20} y={cy - dh / 2 + dh * 0.4} width={40} height={11} rx={3} fill="rgba(26,26,44,0.88)" />
      <ellipse cx={cx + (wide ? 34 : 28)} cy={cy - dh / 2 + dh * 0.48} rx={6.5} ry={8} fill="rgba(26,26,44,0.88)" />
      <rect x={cx - dw / 2 + 7} y={cy - dh / 2 + dh + 14} width={5} height={17} rx={2} fill="rgba(12,7,2,0.9)" />
      <rect x={cx + dw / 2 - 12} y={cy - dh / 2 + dh + 14} width={5} height={17} rx={2} fill="rgba(12,7,2,0.9)" />
    </g>
  )
}

// ── Office SVG content ─────────────────────────────────────────────────────
function OfficeSVGContent({ bots }: { bots: Bot[] }) {

  return (
    <>
      <defs>
        {/* Floor patterns per room */}
        <pattern id="floor-tech"    x={0} y={0} width={80} height={80} patternUnits="userSpaceOnUse">
          <rect width={80} height={80} fill="oklch(0.155 0.012 230)" />
          <rect width={40} height={40} fill="oklch(0.145 0.01 230)" />
          <rect x={40} y={40} width={40} height={40} fill="oklch(0.145 0.01 230)" />
        </pattern>
        <pattern id="floor-meeting" x={0} y={0} width={80} height={80} patternUnits="userSpaceOnUse">
          <rect width={80} height={80} fill="oklch(0.12 0.02 275)" />
          <rect width={40} height={40} fill="oklch(0.115 0.018 275)" />
          <rect x={40} y={40} width={40} height={40} fill="oklch(0.115 0.018 275)" />
        </pattern>
        <pattern id="floor-office" x={0} y={0} width={80} height={80} patternUnits="userSpaceOnUse">
          <rect width={80} height={80} fill="oklch(0.148 0.015 30)" />
          <rect width={40} height={40} fill="oklch(0.14 0.013 30)" />
          <rect x={40} y={40} width={40} height={40} fill="oklch(0.14 0.013 30)" />
        </pattern>
        <pattern id="floor-kitchen" x={0} y={0} width={60} height={60} patternUnits="userSpaceOnUse">
          <rect width={60} height={60} fill="oklch(0.138 0.012 145)" />
          <rect width={30} height={30} fill="oklch(0.13 0.01 145)" />
          <rect x={30} y={30} width={30} height={30} fill="oklch(0.13 0.01 145)" />
        </pattern>
        <pattern id="floor-open" x={0} y={0} width={80} height={80} patternUnits="userSpaceOnUse">
          <rect width={80} height={80} fill="oklch(0.165 0.008 255)" />
          <rect width={40} height={40} fill="oklch(0.155 0.007 255)" />
          <rect x={40} y={40} width={40} height={40} fill="oklch(0.155 0.007 255)" />
        </pattern>
        <radialGradient id="mtg-carpet" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1a0e40" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d0820" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="office-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#1a0e00" stopOpacity="0.65" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <filter id="mon-glow">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Room floors ─────────────────────────────────── */}
      <rect x={ROOM_TECH.x}    y={ROOM_TECH.y}    width={ROOM_TECH.w}    height={ROOM_TECH.h}    fill="url(#floor-tech)" />
      <rect x={ROOM_MEETING.x} y={ROOM_MEETING.y} width={ROOM_MEETING.w} height={ROOM_MEETING.h} fill="url(#floor-meeting)" />
      <rect x={ROOM_OFFICE.x}  y={ROOM_OFFICE.y}  width={ROOM_OFFICE.w}  height={ROOM_OFFICE.h}  fill="url(#floor-office)" />
      <rect x={ROOM_KITCHEN.x} y={ROOM_KITCHEN.y} width={ROOM_KITCHEN.w} height={ROOM_KITCHEN.h} fill="url(#floor-kitchen)" />
      <rect x={ROOM_OPEN.x}    y={ROOM_OPEN.y}    width={ROOM_OPEN.w}    height={ROOM_OPEN.h}    fill="url(#floor-open)" />

      {/* Hallway gap */}
      <rect x={0} y={680} width={W} height={30} fill="rgba(0,0,0,0.6)" />

      {/* ── Room walls (borders) ─────────────────────────── */}
      {[
        { r: ROOM_TECH,    color: 'rgba(56,189,248,0.18)' },
        { r: ROOM_MEETING, color: 'rgba(139,92,246,0.22)' },
        { r: ROOM_OFFICE,  color: 'rgba(251,191,36,0.18)' },
        { r: ROOM_KITCHEN, color: 'rgba(52,211,153,0.16)' },
        { r: ROOM_OPEN,    color: 'rgba(148,163,184,0.12)' },
      ].map(({ r, color }, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h}
          fill="none" stroke={color} strokeWidth={3} />
      ))}

      {/* ── Room labels ──────────────────────────────────── */}
      {[
        { r: ROOM_TECH,    color: 'rgba(56,189,248,0.6)' },
        { r: ROOM_MEETING, color: 'rgba(139,92,246,0.6)' },
        { r: ROOM_OFFICE,  color: 'rgba(251,191,36,0.6)' },
        { r: ROOM_KITCHEN, color: 'rgba(52,211,153,0.55)'},
        { r: ROOM_OPEN,    color: 'rgba(148,163,184,0.45)'},
      ].map(({ r, color }, i) => (
        <text key={i} x={r.x + r.w / 2} y={r.y + 28} textAnchor="middle"
          fontSize={14} fontWeight={700} fill={color} letterSpacing={2}
          style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}>
          {r.label}
        </text>
      ))}

      {/* ── Tech dept desks ──────────────────────────────── */}
      {/* Lead Dev — featured front desk with accent ring */}
      {(() => {
        const d = TECH_DESK_LEAD
        const bot = bots.find(b => b.deskCenter.x === d.x && b.deskCenter.y === d.y)
        const active = bot?.mode === 'at_desk' || bot?.mode === 'to_desk'
        return (
          <g key="lead">
            <rect x={d.x - 90} y={d.y - 50} width={180} height={130} rx={10}
              fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth={2} strokeDasharray="6 4" />
            <text x={d.x} y={d.y - 58} textAnchor="middle" fontSize={9} fill="rgba(56,189,248,0.4)" fontWeight={700} letterSpacing={1}>LEAD DEVELOPER</text>
            <Desk cx={d.x} cy={d.y} active={!!active} wide />
          </g>
        )
      })()}
      {/* Back-row developer desks */}
      {TECH_DESKS_BACK.map((d, i) => {
        const bot = bots.find(b => b.deskCenter.x === d.x && b.deskCenter.y === d.y)
        const active = bot?.mode === 'at_desk' || bot?.mode === 'to_desk'
        return <Desk key={i} cx={d.x} cy={d.y} active={!!active} />
      })}
      {/* Connector line: lead desk to back row */}
      <line x1={390} y1={395} x2={390} y2={300} stroke="rgba(56,189,248,0.1)" strokeWidth={1} strokeDasharray="4 4" />

      {/* ── Office desks (CoS + CEO) ─────────────────────── */}
      {/* CoS private office divider */}
      <rect x={1500} y={0} width={900} height={680} fill="none" />
      <rect x={1840} y={50} width={2} height={580} fill="rgba(251,191,36,0.15)" />
      {/* CoS zone label */}
      <text x={1670} y={620} textAnchor="middle" fontSize={10} fill="rgba(251,191,36,0.35)" fontWeight={600} letterSpacing={1}>CHIEF OF STAFF</text>
      {/* CEO zone label */}
      <text x={2090} y={620} textAnchor="middle" fontSize={10} fill="rgba(251,191,36,0.35)" fontWeight={600} letterSpacing={1}>FOUNDER & CEO</text>
      {OFFICE_DESKS.map((d, i) => {
        const bot = bots.find(b => b.deskCenter.x === d.x && b.deskCenter.y === d.y)
        const active = bot?.mode === 'at_desk' || bot?.mode === 'to_desk'
        return <Desk key={i} cx={d.x} cy={d.y} active={!!active} wide />
      })}

      {/* Office glow behind desks */}
      <ellipse cx={1840} cy={340} rx={360} ry={260} fill="url(#office-glow)" />

      {/* ── Office furniture ─────────────────────────────── */}
      {/* CoS side: bookshelf on left wall */}
      <g transform="translate(1515, 80)">
        <rect width={22} height={160} rx={3} fill="rgba(30,20,8,0.95)" stroke="rgba(160,110,40,0.3)" strokeWidth={1} />
        {[0,1,2,3,4,5].map(i => (
          <rect key={i} x={3} y={8 + i * 25} width={16} height={15} rx={1}
            fill={['rgba(120,40,30,0.8)','rgba(30,60,120,0.8)','rgba(40,100,50,0.8)','rgba(80,60,20,0.8)','rgba(100,30,80,0.8)','rgba(30,80,100,0.8)'][i]}
            stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        ))}
      </g>

      {/* CEO side: sofa + coffee table */}
      {/* Sofa back */}
      <rect x={1870} y={490} width={350} height={80} rx={14}
        fill="rgba(24,16,8,0.97)" stroke="rgba(160,110,40,0.25)" strokeWidth={1.5} />
      {/* Sofa seat */}
      <rect x={1880} y={542} width={330} height={50} rx={10}
        fill="rgba(32,22,12,0.95)" stroke="rgba(160,110,40,0.2)" strokeWidth={1} />
      {/* Sofa cushions */}
      {[1895, 1975, 2055, 2135].map((x, i) => (
        <rect key={i} x={x} y={548} width={70} height={36} rx={6}
          fill="rgba(42,28,14,0.9)" stroke="rgba(200,150,50,0.12)" strokeWidth={0.5} />
      ))}
      {/* Sofa legs */}
      {[1882, 2192].map((x, i) => (
        <rect key={i} x={x} y={588} width={8} height={14} rx={2} fill="rgba(15,8,2,0.9)" />
      ))}
      {/* Coffee table */}
      <ellipse cx={2045} cy={462} rx={90} ry={50} fill="rgba(22,14,6,0.96)" stroke="rgba(160,110,40,0.3)" strokeWidth={1.2} />
      <ellipse cx={2045} cy={462} rx={75} ry={38} fill="none" stroke="rgba(160,110,40,0.1)" strokeWidth={0.8} />
      {/* Table items */}
      <circle cx={2030} cy={456} r={9} fill="rgba(60,35,15,0.8)" />
      <circle cx={2030} cy={456} r={5} fill="rgba(200,150,50,0.3)" />
      <rect x={2048} y={450} width={22} height={18} rx={2} fill="rgba(240,240,220,0.07)" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
      {/* Coffee table legs */}
      {[[-60,30],[-60,-30],[60,30],[60,-30]].map(([dx, dy], i) => (
        <rect key={i} x={2045 + dx - 3} y={462 + dy} width={6} height={16} rx={2} fill="rgba(15,8,2,0.85)" />
      ))}
      {/* Plant in CEO corner */}
      <g transform="translate(2370, 55)">
        <circle cx={0} cy={8}  r={20} fill="#14532d" opacity={0.95} />
        <circle cx={-8} cy={2} r={15} fill="#166534" />
        <circle cx={8}  cy={0} r={16} fill="#15803d" />
        <circle cx={0} cy={-7} r={13} fill="#16a34a" />
        <rect x={-5} y={16} width={10} height={14} rx={3} fill="#78350f" />
      </g>
      {/* Plant in CoS corner */}
      <g transform="translate(1512, 600)">
        <circle cx={0} cy={6}  r={14} fill="#14532d" opacity={0.9} />
        <circle cx={-6} cy={1} r={10} fill="#166534" />
        <circle cx={6}  cy={0} r={11} fill="#16a34a" />
        <rect x={-4} y={12} width={8} height={10} rx={2} fill="#78350f" />
      </g>

      {/* ── Open office desks ────────────────────────────── */}
      {OPEN_DESKS.map((d, i) => {
        const bot = bots.find(b => b.deskCenter.x === d.x && b.deskCenter.y === d.y)
        const active = bot?.mode === 'at_desk' || bot?.mode === 'to_desk'
        return <Desk key={i} cx={d.x} cy={d.y} active={!!active} />
      })}

      {/* ── Meeting room ─────────────────────────────────── */}
      {/* Carpet */}
      <ellipse cx={MTG.cx} cy={MTG.cy} rx={MTG.rx * 1.5} ry={MTG.ry * 1.6} fill="url(#mtg-carpet)" />
      {/* Table shadow */}
      <ellipse cx={MTG.cx + 5} cy={MTG.cy + 8} rx={MTG.rx} ry={MTG.ry} fill="rgba(0,0,0,0.45)" />
      {/* Table */}
      <ellipse cx={MTG.cx} cy={MTG.cy} rx={MTG.rx} ry={MTG.ry}
        fill="rgba(14,20,50,0.97)" stroke="rgba(99,102,241,0.55)" strokeWidth={2.5} />
      <ellipse cx={MTG.cx} cy={MTG.cy} rx={MTG.rx * 0.85} ry={MTG.ry * 0.82}
        fill="none" stroke="rgba(99,102,241,0.18)" strokeWidth={1} />
      <ellipse cx={MTG.cx - MTG.rx * 0.22} cy={MTG.cy - MTG.ry * 0.3}
        rx={MTG.rx * 0.45} ry={MTG.ry * 0.32} fill="rgba(255,255,255,0.025)" />
      <circle cx={MTG.cx} cy={MTG.cy} r={24} fill="rgba(99,102,241,0.1)" stroke="rgba(99,102,241,0.28)" strokeWidth={1} />
      <text x={MTG.cx} y={MTG.cy + 6} textAnchor="middle" fontSize={18} fill="rgba(99,102,241,0.45)">◈</text>
      {/* Chairs around table */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2 - Math.PI / 2
        const cx = MTG.cx + MTG.rx * 1.15 * Math.cos(angle)
        const cy = MTG.cy + MTG.ry * 1.18 * Math.sin(angle)
        return (
          <g key={i} transform={`translate(${cx},${cy}) rotate(${(angle * 180) / Math.PI + 90})`}>
            <rect x={-12} y={-8} width={24} height={18} rx={4} fill="rgba(30,30,55,0.92)" stroke="rgba(99,102,241,0.2)" strokeWidth={0.8} />
            <rect x={-12} y={-16} width={24} height={10} rx={3} fill="rgba(25,25,48,0.9)" />
          </g>
        )
      })}
      {/* Laptops on table */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
        const cx = MTG.cx + MTG.rx * 0.54 * Math.cos(angle)
        const cy = MTG.cy + MTG.ry * 0.54 * Math.sin(angle)
        return (
          <rect key={i} x={cx - 9} y={cy - 6} width={18} height={12} rx={2}
            fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
        )
      })}

      {/* ── Kitchen / Break Room ─────────────────────────── */}
      {/* Water cooler */}
      <g transform={`translate(${COOLER_POS.x}, ${COOLER_POS.y})`}>
        <rect x={-14} y={-28} width={28} height={48} rx={8} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
        <rect x={-10} y={-26} width={20} height={22} rx={4} fill="#1d4ed8" opacity={0.7} />
        <circle cx={0} cy={-31} r={11} fill="#2563eb" />
        <circle cx={0} cy={-31} r={7} fill="#60a5fa" opacity={0.7} />
        <circle cx={-2} cy={-33} r={2.5} fill="rgba(255,255,255,0.5)" />
        <rect x={-5} y={14} width={10} height={5} rx={2} fill="#1e40af" />
        <rect x={-1.5} y={18} width={3} height={5} fill="#3b82f6" />
        <text x={0} y={28} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.4)" fontWeight={700}>H₂O</text>
      </g>
      {/* Break table */}
      <g>
        <ellipse cx={350} cy={1150} rx={75} ry={55} fill="rgba(22,14,6,0.97)" stroke="rgba(120,80,30,0.3)" strokeWidth={1.5} />
        <ellipse cx={350} cy={1150} rx={60} ry={42} fill="none" stroke="rgba(120,80,30,0.1)" strokeWidth={1} />
        {[0,1,2,3].map(i => {
          const a = (i / 4) * Math.PI * 2
          const cx = 350 + 95 * Math.cos(a), cy = 1150 + 72 * Math.sin(a)
          return <ellipse key={i} cx={cx} cy={cy} rx={18} ry={14} fill="rgba(24,24,44,0.95)" stroke="rgba(80,80,130,0.3)" strokeWidth={0.8} />
        })}
        {/* Coffee cups */}
        <circle cx={340} cy={1143} r={7} fill="rgba(80,50,20,0.8)" />
        <circle cx={360} cy={1157} r={7} fill="rgba(80,50,20,0.8)" />
      </g>
      {/* Plants in corners */}
      {[
        [55, 745], [555, 745], [55, 1590], [555, 1590],
        [2360, 745], [2360, 1590],
      ].map(([px, py], i) => (
        <g key={i} transform={`translate(${px},${py})`}>
          <circle cx={0} cy={8}  r={17} fill="#14532d" opacity={0.95} />
          <circle cx={-7} cy={2} r={12} fill="#166534" />
          <circle cx={7}  cy={0} r={14} fill="#15803d" />
          <circle cx={0} cy={-6} r={11} fill="#16a34a" />
          <circle cx={-3} cy={4} r={8} fill="#22c55e" opacity={0.55} />
          <rect x={-4} y={14} width={8} height={11} rx={2} fill="#78350f" />
          <rect x={-6} y={13} width={12} height={4} rx={2} fill="#92400e" />
        </g>
      ))}
    </>
  )
}

// ── Agent sprite ──────────────────────────────────────────────────────────
function AgentSprite({ bot }: { bot: Bot }) {
  const moving = dist(bot.pos, bot.target) > 3 && bot.mode !== 'at_desk' && bot.mode !== 'at_meeting' && bot.mode !== 'at_cooler'
  const leg = moving ? Math.sin(bot.walkPhase * Math.PI * 2) * 14 : 0
  const isWorking = bot.mode === 'at_desk'   || bot.mode === 'to_desk'
  const isMeeting = bot.mode === 'at_meeting' || bot.mode === 'to_meeting'
  const isCooler  = bot.mode === 'at_cooler'  || bot.mode === 'to_cooler'
  const bs = 12
  const dotColor  = isWorking ? '#3b82f6' : isMeeting ? '#f59e0b' : isCooler ? '#06b6d4' : '#6b7280'
  const eyeColor  = isWorking ? '#60a5fa' : isMeeting ? '#fbbf24' : '#e2e8f0'
  const glowColor = isWorking ? `${bot.color}55` : isMeeting ? '#f59e0b33' : 'none'

  return (
    <g transform={`translate(${bot.pos.x},${bot.pos.y})`} style={{ pointerEvents: 'none' }}>
      <ellipse cx={0} cy={bs + 10} rx={bs * 0.9} ry={4.5} fill="rgba(0,0,0,0.35)" />
      <g transform={`scale(${bot.facing},1)`}>
        {glowColor !== 'none' && (
          <ellipse cx={0} cy={0} rx={bs + 5} ry={bs + 9} fill={glowColor} style={{ filter: 'blur(7px)' }} />
        )}
        <rect x={-bs} y={-(bs + 5)} width={bs * 2} height={bs * 2.5} rx={bs * 0.72} fill={bot.color} />
        <rect x={-bs * 0.55} y={-(bs + 3)} width={bs} height={bs * 0.72} rx={bs * 0.4} fill="rgba(255,255,255,0.17)" />
        <circle cx={-bs * 0.35} cy={-bs * 0.2} r={bs * 0.29} fill="rgba(0,0,0,0.55)" />
        <circle cx={ bs * 0.35} cy={-bs * 0.2} r={bs * 0.29} fill="rgba(0,0,0,0.55)" />
        <circle cx={-bs * 0.35} cy={-bs * 0.2} r={bs * 0.17} fill={eyeColor} />
        <circle cx={ bs * 0.35} cy={-bs * 0.2} r={bs * 0.17} fill={eyeColor} />
        <circle cx={-bs * 0.28} cy={-bs * 0.29} r={bs * 0.07} fill="rgba(255,255,255,0.88)" />
        <circle cx={ bs * 0.42} cy={-bs * 0.29} r={bs * 0.07} fill="rgba(255,255,255,0.88)" />
        <rect x={-bs * 0.4} y={bs * 0.18} width={bs * 0.8} height={bs * 0.55} rx={3}
          fill={isWorking ? 'rgba(96,165,250,0.45)' : isMeeting ? 'rgba(251,191,36,0.28)' : 'rgba(255,255,255,0.08)'}
          stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} />
      </g>
      <rect x={-bs * 0.72} y={bs + 2} width={bs * 0.65} height={bs * 0.42} rx={bs * 0.25}
        fill={`color-mix(in srgb, ${bot.color} 60%, #000)`}
        transform={`rotate(${leg},${-bs * 0.35},${bs + 2})`} />
      <rect x={ bs * 0.07} y={bs + 2} width={bs * 0.65} height={bs * 0.42} rx={bs * 0.25}
        fill={`color-mix(in srgb, ${bot.color} 60%, #000)`}
        transform={`rotate(${-leg},${bs * 0.35},${bs + 2})`} />
      <circle cx={bs * 0.92} cy={-(bs + 7)} r={4.5} fill={dotColor} stroke="rgba(0,0,0,0.7)" strokeWidth={1.2} />
      {isWorking && (
        <g transform={`translate(-32,${-(bs + 28)})`}>
          <rect width={64} height={16} rx={4} fill="rgba(15,28,70,0.94)" stroke="rgba(96,165,250,0.45)" strokeWidth={1} />
          <text x={32} y={11} textAnchor="middle" fontSize={8} fill="#93c5fd" fontWeight={700}>⌨ Working</text>
        </g>
      )}
      {isMeeting && (
        <g transform={`translate(-32,${-(bs + 28)})`}>
          <rect width={64} height={16} rx={4} fill="rgba(70,28,6,0.94)" stroke="rgba(245,158,11,0.45)" strokeWidth={1} />
          <text x={32} y={11} textAnchor="middle" fontSize={8} fill="#fcd34d" fontWeight={700}>💬 Meeting</text>
        </g>
      )}
      {isCooler && (
        <g transform={`translate(-32,${-(bs + 28)})`}>
          <rect width={64} height={16} rx={4} fill="rgba(7,30,55,0.94)" stroke="rgba(6,182,212,0.45)" strokeWidth={1} />
          <text x={32} y={11} textAnchor="middle" fontSize={8} fill="#67e8f9" fontWeight={700}>💧 Break</text>
        </g>
      )}
      <foreignObject x={-34} y={bs + 10} width={68} height={15}>
        <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
          background: 'rgba(0,0,0,0.7)', borderRadius: 3, padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {bot.name}
        </div>
      </foreignObject>
    </g>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
const RUN_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  succeeded: 'success', failed: 'destructive', running: 'warning', queued: 'secondary',
}

export default function OfficePage() {
  const qc = useQueryClient()
  const [bots, setBots] = useState<Bot[]>([])
  const [transform, setTransform] = useState({ x: 10, y: 10, scale: 0.62 })
  const dragging = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Release drag if mouse goes up anywhere (prevents stuck drag causing nav issues)
  useEffect(() => {
    const up = () => { dragging.current = null }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const { data: agents = [] } = useQuery({
    queryKey: ['agents', company?.id],
    queryFn: () => api.agents.list(company?.id),
    enabled: !!company?.id,
  })
  const { data: runs = [] } = useQuery({
    queryKey: ['heartbeats'],
    queryFn: () => api.heartbeats.list(),
    refetchInterval: 5000,
  })

  useEffect(() => useSSE(ev => {
    if (['heartbeat_start', 'heartbeat_finish'].includes(ev.type)) {
      qc.invalidateQueries({ queryKey: ['heartbeats'] })
      qc.invalidateQueries({ queryKey: ['agents'] })
    }
  }), [qc])

  // Init bots
  useEffect(() => {
    const active = (agents as any[]).filter((a: any) => a.status !== 'terminated')
    setBots(prev => {
      let techBackIdx = 0, openIdx = 0
      return active.map((a: any, i: number) => {
        const ex = prev.find(b => b.id === a.id)
        const homeZone = roleToZone(a.role)
        const r = (a.role ?? '').toLowerCase()
        let deskCenter: Vec
        if (homeZone === 'tech') {
          if (r.includes('lead')) deskCenter = TECH_DESK_LEAD
          else deskCenter = TECH_DESKS_BACK[techBackIdx++ % TECH_DESKS_BACK.length]
        } else if (homeZone === 'office') {
          deskCenter = r.includes('chief') ? OFFICE_DESK_COS : OFFICE_DESK_CEO
        } else {
          deskCenter = OPEN_DESKS[openIdx++ % OPEN_DESKS.length]
        }
        const seatPos = deskSeatPx(deskCenter)
        if (ex) return { ...ex, status: a.status, deskCenter, seatPos, homeZone }
        const zone = ZONES[homeZone]
        const startPos = randInZone(zone)
        return {
          id: a.id, name: a.name, role: a.role, status: a.status,
          color: AGENT_COLORS[i % AGENT_COLORS.length],
          homeZone, deskCenter, seatPos,
          pos: { ...startPos }, target: { ...startPos },
          facing: 1 as const, mode: 'wander' as WalkMode,
          walkPhase: Math.random() * Math.PI * 2, idleTimer: Math.floor(Math.random() * 80),
        }
      })
    })
  }, [agents])

  // Push running agents to desk
  const runningIds = (runs as any[]).filter((r: any) => r.status === 'running').map((r: any) => r.agentId).join(',')
  useEffect(() => {
    setBots(prev => prev.map(bot => {
      if (!runningIds.split(',').filter(Boolean).includes(bot.id)) return bot
      if (bot.mode === 'at_desk' || bot.mode === 'to_desk') return bot
      return { ...bot, mode: 'to_desk', target: bot.seatPos }
    }))
  }, [runningIds])

  // Game loop
  useEffect(() => {
    const id = setInterval(() => {
      setBots(prev => prev.map(bot => {
        const dx = bot.target.x - bot.pos.x, dy = bot.target.y - bot.pos.y
        const d = Math.hypot(dx, dy)
        let { pos, target, facing, mode, walkPhase, idleTimer } = bot
        if (d > 2) {
          const s = Math.min(SPEED, d)
          pos = { x: pos.x + (dx / d) * s, y: pos.y + (dy / d) * s }
          facing = dx > 0 ? 1 : -1
          walkPhase = (walkPhase + 0.07) % (Math.PI * 2)
        } else { walkPhase = 0 }
        idleTimer--
        if (d < 3) {
          if (mode === 'to_desk')    mode = 'at_desk'
          else if (mode === 'to_meeting') mode = 'at_meeting'
          else if (mode === 'to_cooler') mode = 'at_cooler'
          else if ((mode === 'wander' || mode === 'at_cooler') && idleTimer <= 0) {
            const zone = ZONES[bot.homeZone] ?? ZONES.open
            target = randInZone(zone)
            mode = 'wander'
            idleTimer = 60 + Math.floor(Math.random() * 120)
          }
        }
        return { ...bot, pos, target, facing: facing as 1 | -1, mode, walkPhase, idleTimer }
      }))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Pan/zoom handlers
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(t => ({ ...t, scale: Math.min(2.5, Math.max(0.2, t.scale * delta)) }))
  }, [])
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    dragging.current = { startX: e.clientX, startY: e.clientY, ox: transform.x, oy: transform.y }
  }, [transform])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    e.preventDefault()
    setTransform(t => ({ ...t, x: dragging.current!.ox + e.clientX - dragging.current!.startX, y: dragging.current!.oy + e.clientY - dragging.current!.startY }))
  }, [])
  const onMouseUp = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    dragging.current = null
  }, [])

  // Demo controls
  const allToDesk    = () => setBots(prev => prev.map(bot => ({ ...bot, mode: 'to_desk', target: bot.seatPos })))
  const allToMeeting = () => setBots(prev => prev.map((bot, i) => ({ ...bot, mode: 'to_meeting', target: meetingSeatPx(i, prev.length) })))
  const allWander    = () => setBots(prev => prev.map(bot => {
    const zone = ZONES[bot.homeZone] ?? ZONES.open
    return { ...bot, mode: 'wander', target: randInZone(zone), idleTimer: 60 }
  }))
  const allCooler    = () => setBots(prev => prev.map(bot => ({
    ...bot, mode: 'to_cooler',
    target: { x: COOLER_POS.x + 80 + Math.random() * 100, y: COOLER_POS.y + (Math.random() - 0.5) * 60 },
  })))

  const agentMap = Object.fromEntries((agents as any[]).map((a: any) => [a.id, a]))
  const recentRuns = (runs as any[]).slice(0, 12)
  const STATUS_META = [
    { label: 'Working', color: '#3b82f6' }, { label: 'Meeting', color: '#f59e0b' },
    { label: 'Break',   color: '#06b6d4' }, { label: 'Idle',    color: '#6b7280' },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-2.5 border-b border-border flex items-center justify-between bg-card/20">
        <div>
          <h1 className="text-base font-bold text-foreground">The Office</h1>
          <p className="text-xs text-muted-foreground">AI team headquarters — live view</p>
        </div>
        <div className="flex items-center gap-4">
          {STATUS_META.map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="size-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 5px ${s.color}` }} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-4 py-1.5 border-b border-border bg-card/10 flex items-center gap-2">
        <span className="text-xs text-muted-foreground/60 mr-1">Demo</span>
        <button onClick={allWander} className="px-2.5 py-1 rounded-lg text-xs bg-secondary/70 hover:bg-secondary text-foreground transition-colors">Wander</button>
        <div className="flex items-center gap-0.5 bg-secondary/30 rounded-xl p-0.5 ml-1">
          <button onClick={allToDesk}    className="px-2.5 py-1 rounded-lg text-xs hover:bg-blue-500/20 text-blue-400 transition-colors">All Working</button>
          <button onClick={allToMeeting} className="px-2.5 py-1 rounded-lg text-xs hover:bg-amber-500/20 text-amber-400 transition-colors">Run Meeting</button>
          <button onClick={allCooler}    className="px-2.5 py-1 rounded-lg text-xs hover:bg-cyan-500/20 text-cyan-400 transition-colors">Break Room</button>
        </div>
        {/* Zoom controls */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setTransform(t => ({ ...t, scale: Math.min(2, t.scale * 1.2) }))} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><ZoomIn size={14} /></button>
          <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(0.15, t.scale / 1.2) }))} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><ZoomOut size={14} /></button>
          <button onClick={() => setTransform({ x: 10, y: 10, scale: 0.62 })} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Maximize2 size={14} /></button>
          <span className="text-xs text-muted-foreground ml-1">{Math.round(transform.scale * 100)}%</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div
          className="flex-1 overflow-hidden bg-[oklch(0.08_0.01_255)] cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={e => e.stopPropagation()}
          onDragStart={e => e.preventDefault()}
          draggable={false}
          style={{ userSelect: 'none', touchAction: 'none' }}
        >
          <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }}>
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
              <OfficeSVGContent bots={bots} />
              {[...bots].sort((a, b) => a.pos.y - b.pos.y).map(bot => (
                <AgentSprite key={bot.id} bot={bot} />
              ))}
            </g>
          </svg>
        </div>

        {/* Right panel */}
        <div className="w-64 flex-shrink-0 border-l border-border flex flex-col bg-card/30">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Status</p>
          </div>

          {/* Agent list */}
          <div className="overflow-y-auto flex-1">
            <div className="p-2 space-y-0.5 border-b border-border">
              {bots.map(bot => {
                const isWorking = bot.mode === 'at_desk'    || bot.mode === 'to_desk'
                const isMeeting = bot.mode === 'at_meeting' || bot.mode === 'to_meeting'
                const isCooler  = bot.mode === 'at_cooler'  || bot.mode === 'to_cooler'
                const dotColor  = isWorking ? '#3b82f6' : isMeeting ? '#f59e0b' : isCooler ? '#06b6d4' : '#6b7280'
                const label     = isWorking ? 'Working' : isMeeting ? 'In meeting' : isCooler ? 'At break' : 'Idle'
                return (
                  <div key={bot.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/25 transition-colors">
                    <div className="size-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: `${bot.color}25`, border: `1.5px solid ${bot.color}55`, color: bot.color }}>
                      {bot.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{bot.name}</p>
                      <div className="flex items-center gap-1">
                        <div className="size-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 4px ${dotColor}` }} />
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: `${bot.color}22`, color: bot.color }}>
                      {bot.homeZone === 'tech' ? 'Tech' : bot.homeZone === 'office' ? 'HQ' : 'Open'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Activity */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-1.5">
                <Activity size={11} className="text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</p>
              </div>
              <span className="text-[10px] text-muted-foreground">Recent</span>
            </div>
            <div className="p-2 space-y-0.5">
              {recentRuns.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">No recent runs</p>
                </div>
              ) : recentRuns.map((run: any) => {
                const agent = agentMap[run.agentId]
                return (
                  <div key={run.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/25 transition-colors">
                    <span className="text-xs flex-shrink-0">{agent?.icon ?? '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-medium text-foreground truncate">{agent?.name ?? '—'}</p>
                        <Badge variant={RUN_BADGE[run.status] ?? 'secondary'} className="text-[9px] px-1 py-0 flex-shrink-0">{run.status}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(run.startedAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
