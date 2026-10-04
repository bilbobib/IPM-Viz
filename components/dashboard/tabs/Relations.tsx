'use client'
import { useMemo, useState } from 'react'
import { useDash } from '@/lib/dashboard-context'
import { INDICATORS, ISLAND_COLORS, indLabel, type NumKey } from '@/lib/types'
import { div, fmt, fmtFixed, pearson } from '@/lib/stats'
import { Field, ProvinceSelect, RegionSearch, Section, Segmented } from '../ui'
import { Scatter, type SPoint } from '../charts/Scatter'
import { Parallel } from '../charts/Parallel'

function IslandLegend() {
  return <div className="legend-row">{Object.entries(ISLAND_COLORS).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}</div>
}

export default function Relations() {
  const { data, selected, comparison, select, province } = useDash()
  const regions = data.regions
  const [xKey, setXKey] = useState<NumKey>('pengeluaran_ribu_rp')
  const [yKey, setYKey] = useState<NumKey>('ipm')
  const [trend, setTrend] = useState(true)
  const [pcaView, setPcaView] = useState<'scores' | 'biplot'>('scores')
  const [ctxProv, setCtxProv] = useState<string>('')

  const pts: SPoint[] = useMemo(() => regions.map((r) => ({
    id: r.id, x: r[xKey], y: r[yKey], color: ISLAND_COLORS[r.pulau] ?? '#888', label: r.kab_kota, sub: r.provinsi, dim: !!province && r.provinsi !== province,
  })), [regions, xKey, yKey, province])
  const r = useMemo(() => pearson(regions.map((q) => q[xKey]), regions.map((q) => q[yKey])), [regions, xKey, yKey])

  const sum = data.summary
  const n = (k: string) => Number(sum[k])
  const evr1 = n('evr_PC1') * 100, evr2 = n('evr_PC2') * 100
  const pcaPts: SPoint[] = useMemo(() => regions.map((q) => ({
    id: q.id, x: q.PC1, y: q.PC2, color: ISLAND_COLORS[q.pulau] ?? '#888', label: q.kab_kota, sub: `${q.provinsi} · IPM ${fmt(q.ipm)}`, dim: !!province && q.provinsi !== province,
  })), [regions, province])

  const ctxRegions = useMemo(() => regions.filter((q) => q.provinsi === (ctxProv || selected.provinsi)), [regions, ctxProv, selected.provinsi])
  const eig = Array.from({ length: 8 }, (_, i) => ({ pc: `PC${i + 1}`, e: n(`eigenvalue_PC${i + 1}`), p: n(`parallel_95_PC${i + 1}`), c: n(`cumulative_PC${i + 1}`) }))
  const eMax = Math.max(...eig.map((e) => e.e))

  return (
    <>
      <Section eyebrow="01 / HUBUNGAN DUA VARIABEL" title="Satu indikator tidak cukup menjelaskan pembangunan." desc="Setiap titik adalah satu kabupaten/kota (514 titik). Klik titik untuk memilih wilayah; wilayah terpilih ditandai di semua visual.">
        <div className="card chart-card">
          <div className="map-toolbar">
            <Field label="Sumbu X"><select value={xKey} onChange={(e) => setXKey(e.target.value as NumKey)}>{INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.short}</option>)}</select></Field>
            <Field label="Sumbu Y"><select value={yKey} onChange={(e) => setYKey(e.target.value as NumKey)}>{INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.short}</option>)}</select></Field>
            <Segmented label="Garis tren" value={trend ? 'on' : 'off'} onChange={(v) => setTrend(v === 'on')} options={[['on', 'OLS'], ['off', 'Mati']]} />
            <ProvinceSelect />
            <RegionSearch />
          </div>
          <div className="chart-pad">
            <Scatter points={pts} xLabel={indLabel(xKey)} yLabel={indLabel(yKey)} selectedId={selected.id} comparisonId={comparison?.id} onSelect={select} trend={trend} />
            <IslandLegend />
            <p className="annotation">Korelasi Pearson <b>r = {fmtFixed(r, 3)}</b> (n = {regions.length}). <b>{selected.kab_kota}</b>: {indLabel(xKey)} {fmt(selected[xKey])}, {indLabel(yKey)} {fmt(selected[yKey])}. Korelasi bersifat deskriptif, bukan bukti sebab-akibat.</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="02 / KORELASI" title="Indikator mana yang bergerak bersama?" desc="Matriks korelasi 8 variabel aktif PCA (correlation_matrix.csv).">
        <div className="card chart-pad">
          <div className="heat" style={{ gridTemplateColumns: `90px repeat(${data.corr.vars.length}, 1fr)` }}>
            <span />
            {data.corr.vars.map((v) => <b key={v} className="heat-h">{v}</b>)}
            {data.corr.matrix.map((row, i) => (
              <div key={i} className="heat-row">
                <b className="heat-l">{data.corr.vars[i]}</b>
                {row.map((v, j) => <span key={j} className="heat-c" title={`${data.corr.vars[i]} × ${data.corr.vars[j]}: ${fmtFixed(v, 3)}`} style={{ background: div(v), color: Math.abs(v) > 0.55 ? '#fff' : '#17352f' }}>{fmtFixed(v, 2)}</span>)}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="03 / PCA" title="Ruang profil: 514 wilayah pada dua dimensi utama." desc="Skor dan loading dibaca langsung dari pca_scores.csv, pca_loadings.csv, dan pca_summary.csv (tidak dihitung ulang).">
        <div className="chips">
          <span className="chip">PC1 menangkap {fmt(evr1, 1)}% variansi</span>
          <span className="chip">PC2 menangkap {fmt(evr2, 1)}%</span>
          <span className="chip teal">Kumulatif PC1+PC2: {fmt(n('cumulative_PC2') * 100, 1)}%</span>
          <span className="chip teal">r(IPM, PC1) = {fmtFixed(n('corr_ipm_PC1'), 3)}</span>
          <span className="chip">Komponen dipertahankan: {sum.retained_components}</span>
        </div>
        <div className="pca-grid">
          <div className="card chart-card">
            <div className="map-toolbar">
              <Segmented value={pcaView} onChange={setPcaView} options={[['scores', 'Skor wilayah'], ['biplot', 'Biplot + loading']]} />
              <RegionSearch />
            </div>
            <div className="chart-pad">
              <Scatter points={pcaPts} height={500} zero xLabel={`PC1 (${fmt(evr1, 1)}%)`} yLabel={`PC2 (${fmt(evr2, 1)}%)`}
                selectedId={selected.id} comparisonId={comparison?.id} onSelect={select}
                overlay={pcaView === 'biplot' ? (sx, sy) => (
                  <g pointerEvents="none">
                    {data.loadings.vars.map((v, i) => {
                      const k = 3.4, lx = data.loadings.values[i][0] * k, ly = data.loadings.values[i][1] * k
                      return <g key={v}><line x1={sx(0)} y1={sy(0)} x2={sx(lx)} y2={sy(ly)} stroke="#d97b45" strokeWidth={2} /><circle cx={sx(lx)} cy={sy(ly)} r={3.5} fill="#d97b45" /><text x={sx(lx) + (lx >= 0 ? 6 : -6)} y={sy(ly) + 3} textAnchor={lx >= 0 ? 'start' : 'end'} fontSize={11} fontWeight={700} fill="#b4572a" stroke="#fff" strokeWidth={3} paintOrder="stroke">{v}</text></g>
                    })}
                  </g>
                ) : undefined} />
              <IslandLegend />
            </div>
          </div>
          <div className="card read-card">
            <h3>Cara membaca</h3>
            <ul>
              <li><b>PC1</b> ({fmt(evr1, 1)}%): memuat UHH, HLS, RLS, pengeluaran (+) dan kemiskinan (−) — dimensi capaian pembangunan manusia.</li>
              <li><b>PC2</b> ({fmt(evr2, 1)}%): dibentuk terutama oleh TPAK laki-laki (+), kemiskinan dan TPT (−) — dimensi struktur ketenagakerjaan.</li>
              <li><b>Titik (0,0)</b> = rata-rata terstandardisasi, bukan batas baik/buruk.</li>
              <li>Wilayah yang berdekatan memiliki profil serupa; IPM saja menjelaskan R² = {fmt(n('r2_ipm_pc1') * 100, 1)}% dari PC1 dan {fmt(n('r2_ipm_pc1_pc2') * 100, 1)}% dari PC1+PC2.</li>
            </ul>
            <h3>Scree (eigenvalue)</h3>
            <div className="scree">
              {eig.map((e) => (
                <div key={e.pc} title={`${e.pc}: eigenvalue ${fmtFixed(e.e, 2)}, ambang paralel 95% ${fmtFixed(e.p, 2)}, kumulatif ${fmt(e.c * 100, 1)}%`}>
                  <i style={{ height: `${(e.e / eMax) * 100}%` }} className={e.e > e.p ? 'on' : ''} /><u style={{ bottom: `${(e.p / eMax) * 100}%` }} /><span>{e.pc}</span>
                </div>
              ))}
            </div>
            <small className="muted">Batang teal = melewati ambang analisis paralel (garis). Kaiser: {sum.n_kaiser} komponen; paralel: {sum.n_parallel}.</small>
          </div>
        </div>
        <div className="card chart-pad loadings">
          <h3>Loading variabel terhadap PC1 &amp; PC2</h3>
          <div className="loading-cols">
            {[0, 1].map((pc) => (
              <div key={pc}>
                <p className="eyebrow">PC{pc + 1}</p>
                {data.loadings.vars.map((v, i) => {
                  const val = data.loadings.values[i][pc]
                  return (
                    <div className="lbar" key={v} title={`${v}: ${fmtFixed(val, 3)}`}>
                      <span>{v}</span>
                      <div><i style={{ width: `${Math.abs(val) * 50}%`, [val >= 0 ? 'left' : 'right']: '50%', background: val >= 0 ? '#2f9a88' : '#d97b45' } as React.CSSProperties} /></div>
                      <b>{fmtFixed(val, 2)}</b>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="04 / KOORDINAT PARALEL" title="Profil 8 variabel sekaligus." desc="Garis oranye = wilayah terpilih, ungu = pembanding, abu putus-putus = median nasional, teal tipis = wilayah dalam provinsi konteks.">
        <div className="card chart-card">
          <div className="map-toolbar">
            <Field label="Provinsi konteks"><select value={ctxProv || selected.provinsi} onChange={(e) => setCtxProv(e.target.value)}>{Array.from(new Set(regions.map((q) => q.provinsi))).sort().map((p) => <option key={p}>{p}</option>)}</select></Field>
            <RegionSearch />
          </div>
          <div className="chart-pad"><Parallel regions={regions} context={ctxRegions} selected={selected} comparison={comparison} onSelect={select} /></div>
        </div>
      </Section>
    </>
  )
}
