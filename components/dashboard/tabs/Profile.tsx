'use client'
import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useDash } from '@/lib/dashboard-context'
import { INDICATORS, indLabel, indUnit, type NumKey, type Region } from '@/lib/types'
import { extent, fmt, fmtFixed, median, quantile, sortedAsc, std } from '@/lib/stats'
import { Field, ProvinceSelect, RegionSearch, Section, Segmented } from '../ui'
import { Sunburst, Treemap, buildTree, findNode, type HNode } from '../charts/Hierarchy'

const CMP: NumKey[] = ['ipm', 'uhh', 'hls', 'rls', 'pengeluaran_ribu_rp', 'p0', 'tpt', 'tpak_l', 'tpak_p']

export function twinSearch(regions: Region[], ref: Region, tol: number, sort: 'pca' | 'ipm') {
  const s1 = std(regions.map((r) => r.PC1)) || 1, s2 = std(regions.map((r) => r.PC2)) || 1
  const c = regions.filter((r) => r.id !== ref.id && Math.abs(r.ipm - ref.ipm) <= tol).map((r) => ({
    r, dist: Math.sqrt(((r.PC1 - ref.PC1) / s1) ** 2 + ((r.PC2 - ref.PC2) / s2) ** 2), diff: Math.abs(r.ipm - ref.ipm),
  }))
  const ds = sortedAsc(c.map((x) => x.dist))
  const p75 = quantile(ds, 0.75), p90 = quantile(ds, 0.9)
  const out = c.map((x) => ({ ...x, label: x.dist >= p90 ? 'Kontras sangat tinggi' : x.dist >= p75 ? 'Kontras tinggi' : 'Profil cenderung serupa', tone: x.dist >= p90 ? 'high' : x.dist >= p75 ? 'med' : 'low' }))
  return out.sort((a, b) => (sort === 'pca' ? b.dist - a.dist : a.diff - b.diff))
}

export default function Profile() {
  const { data, selected, comparison, setComparison, select, ranks, province } = useDash()
  const regions = data.regions
  const med = useMemo(() => Object.fromEntries(CMP.map((k) => [k, median(regions.map((r) => r[k]))])) as Record<NumKey, number>, [regions])
  const maxv = useMemo(() => Object.fromEntries(CMP.map((k) => [k, Math.max(...regions.map((r) => r[k]))])) as Record<NumKey, number>, [regions])

  const [tol, setTol] = useState(0.5)
  const [tsort, setTsort] = useState<'pca' | 'ipm'>('pca')
  const twins = useMemo(() => twinSearch(regions, selected, tol, tsort), [regions, selected, tol, tsort])

  const [pvKey, setPvKey] = useState<NumKey>('ipm')
  const provRegions = useMemo(() => regions.filter((r) => r.provinsi === selected.provinsi).sort((a, b) => b[pvKey] - a[pvKey]), [regions, selected.provinsi, pvKey])
  const [pmin, pmax] = extent(provRegions.map((r) => r[pvKey]))
  const natMax = Math.max(...regions.map((r) => r[pvKey]))

  // hierarki
  const root = useMemo(() => buildTree(regions), [regions])
  const [path, setPath] = useState<string[]>([])
  const [chart, setChart] = useState<'tree' | 'sun'>('tree')
  const [scope, setScope] = useState<'nasional' | 'fokus'>('nasional')
  const node = useMemo(() => findNode(root, path), [root, path])
  const [hlo, hhi] = useMemo(() => { const v = regions.map((r) => r.ipm); return [quantile(sortedAsc(v), 0.02), quantile(sortedAsc(v), 0.98)] }, [regions])
  const drill = (n: HNode) => {
    if (n.region) { select(n.region.id); return }
    setPath(n.key.split('/').filter(Boolean).length ? (n.depth === 1 ? [n.name] : [n.key.split('/')[0], n.name]) : [])
  }
  const up = () => setPath((p) => p.slice(0, -1))
  const setScopeTo = (s: 'nasional' | 'fokus') => {
    setScope(s)
    if (s === 'nasional') return setPath([])
    const p = province || selected.provinsi
    const any = regions.find((r) => r.provinsi === p)
    if (any) setPath([any.pulau, p])
  }
  const rk = ranks.get(selected.id)!
  const pctl = (k: NumKey) => (regions.filter((r) => r[k] <= selected[k]).length / regions.length) * 100
  const strong = [...CMP].filter((k) => k !== 'ipm').map((k) => ({ k, z: (selected[k] - med[k]) / (std(regions.map((r) => r[k])) || 1) * (k === 'p0' || k === 'tpt' ? -1 : 1) })).sort((a, b) => b.z - a.z)

  return (
    <>
      <Section eyebrow="01 / PROFIL WILAYAH" title={`Profil pembangunan ${selected.kab_kota}.`} desc="Bandingkan wilayah terpilih dengan satu wilayah lain dan dengan median nasional.">
        <div className="profile-wide card">
          <div className="map-toolbar">
            <div className="field"><span>Wilayah utama</span><RegionSearch /></div>
            <ProvinceSelect />
            <div className="field"><span>Pembanding (opsional)</span><RegionSearch target="comparison" /></div>
            {comparison && <button type="button" className="link-btn" onClick={() => setComparison(null)}>Hapus pembanding</button>}
          </div>
          <div className="chart-pad">
            <p className="narr"><b>{selected.kab_kota}</b> ({selected.provinsi}) berada di peringkat <b>{rk}</b> dari {regions.length} berdasarkan IPM {fmt(selected.ipm)}. Terkuat relatif terhadap median: <b>{indLabel(strong[0].k)}</b>; paling tertinggal: <b>{indLabel(strong[strong.length - 1].k)}</b> (kemiskinan dan TPT dibaca terbalik).</p>
            <div className="legend-row"><span><i style={{ background: '#2f9a88' }} />{selected.kab_kota}</span>{comparison && <span><i style={{ background: '#766497' }} />{comparison.kab_kota}</span>}<span><i style={{ background: '#6e7d7a' }} />Median nasional</span></div>
            {CMP.map((k) => (
              <div className="compare-line" key={k}>
                <span>{indLabel(k)}<small>persentil {fmt(pctl(k), 0)}</small></span>
                <i className="compare-track">
                  <b style={{ width: `${(selected[k] / maxv[k]) * 100}%` }} />
                  {comparison && <s style={{ width: `${(comparison[k] / maxv[k]) * 100}%` }} />}
                  <em style={{ left: `${(med[k] / maxv[k]) * 100}%` }} />
                </i>
                <strong>{fmt(selected[k])}{indUnit(k) === '%' ? '%' : ''}{comparison ? <small> vs {fmt(comparison[k])}</small> : null}</strong>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="02 / TWIN FINDER" title="IPM kembar, wajah berbeda." desc="Mencari wilayah dengan IPM nyaris sama (±toleransi) lalu mengurutkan menurut jarak standar di ruang PC1–PC2. Bersifat eksploratif.">
        <div className="card">
          <div className="map-toolbar">
            <div className="field"><span>Wilayah acuan</span><RegionSearch /></div>
            <Field label={`Toleransi IPM ± ${fmtFixed(tol, 1)}`}><input type="range" min={0.1} max={2} step={0.1} value={tol} onChange={(e) => setTol(Number(e.target.value))} /></Field>
            <Segmented value={tsort} onChange={setTsort} label="Urutkan" options={[['pca', 'Kontras PCA'], ['ipm', 'Selisih IPM']]} />
          </div>
          <div className="chart-pad">
            <p className="annotation">Acuan: <b>{selected.kab_kota}</b> · IPM {fmt(selected.ipm)} · {twins.length} kandidat dalam ±{fmtFixed(tol, 1)}.</p>
            {twins.length === 0 && <p className="muted">Tidak ada kandidat pada toleransi ini — perbesar toleransi.</p>}
            <div className="twin-grid">
              {twins.slice(0, 8).map(({ r, dist, diff, label, tone }) => (
                <div key={r.id} className={`twin-card ${comparison?.id === r.id ? 'on' : ''}`}>
                  <div className="twin-top"><div><strong>{r.kab_kota}</strong><small>{r.provinsi}</small></div><span className="badge">IPM {fmt(r.ipm)}</span></div>
                  <p className={`twin-${tone}`}>{label}</p>
                  <dl><dt>Jarak PCA</dt><dd>{fmtFixed(dist, 2)}</dd><dt>Δ IPM</dt><dd>{fmtFixed(diff, 2)}</dd><dt>Kemiskinan</dt><dd>{fmt(r.p0)}% <small>({fmt(selected.p0)}%)</small></dd><dt>UHH</dt><dd>{fmt(r.uhh)} <small>({fmt(selected.uhh)})</small></dd></dl>
                  <div className="twin-actions"><button type="button" onClick={() => setComparison(r.id)}>Bandingkan</button><button type="button" onClick={() => select(r.id)}>Jadikan acuan <ChevronRight size={12} /></button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="03 / VARIASI DALAM PROVINSI" title={`Variasi kabupaten/kota di ${selected.provinsi}.`} desc="Garis oranye = median nasional; klik baris untuk berpindah wilayah.">
        <div className="card">
          <div className="map-toolbar">
            <Field label="Indikator"><select value={pvKey} onChange={(e) => setPvKey(e.target.value as NumKey)}>{INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.short}</option>)}</select></Field>
            <span className="muted">{provRegions.length} wilayah · rentang {fmt(pmin)}–{fmt(pmax)} (selisih {fmt(pmax - pmin)})</span>
          </div>
          <div className="chart-pad prov-list">
            {provRegions.map((r) => (
              <button type="button" key={r.id} className={`prov-row ${r.id === selected.id ? 'selected' : ''}`} onClick={() => select(r.id)}>
                <span>{r.kab_kota}</span>
                <div className="track"><i style={{ width: `${(r[pvKey] / natMax) * 100}%` }} /><u style={{ left: `${(median(regions.map((q) => q[pvKey])) / natMax) * 100}%` }} /></div>
                <strong>{fmt(r[pvKey])}</strong>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="04 / STRUKTUR WILAYAH" title="Hierarki: Indonesia → pulau → provinsi → kabupaten/kota." desc="Ukuran = jumlah penduduk; warna = IPM (rata-rata tertimbang penduduk pada level agregat). Klik blok untuk drilldown; klik kab/kota untuk memilihnya.">
        <div className="card">
          <div className="map-toolbar">
            <Segmented value={chart} onChange={setChart} label="Diagram" options={[['tree', 'Treemap'], ['sun', 'Sunburst']]} />
            <Segmented value={scope} onChange={setScopeTo} label="Cakupan" options={[['nasional', 'Nasional'], ['fokus', 'Fokus provinsi terpilih']]} />
          </div>
          <div className="chart-pad">
            <nav className="crumbs" aria-label="Breadcrumb">
              <button type="button" onClick={() => setPath([])}>Indonesia</button>
              {path.map((p, i) => <span key={p}><ChevronRight size={12} /><button type="button" onClick={() => setPath(path.slice(0, i + 1))}>{p}</button></span>)}
              {path.length > 0 && <button type="button" className="up" onClick={up}>↩ naik</button>}
            </nav>
            {chart === 'tree'
              ? <Treemap node={node} lo={hlo} hi={hhi} selectedId={selected.id} onDrill={drill} onUp={up} />
              : <Sunburst node={node} lo={hlo} hi={hhi} selectedId={selected.id} onDrill={drill} onUp={up} />}
            <div className="map-footer"><span className="legend"><i className="scale-low" /> IPM rendah <i className="scale-high" /> tinggi ({fmt(hlo)}–{fmt(hhi)})</span><span>{node.children?.length ?? 0} blok pada level ini</span></div>
          </div>
        </div>
      </Section>
    </>
  )
}
