'use client'
import { useMemo } from 'react'
import { PCA_VARS, type Region } from '@/lib/types'
import { extent, fmt, median } from '@/lib/stats'

export function Parallel({ regions, context, selected, comparison, onSelect }: { regions: Region[]; context: Region[]; selected: Region; comparison: Region | null; onSelect: (id: string) => void }) {
  const W = 760, H = 330, L = 40, R = 40, T = 34, B = 26
  const ext = useMemo(() => PCA_VARS.map((v) => extent(regions.map((r) => r[v.key]))), [regions])
  const med = useMemo(() => PCA_VARS.map((v) => median(regions.map((r) => r[v.key]))), [regions])
  const x = (i: number) => L + (i / (PCA_VARS.length - 1)) * (W - L - R)
  const y = (i: number, v: number) => T + (1 - (v - ext[i][0]) / (ext[i][1] - ext[i][0] || 1)) * (H - T - B)
  const pts = (get: (i: number) => number) => PCA_VARS.map((_, i) => `${x(i).toFixed(1)},${y(i, get(i)).toFixed(1)}`).join(' ')
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Koordinat paralel 8 variabel PCA">
      {PCA_VARS.map((v, i) => (
        <g key={v.key}><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="#cfdad4" /><text x={x(i)} y={T - 12} textAnchor="middle" fontSize={10} fontWeight={700} fill="#3d5651">{v.label}</text>
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={8.5} fill="#8aa09a">{fmt(ext[i][0], 1)}–{fmt(ext[i][1], 1)}</text></g>
      ))}
      {context.map((r) => (
        <polyline key={r.id} points={pts((i) => r[PCA_VARS[i].key])} fill="none" stroke="#5aada0" strokeOpacity={0.28} strokeWidth={1} style={{ cursor: 'pointer' }} onClick={() => onSelect(r.id)}><title>{r.kab_kota}</title></polyline>
      ))}
      <polyline points={pts((i) => med[i])} fill="none" stroke="#6e7d7a" strokeWidth={2} strokeDasharray="5 4" />
      {comparison && <polyline points={pts((i) => comparison[PCA_VARS[i].key])} fill="none" stroke="#766497" strokeWidth={2.6} />}
      <polyline points={pts((i) => selected[PCA_VARS[i].key])} fill="none" stroke="#d97945" strokeWidth={3} />
    </svg>
  )
}
