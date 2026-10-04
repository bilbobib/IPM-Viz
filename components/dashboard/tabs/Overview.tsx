'use client'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, BarChart3, Banknote, HeartPulse, GraduationCap, MapPinned, Sparkles, Briefcase, ShieldCheck, ArrowRight } from 'lucide-react'
import { useDash } from '@/lib/dashboard-context'
import { INDICATORS, indLabel, indUnit, type NumKey } from '@/lib/types'
import { extent, fmt, median, quantile, sortedAsc } from '@/lib/stats'
import { Field, Metric, ProvinceSelect, RegionSearch, Section, Segmented } from '../ui'
import { Histogram } from '../charts/Histogram'
import { RegionMap } from '../charts/RegionMap'

export default function Overview({ goProfile }: { goProfile: () => void }) {
  const { data, selected, select, ranks, province } = useDash()
  const regions = data.regions
  const [mapInd, setMapInd] = useState<NumKey>('ipm')
  const [mode, setMode] = useState<'choropleth' | 'bubble'>('choropleth')
  const [distKey, setDistKey] = useState<NumKey>('ipm')
  const [rankMode, setRankMode] = useState<'top' | 'bottom'>('top')
  const [rankKey, setRankKey] = useState<NumKey>('ipm')

  const sorted = useMemo(() => [...regions].sort((a, b) => b.ipm - a.ipm), [regions])
  const med = (k: NumKey) => median(regions.map((r) => r[k]))
  const distVals = useMemo(() => regions.map((r) => r[distKey]), [regions, distKey])
  const [dlo, dhi] = extent(distVals)
  const dq = useMemo(() => { const s = sortedAsc(distVals); return { q1: quantile(s, 0.25), q3: quantile(s, 0.75) } }, [distVals])
  const ranked = useMemo(() => {
    const s = [...regions].sort((a, b) => b[rankKey] - a[rankKey])
    return rankMode === 'top' ? s.slice(0, 10) : s.slice(-10).reverse()
  }, [regions, rankKey, rankMode])
  const rMax = Math.max(...regions.map((r) => r[rankKey]))
  const [ilo, ihi] = extent(regions.map((r) => r.ipm))
  const pct = ((selected.ipm - ilo) / (ihi - ilo)) * 100
  const medPct = ((med('ipm') - ilo) / (ihi - ilo)) * 100
  const inView = province ? regions.filter((r) => r.provinsi === province).length : regions.length
  const u = indUnit(distKey)

  return (
    <>
      <Section eyebrow="01 / INDONESIA DALAM ANGKA" title="Satu negara, rentang yang beragam.">
        <div className="metrics">
          <Metric icon={MapPinned} label="Kabupaten/kota" value={fmt(regions.length, 0)} note="dataset aktual BPS 2025" />
          <Metric icon={ArrowUp} label="IPM tertinggi" value={fmt(sorted[0].ipm)} note={`${sorted[0].kab_kota} · ${sorted[0].provinsi}`} />
          <Metric icon={ArrowDown} tone="orange" label="IPM terendah" value={fmt(sorted[sorted.length - 1].ipm)} note={`${sorted[sorted.length - 1].kab_kota} · ${sorted[sorted.length - 1].provinsi}`} />
          <Metric icon={BarChart3} label="Median IPM" value={fmt(med('ipm'))} note={`selisih maks–min ${fmt(ihi - ilo)} poin`} />
          <Metric icon={Banknote} tone="purple" label="Median kemiskinan" value={`${fmt(med('p0'))}%`} note="persentase penduduk" />
        </div>
      </Section>

      <Section eyebrow="02 / DISTRIBUSI" title="Seberapa lebar jarak antarwilayah?">
        <div className="distribution card">
          <div className="chart-meta">
            <div><strong>Distribusi {indLabel(distKey)} {fmt(regions.length, 0)} kabupaten/kota</strong><span>Dihitung langsung dari master_analytical_final.csv</span></div>
            <Segmented value={distKey} onChange={setDistKey} options={[['ipm', 'IPM'], ['p0', 'Kemiskinan'], ['pengeluaran_ribu_rp', 'Pengeluaran'], ['rls', 'RLS']]} />
          </div>
          <Histogram values={distVals} marker={selected[distKey]} unit={u} label={indLabel(distKey)} />
          <p className="annotation">Rentang <b>{fmt(dlo)}–{fmt(dhi)}{u === '%' ? '%' : ''}</b>; separuh wilayah berada di antara <b>{fmt(dq.q1)}</b> dan <b>{fmt(dq.q3)}</b>. <b>{selected.kab_kota}</b> bernilai <b>{fmt(selected[distKey])}</b> (batang oranye).</p>
        </div>
      </Section>

      <Section eyebrow="03 / PERINGKAT" title="Siapa yang berada di ujung distribusi?">
        <div className="rank-grid card">
          <div className="rank-list">
            <div className="rank-tools">
              <Segmented value={rankMode} onChange={setRankMode} options={[['top', '10 Teratas'], ['bottom', '10 Terbawah']]} />
              <Field label="Indikator"><select value={rankKey} onChange={(e) => setRankKey(e.target.value as NumKey)}>{INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.short}</option>)}</select></Field>
            </div>
            {ranked.map((r, i) => (
              <button type="button" className={`rank-row ${selected.id === r.id ? 'selected' : ''}`} key={r.id} onClick={() => select(r.id)}>
                <b>{String(rankMode === 'top' ? i + 1 : regions.length - 9 + i).padStart(2, '0')}</b>
                <span>{r.kab_kota}<small>{r.provinsi}</small></span>
                <div className="track"><i style={{ width: `${(r[rankKey] / rMax) * 100}%` }} /></div>
                <strong>{fmt(r[rankKey])}</strong>
              </button>
            ))}
          </div>
          <div className="rank-note"><Sparkles /><p>Klik baris untuk memilih wilayah; peta, profil, dan scatter akan ikut berubah.</p><small>Urutan dihitung dari data aktual, bukan nilai contoh.</small></div>
        </div>
      </Section>

      <Section eyebrow="04 / EKSPLORASI SPASIAL" title="Di mana perbedaannya terjadi?">
        <div className="map-layout">
          <div className="map-card card">
            <div className="map-toolbar">
              <Field label="Indikator peta"><select value={mapInd} onChange={(e) => setMapInd(e.target.value as NumKey)}>{INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.short}</option>)}</select></Field>
              <Segmented label="Mode" value={mode} onChange={setMode} options={[['choropleth', 'Poligon'], ['bubble', 'Bubble']]} />
              <ProvinceSelect />
              <RegionSearch />
            </div>
            <RegionMap indicator={mapInd} mode={mode} />
            <div className="map-footer">
              <span className="legend"><i className="scale-low" /> Rendah <i className="scale-high" /> Tinggi · {indLabel(mapInd)}</span>
              <span>{fmt(inView, 0)} wilayah{province ? ` di ${province}` : ''} · seret untuk geser</span>
            </div>
          </div>

          <aside className="profile card">
            <div className="profile-head">
              <div><p className="eyebrow">WILAYAH TERPILIH</p><h3>{selected.kab_kota}</h3><span>{selected.jenis} · {selected.provinsi}</span></div>
              <ShieldCheck />
            </div>
            <div className="profile-score">
              <span>IPM 2025</span><strong>{fmt(selected.ipm)}</strong>
              <small>Peringkat {ranks.get(selected.id)} dari {regions.length} · median nasional {fmt(med('ipm'))}</small>
            </div>
            <div className="profile-grid">
              <Metric icon={HeartPulse} label="UHH (tahun)" value={fmt(selected.uhh)} />
              <Metric icon={GraduationCap} tone="purple" label="HLS (tahun)" value={fmt(selected.hls)} />
              <Metric icon={GraduationCap} tone="purple" label="RLS (tahun)" value={fmt(selected.rls)} />
              <Metric icon={Banknote} label="Pengeluaran (ribu Rp)" value={fmt(selected.pengeluaran_ribu_rp, 0)} />
              <Metric icon={Banknote} tone="orange" label="Kemiskinan" value={`${fmt(selected.p0)}%`} />
              <Metric icon={Briefcase} tone="orange" label="TPT" value={`${fmt(selected.tpt)}%`} />
            </div>
            <div className="compare">
              <span>Posisi IPM pada rentang nasional</span>
              <div><i style={{ left: `${pct}%` }} /><u style={{ left: `${medPct}%` }} /><b style={{ left: `${pct}%` }}>{fmt(selected.ipm)}</b></div>
              <p>{fmt(ilo)} <span>(terendah)</span> · garis abu = median · <span>(tertinggi)</span> {fmt(ihi)}</p>
            </div>
            <button type="button" className="link-btn" onClick={goProfile}>Buka profil lengkap & Twin Finder <ArrowRight size={14} /></button>
          </aside>
        </div>
      </Section>
    </>
  )
}
