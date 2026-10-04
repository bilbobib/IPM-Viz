'use client'
import { useMemo } from 'react'
import type { Region } from '@/lib/types'
import { fmt, seq, clamp } from '@/lib/stats'

export type HNode = { key: string; name: string; value: number; ipm: number; children?: HNode[]; region?: Region; depth: number }

export function buildTree(regions: Region[]): HNode {
  const agg = (key: string, name: string, depth: number, children: HNode[]): HNode => {
    const value = children.reduce((s, c) => s + c.value, 0)
    return { key, name, depth, value, ipm: children.reduce((s, c) => s + c.ipm * c.value, 0) / (value || 1), children: children.sort((a, b) => b.value - a.value) }
  }
  const group = <T,>(arr: T[], f: (t: T) => string) => { const m = new Map<string, T[]>(); arr.forEach((a) => { const k = f(a); (m.get(k) ?? m.set(k, []).get(k)!).push(a) }); return m }
  const pulau = Array.from(group(regions, (r) => r.pulau)).map(([p, rs]) =>
    agg(p, p, 1, Array.from(group(rs, (r) => r.provinsi)).map(([pv, rr]) =>
      agg(`${p}/${pv}`, pv, 2, rr.map((r) => ({ key: r.id, name: r.kab_kota, value: r.penduduk, ipm: r.ipm, region: r, depth: 3 }))))))
  return agg('', 'Indonesia', 0, pulau)
}
export const findNode = (root: HNode, path: string[]): HNode => {
  let n = root
  for (const p of path) { const c = n.children?.find((x) => x.name === p); if (!c) break; n = c }
  return n
}

function squarify(vals: number[], x: number, y: number, w: number, h: number) {
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const sizes = vals.map((v) => (v / total) * w * h)
  const out: { x: number; y: number; w: number; h: number }[] = []
  let i = 0
  while (i < sizes.length) {
    const short = Math.min(w, h)
    const worst = (sum: number, mn: number, mx: number) => Math.max((short * short * mx) / (sum * sum), (sum * sum) / (short * short * mn))
    let sum = sizes[i], j = i + 1, best = worst(sum, sizes[i], sizes[i])
    while (j < sizes.length) {
      const ns = sum + sizes[j], nw = worst(ns, sizes[j], sizes[i])
      if (nw > best) break
      sum = ns; best = nw; j++
    }
    if (w >= h) {
      const cw = sum / h; let cy = y
      for (let k = i; k < j; k++) { const ch = sizes[k] / cw; out.push({ x, y: cy, w: cw, h: ch }); cy += ch }
      x += cw; w -= cw
    } else {
      const rh = sum / w; let cx = x
      for (let k = i; k < j; k++) { const cw2 = sizes[k] / rh; out.push({ x: cx, y, w: cw2, h: rh }); cx += cw2 }
      y += rh; h -= rh
    }
    i = j
  }
  return out
}

type Common = { node: HNode; lo: number; hi: number; selectedId: string; onDrill: (n: HNode) => void; onUp: () => void }
const col = (ipm: number, lo: number, hi: number) => seq((ipm - lo) / (hi - lo || 1))
const txtOn = (ipm: number, lo: number, hi: number) => ((ipm - lo) / (hi - lo || 1) > 0.55 ? '#fff' : '#17352f')

export function Treemap({ node, lo, hi, selectedId, onDrill }: Common) {
  const W = 1000, H = 540
  const cells = useMemo(() => {
    const ch = node.children ?? []
    return squarify(ch.map((c) => c.value), 0, 0, W, H).map((r, i) => ({ ...r, n: ch[i] }))
  }, [node])
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Treemap hierarki wilayah">
      {cells.map(({ x, y, w, h, n }) => {
        const sel = n.key === selectedId
        const t = txtOn(n.ipm, lo, hi)
        return (
          <g key={n.key} onClick={() => onDrill(n)} style={{ cursor: 'pointer' }}>
            <title>{`${n.name} · IPM ${fmt(n.ipm)} · penduduk ${fmt(n.value, 0)}${n.children ? ' · klik untuk drilldown' : ''}`}</title>
            <rect x={x + 1} y={y + 1} width={Math.max(0, w - 2)} height={Math.max(0, h - 2)} rx={3} fill={col(n.ipm, lo, hi)} stroke={sel ? '#d97945' : '#fff'} strokeWidth={sel ? 3.5 : 1.2} />
            {w > 64 && h > 30 && <text x={x + 7} y={y + 18} fontSize={clamp(Math.min(w / 9, 14), 9, 14)} fontWeight={700} fill={t}>{n.name.slice(0, Math.floor(w / 7.2))}</text>}
            {w > 64 && h > 46 && <text x={x + 7} y={y + 33} fontSize={10.5} fill={t} opacity={0.85}>IPM {fmt(n.ipm)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

const arc = (r0: number, r1: number, a0: number, a1: number) => {
  const p = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(1)} ${(-r * Math.cos(a)).toFixed(1)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${p(r1, a0)}A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`
}
export function Sunburst({ node, lo, hi, selectedId, onDrill, onUp }: Common) {
  const arcs = useMemo(() => {
    const out: { n: HNode; d: string; ring: number }[] = []
    const total = node.value || 1
    let a = 0
    for (const c of node.children ?? []) {
      const span = (c.value / total) * Math.PI * 2
      out.push({ n: c, d: arc(66, 176, a, a + span - 0.004), ring: 1 })
      let b = a
      for (const g of c.children ?? []) {
        const s2 = (g.value / total) * Math.PI * 2
        if (s2 > 0.0025) out.push({ n: g, d: arc(180, 292, b, b + s2 - 0.002), ring: 2 })
        b += s2
      }
      a += span
    }
    return out
  }, [node])
  return (
    <svg className="chart-svg sun" viewBox="-300 -300 600 600" role="img" aria-label="Sunburst hierarki wilayah">
      {arcs.map(({ n, d, ring }) => (
        <path key={n.key + ring} d={d} fill={col(n.ipm, lo, hi)} stroke={n.key === selectedId ? '#d97945' : '#fff'} strokeWidth={n.key === selectedId ? 3 : 0.8}
          style={{ cursor: 'pointer' }} onClick={() => onDrill(n)}>
          <title>{`${n.name} · IPM ${fmt(n.ipm)} · penduduk ${fmt(n.value, 0)}`}</title>
        </path>
      ))}
      <g onClick={onUp} style={{ cursor: node.depth > 0 ? 'pointer' : 'default' }}>
        <circle r={62} fill="#f1f7f3" stroke="#dce5df" />
        <text y={-4} textAnchor="middle" fontSize={13} fontWeight={800} fill="#144b45">{node.name.slice(0, 16)}</text>
        <text y={13} textAnchor="middle" fontSize={10} fill="#6e7d7a">{node.depth > 0 ? '↩ naik level' : 'IPM ' + fmt(node.ipm)}</text>
      </g>
    </svg>
  )
}
