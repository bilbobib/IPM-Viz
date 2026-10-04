'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { useDash } from '@/lib/dashboard-context'

export function Section({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{desc && <p className="section-desc">{desc}</p>}</div></div>
      {children}
    </section>
  )
}
export function Metric({ label, value, note, icon: Icon, tone = '' }: { label: string; value: string; note?: string; icon: React.ComponentType<{ size?: number }>; tone?: string }) {
  return <div className="metric"><div className={`metric-icon ${tone}`}><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div></div>
}
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="toolbar-group">
      {label && <label>{label}</label>}
      <div className="segmented" role="group" aria-label={label}>
        {options.map(([k, l]) => <button key={k} type="button" className={k === value ? 'active' : ''} aria-pressed={k === value} onClick={() => onChange(k)}>{l}</button>)}
      </div>
    </div>
  )
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}
export function ProvinceSelect() {
  const { provinces, province, setProvince } = useDash()
  return (
    <Field label="Provinsi">
      <select value={province} onChange={(e) => setProvince(e.target.value)}>
        <option value="">Semua provinsi</option>
        {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </Field>
  )
}
/** Pencarian/pilih wilayah (datalist). Mengikuti filter provinsi, menulis ke selectedRegion. */
export function RegionSearch({ target = 'selected' }: { target?: 'selected' | 'comparison' }) {
  const { data, selected, comparison, select, setComparison, province } = useDash()
  const current = target === 'selected' ? selected : comparison
  const label = (r: { kab_kota: string; provinsi: string }) => `${r.kab_kota} — ${r.provinsi}`
  const opts = useMemo(() => data.regions.filter((r) => !province || r.provinsi === province).sort((a, b) => a.kab_kota.localeCompare(b.kab_kota)), [data, province])
  const [text, setText] = useState(current ? label(current) : '')
  useEffect(() => { setText(current ? label(current) : '') }, [current])
  const id = `rs-${target}`
  const commit = (v: string) => {
    setText(v)
    const hit = data.regions.find((r) => label(r) === v)
    if (hit) (target === 'selected' ? select : setComparison)(hit.id)
  }
  return (
    <div className="search-wrap">
      <Search size={15} />
      <input list={id} aria-label={target === 'selected' ? 'Cari wilayah' : 'Cari wilayah pembanding'} placeholder="Cari kabupaten/kota…" value={text}
        onChange={(e) => commit(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
      <datalist id={id}>{opts.map((r) => <option key={r.id} value={label(r)} />)}</datalist>
    </div>
  )
}
