'use client'
import { memo, useId, useMemo, useState, type ReactNode } from 'react'
import { extent, fmt, niceTicks, ols } from '@/lib/stats'

export type SPoint = { id: string; x: number; y: number; color: string; label: string; sub: string; dim?: boolean }
type Props = {
  points: SPoint[]
  xLabel: string
  yLabel: string
  selectedId: string
  comparisonId?: string | null
  onSelect: (id: string) => void
  trend?: boolean
  zero?: boolean
  height?: number
  overlay?: (sx: (v: number) => number, sy: (v: number) => number) => ReactNode
}
const W = 760, M = { l: 58, r: 18, t: 16, b: 46 }

export function Scatter({ points, xLabel, yLabel, selectedId, comparisonId, onSelect, trend, zero, height = 460, overlay }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const cid = 'clip' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const H = height
  const sc = useMemo(() => {
    const [x0, x1] = extent(points.map((p) => p.x)), [y0, y1] = extent(points.map((p) => p.y))
    const px = (x1 - x0) * 0.05 || 1, py = (y1 - y0) * 0.05 || 1
    const xa = x0 - px, xb = x1 + px, ya = y0 - py, yb = y1 + py
    const sx = (v: number) => M.l + ((v - xa) / (xb - xa)) * (W - M.l - M.r)
    const sy = (v: number) => H - M.b - ((v - ya) / (yb - ya)) * (H - M.t - M.b)
    return { sx, sy, xa, xb, ya, yb, xt: niceTicks(xa, xb, 6), yt: niceTicks(ya, yb, 6) }
  }, [points, H])
  const dots = useMemo(() => points.map((p) => (
    <circle key={p.id} data-id={p.id} cx={sc.sx(p.x)} cy={sc.sy(p.y)} r={3.6} fill={p.color} fillOpacity={p.dim ? 0.14 : 0.72} stroke="#fff" strokeWidth={0.5} />
  )), [points, sc])
  const line = useMemo(() => {
    if (!trend || points.length < 3) return null
    const f = ols(points.map((p) => p.x), points.map((p) => p.y))
    return { x1: sc.sx(sc.xa), y1: sc.sy(f.intercept + f.slope * sc.xa), x2: sc.sx(sc.xb), y2: sc.sy(f.intercept + f.slope * sc.xb) }
  }, [trend, points, sc])
  const byId = useMemo(() => new Map<string, SPoint>(points.map((p): [string, SPoint] => [p.id, p])), [points])
  const idAt = (t: EventTarget | null) => (t as Element | null)?.getAttribute?.('data-id') ?? null
  const hp = hoverId ? byId.get(hoverId) : null
  const sel = byId.get(selectedId), cmp = comparisonId ? byId.get(comparisonId) : null

  let tip: ReactNode = null
  if (hp) {
    const x = sc.sx(hp.x), y = sc.sy(hp.y)
    const w = 190, left = x > W - w - 30 ? x - w - 10 : x + 12, top = y < 70 ? y + 10 : y - 62
    tip = (
      <g pointerEvents="none">
        <rect x={left} y={top} width={w} height={52} rx={6} fill="#172b2b" opacity={0.94} />
        <text x={left + 10} y={top + 18} fill="#fff" fontSize={12} fontWeight={700}>{hp.label.slice(0, 26)}</text>
        <text x={left + 10} y={top + 32} fill="#b4d0c6" fontSize={10}>{hp.sub}</text>
        <text x={left + 10} y={top + 45} fill="#92d4c1" fontSize={10}>{fmt(hp.x)} · {fmt(hp.y)}</text>
      </g>
    )
  }
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} terhadap ${xLabel}`}
      onPointerOver={(e) => setHoverId(idAt(e.target))} onPointerLeave={() => setHoverId(null)}
      onClick={(e) => { const id = idAt(e.target); if (id) onSelect(id) }}>
      {sc.yt.map((t) => <g key={'y' + t}><line x1={M.l} x2={W - M.r} y1={sc.sy(t)} y2={sc.sy(t)} stroke="#e7efeb" /><text x={M.l - 8} y={sc.sy(t) + 3} textAnchor="end" fontSize={10} fill="#76918a">{fmt(t, 1)}</text></g>)}
      {sc.xt.map((t) => <g key={'x' + t}><line y1={M.t} y2={H - M.b} x1={sc.sx(t)} x2={sc.sx(t)} stroke="#f0f4f1" /><text x={sc.sx(t)} y={H - M.b + 16} textAnchor="middle" fontSize={10} fill="#76918a">{fmt(t, 1)}</text></g>)}
      {zero && sc.xa < 0 && sc.xb > 0 && <line x1={sc.sx(0)} x2={sc.sx(0)} y1={M.t} y2={H - M.b} stroke="#b9c7c1" strokeDasharray="4 3" />}
      {zero && sc.ya < 0 && sc.yb > 0 && <line y1={sc.sy(0)} y2={sc.sy(0)} x1={M.l} x2={W - M.r} stroke="#b9c7c1" strokeDasharray="4 3" />}
      <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill="#3d5651">{xLabel}</text>
      <text transform={`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize={11} fontWeight={600} fill="#3d5651">{yLabel}</text>
      <defs><clipPath id={cid}><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath></defs>
      {line && <line {...line} clipPath={`url(#${cid})`} stroke="#d97b45" strokeWidth={1.6} strokeDasharray="6 4" />}
      <g style={{ cursor: 'pointer' }}>{dots}</g>
      {overlay?.(sc.sx, sc.sy)}
      {cmp && <circle cx={sc.sx(cmp.x)} cy={sc.sy(cmp.y)} r={8} fill="none" stroke="#766497" strokeWidth={2.5} pointerEvents="none" />}
      {sel && <g pointerEvents="none"><circle cx={sc.sx(sel.x)} cy={sc.sy(sel.y)} r={9} fill="#d97945" fillOpacity={0.25} stroke="#d97945" strokeWidth={2.5} /><text x={sc.sx(sel.x) + 12} y={sc.sy(sel.y) - 10} fontSize={11} fontWeight={700} fill="#b4572a" stroke="#fff" strokeWidth={3} paintOrder="stroke">{sel.label}</text></g>}
      {tip}
    </svg>
  )
}
export const MemoScatter = memo(Scatter)
