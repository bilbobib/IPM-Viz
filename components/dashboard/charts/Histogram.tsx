'use client'
import { useMemo } from 'react'
import { extent, fmt, quantile, sortedAsc } from '@/lib/stats'

export function Histogram({ values, marker, unit = '', bins = 26, label }: { values: number[]; marker: number; unit?: string; bins?: number; label: string }) {
  const h = useMemo(() => {
    const [lo, hi] = extent(values)
    const w = (hi - lo) / bins || 1
    const counts = new Array(bins).fill(0)
    values.forEach((v) => { counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++ })
    const s = sortedAsc(values)
    return { lo, hi, w, counts, max: Math.max(...counts), q1: quantile(s, 0.25), med: quantile(s, 0.5), q3: quantile(s, 0.75) }
  }, [values, bins])
  const pos = (v: number) => ((v - h.lo) / (h.hi - h.lo || 1)) * 100
  const mi = Math.min(bins - 1, Math.max(0, Math.floor((marker - h.lo) / h.w)))
  return (
    <>
      <div className="bar-distribution" role="img" aria-label={`Distribusi ${label}`}>
        {h.counts.map((c, i) => (
          <i key={i} className={i === mi ? 'hl' : ''} style={{ height: `${Math.max(2, (c / h.max) * 100)}%` }}
            title={`${fmt(h.lo + i * h.w)}–${fmt(h.lo + (i + 1) * h.w)}${unit}: ${c} wilayah`} />
        ))}
        <span className="marker marker-med" style={{ left: `${pos(h.med)}%` }}><em>median {fmt(h.med)}</em></span>
        <span className="marker marker-sel" style={{ left: `${pos(marker)}%` }}><em>terpilih {fmt(marker)}</em></span>
      </div>
      <div className="axis"><span>Min {fmt(h.lo)}</span><span>Q1 {fmt(h.q1)}</span><span>Median {fmt(h.med)}</span><span>Q3 {fmt(h.q3)}</span><span>Max {fmt(h.hi)}</span></div>
    </>
  )
}
