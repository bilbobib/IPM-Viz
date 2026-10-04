'use client'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useDash } from '@/lib/dashboard-context'
import { indLabel, indUnit, type GeoFeat, type NumKey } from '@/lib/types'
import { clamp, fmt, quantile, seq, sortedAsc } from '@/lib/stats'

type View = { k: number; tx: number; ty: number }

export function RegionMap({ indicator, mode }: { indicator: NumKey; mode: 'choropleth' | 'bubble' }) {
  const { data, byId, selected, comparison, select, province } = useDash()
  const vb = data.mapSize
  const wrapRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 })
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  const featById = useMemo(() => new Map<string, GeoFeat>(data.geo.map((g): [string, GeoFeat] => [g.id, g])), [data])

  // domain warna: persentil 2–98 agar outlier tidak meratakan skala
  const { lo, hi } = useMemo(() => {
    const s = sortedAsc(data.regions.map((r) => r[indicator]))
    return { lo: quantile(s, 0.02), hi: quantile(s, 0.98) }
  }, [data, indicator])
  const maxPop = useMemo(() => Math.max(...data.regions.map((r) => r.penduduk)), [data])
  const colorOf = useCallback((id: string) => {
    const r = byId.get(id)
    return r ? seq((r[indicator] - lo) / (hi - lo || 1)) : '#ddd'
  }, [byId, indicator, lo, hi])

  const zoomToBox = useCallback((b: [number, number, number, number] | null) => {
    if (!b) return setView({ k: 1, tx: 0, ty: 0 })
    const bw = Math.max(b[2] - b[0], 20), bh = Math.max(b[3] - b[1], 20)
    const k = clamp(Math.min(vb.w / bw, vb.h / bh) * 0.82, 1, 14)
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2
    setView({ k, tx: vb.x + vb.w / 2 - k * cx, ty: vb.y + vb.h / 2 - k * cy })
  }, [vb])

  // filter provinsi -> zoom ke provinsi (tanpa scroll halaman)
  useEffect(() => {
    if (!province) return zoomToBox(null)
    const ids = new Set(data.regions.filter((r) => r.provinsi === province).map((r) => r.id))
    const bs = data.geo.filter((g) => ids.has(g.id)).map((g) => g.bbox)
    if (!bs.length) return
    zoomToBox([Math.min(...bs.map((b) => b[0])), Math.min(...bs.map((b) => b[1])), Math.max(...bs.map((b) => b[2])), Math.max(...bs.map((b) => b[3]))])
  }, [province, data, zoomToBox])

  const zoomBy = (f: number) => setView((v) => {
    const k = clamp(v.k * f, 1, 14)
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2
    return { k, tx: cx - ((cx - v.tx) / v.k) * k, ty: cy - ((cy - v.ty) / v.k) * k }
  })

  const idAt = (t: EventTarget | null) => (t as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ?? null

  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }
  }
  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const tip = tipRef.current
    if (tip) {
      const left = e.clientX - rect.left + 14
      tip.style.left = (left > rect.width - 230 ? left - 244 : left) + 'px'
      tip.style.top = Math.min(e.clientY - rect.top + 14, rect.height - 90) + 'px'
    }
    const d = drag.current
    if (d && (e.buttons & 1)) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y
      if (d.moved || Math.hypot(dx, dy) > 4) {
        d.moved = true
        const s = Math.min(rect.width / vb.w, rect.height / vb.h)
        setView((v) => ({ ...v, tx: d.tx + dx / s, ty: d.ty + dy / s }))
      }
    }
  }
  const onPointerUp = (e: RPE<HTMLDivElement>) => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) {
      const id = idAt(e.target)
      if (id) select(id)
    }
  }

  const inProv = useCallback((id: string) => !province || byId.get(id)?.provinsi === province, [province, byId])

  const polys = useMemo(() => data.geo.map((g) => (
    <path key={g.id} data-id={g.id} d={g.d} className="rp" fillRule="evenodd"
      fill={mode === 'bubble' ? '#e3ece7' : colorOf(g.id)} opacity={inProv(g.id) ? 1 : 0.22} />
  )), [data.geo, mode, colorOf, inProv])

  const bubbles = useMemo(() => mode !== 'bubble' ? null : data.geo.filter((g) => inProv(g.id)).map((g) => {
    const r = byId.get(g.id)!
    const rad = (2 + 20 * Math.sqrt(r.penduduk / maxPop)) / Math.sqrt(view.k)
    return <circle key={g.id} data-id={g.id} cx={g.cx} cy={g.cy} r={rad} fill={colorOf(g.id)} fillOpacity={0.82} stroke="#fff" strokeWidth={0.6} vectorEffect="non-scaling-stroke" className="bubble" />
  }), [mode, data.geo, byId, maxPop, view.k, colorOf, inProv])

  const hover = hoverId ? byId.get(hoverId) : null
  const unit = indUnit(indicator)

  return (
    <div className="map-canvas" ref={wrapRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onPointerLeave={() => { drag.current = null; setHoverId(null) }}>
      <div className="map-grid" />
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img"
        aria-label={`Peta ${data.geo.length} kabupaten/kota menurut ${indLabel(indicator)}`}
        onPointerOver={(e) => setHoverId(idAt(e.target))}>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          <g>{polys}</g>
          {bubbles}
          {province && <g className="ov">{data.geo.filter((g) => inProv(g.id)).map((g) => <path key={g.id} d={g.d} className="rp-prov" fillRule="evenodd" />)}</g>}
          {comparison && featById.get(comparison.id) && <path d={featById.get(comparison.id)!.d} className="rp-cmp" fillRule="evenodd" />}
          {hoverId && featById.get(hoverId) && <path d={featById.get(hoverId)!.d} className="rp-hover" fillRule="evenodd" />}
          {featById.get(selected.id) && <path d={featById.get(selected.id)!.d} className="rp-sel" fillRule="evenodd" />}
          {featById.get(selected.id) && <circle cx={featById.get(selected.id)!.cx} cy={featById.get(selected.id)!.cy} r={11 / view.k} className="sel-ring" />}
        </g>
      </svg>
      <div className="map-controls">
        <button aria-label="Perbesar" onClick={() => zoomBy(1.6)}><Plus /></button>
        <button aria-label="Perkecil" onClick={() => zoomBy(1 / 1.6)}><Minus /></button>
        <button aria-label="Reset tampilan" onClick={() => { zoomToBox(null) }}><RotateCcw /></button>
      </div>
      <div ref={tipRef} className="map-tip" style={{ display: hover ? 'block' : 'none' }}>
        {hover && <>
          <b>{hover.kab_kota}</b>
          <span>{hover.jenis} · {hover.provinsi}</span>
          <div><em>{indLabel(indicator)}</em><strong>{fmt(hover[indicator])}{unit === '%' ? '%' : unit ? ' ' + unit : ''}</strong></div>
          {indicator !== 'ipm' && <div><em>IPM</em><strong>{fmt(hover.ipm)}</strong></div>}
          <small>Klik untuk memilih</small>
        </>}
      </div>
      <div className="map-scale">
        <span>{fmt(lo)}</span><i className="scale-bar" /><span>{fmt(hi)}{unit === '%' ? '%' : ''}</span>
      </div>
    </div>
  )
}
