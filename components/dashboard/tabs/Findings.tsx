'use client'
import { useMemo } from 'react'
import { ChevronRight, Database } from 'lucide-react'
import { useDash } from '@/lib/dashboard-context'
import { fmt, fmtFixed, mean, median } from '@/lib/stats'
import { Section } from '../ui'

export default function Findings() {
  const { data, select } = useDash()
  const regions = data.regions
  const n = (k: string) => Number(data.summary[k])

  const stats = useMemo(() => {
    const gm = mean(regions.map((r) => r.ipm))
    const sst = regions.reduce((s, r) => s + (r.ipm - gm) ** 2, 0)
    const by = new Map<string, number[]>()
    regions.forEach((r) => (by.get(r.provinsi) ?? by.set(r.provinsi, []).get(r.provinsi)!).push(r.ipm))
    let ssb = 0
    by.forEach((v) => { ssb += v.length * (mean(v) - gm) ** 2 })
    const sd1 = Math.sqrt(regions.reduce((s, r) => s + r.PC1 ** 2, 0) / (regions.length - 1)) || 1
    const sd2 = Math.sqrt(regions.reduce((s, r) => s + r.PC2 ** 2, 0) / (regions.length - 1)) || 1
    // pasangan IPM hampir sama (Δ ≤ 0,1) dengan jarak PCA terbesar
    const pairs: { a: typeof regions[number]; b: typeof regions[number]; d: number }[] = []
    for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i], b = regions[j]
      if (Math.abs(a.ipm - b.ipm) <= 0.1) pairs.push({ a, b, d: Math.hypot((a.PC1 - b.PC1) / sd1, (a.PC2 - b.PC2) / sd2) })
    }
    pairs.sort((x, y) => y.d - x.d)
    return { between: ssb / sst, pairs: pairs.slice(0, 4), total: pairs.length, medIpm: median(regions.map((r) => r.ipm)) }
  }, [regions])

  return (
    <>
      <Section eyebrow="01 / TEMUAN" title="Apa yang perlu diingat dari data ini?">
        <div className="insight-grid">
          <article className="insight"><span>01</span><h3>IPM adalah ringkasan</h3><p>IPM berkorelasi r = {fmtFixed(n('corr_ipm_PC1'), 2)} dengan PC1, tetapi PC2 (struktur ketenagakerjaan, {fmt(n('evr_PC2') * 100, 1)}% variansi) tidak ikut terwakili — IPM sendiri menjelaskan {fmt(n('r2_ipm_pc1_pc2') * 100, 1)}% dari ruang PC1+PC2.</p></article>
          <article className="insight"><span>02</span><h3>Variasi ada di dalam provinsi</h3><p>Perbedaan antarprovinsi menjelaskan {fmt(stats.between * 100, 1)}% variasi IPM; sisanya ({fmt((1 - stats.between) * 100, 1)}%) terjadi antar kabupaten/kota dalam provinsi yang sama.</p></article>
          <article className="insight accent"><span>03</span><h3>IPM mirip, profil bisa berbeda</h3><p>Ditemukan {fmt(stats.total, 0)} pasangan wilayah dengan selisih IPM ≤ 0,1; sebagian memiliki jarak profil PCA yang besar (lihat contoh di bawah). Hubungan ini eksploratif, bukan kausal.</p></article>
        </div>
        <div className="card chart-pad pairs">
          <h3>Contoh pasangan IPM hampir sama, profil paling berbeda</h3>
          {stats.pairs.map(({ a, b, d }) => (
            <div key={a.id + b.id} className="pair-row">
              <button type="button" onClick={() => select(a.id)}><b>{a.kab_kota}</b><small>{a.provinsi} · IPM {fmt(a.ipm)} · P0 {fmt(a.p0)}%</small></button>
              <span className="pair-d">jarak PCA {fmtFixed(d, 2)}</span>
              <button type="button" onClick={() => select(b.id)}><b>{b.kab_kota}</b><small>{b.provinsi} · IPM {fmt(b.ipm)} · P0 {fmt(b.p0)}%</small></button>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="02 / METODOLOGI" title="Dari data BPS menjadi visual interaktif.">
        <div className="pipeline card">
          {['Data BPS 2025', 'Pembersihan', 'Persiapan indikator', 'Standardisasi (z-score)', 'PCA', 'Join geospasial 514', 'Visualisasi interaktif'].map((s, i, a) => (
            <div key={s}><b>0{i + 1}</b><span>{s}</span>{i < a.length - 1 && <ChevronRight />}</div>
          ))}
        </div>
      </Section>

      <Section eyebrow="03 / SUMBER & BATASAN" title="Transparansi analisis.">
        <div className="method-grid">
          <div className="card chart-pad">
            <h3>Sumber data</h3>
            <div className="audit">
              {data.audit.map((a) => (
                <div key={a.variable}><b>{a.variable}</b><span>{a.bps_table_or_publication_title}</span><small>{a.year} · {a.unit} · {a.source_status}</small></div>
              ))}
            </div>
            <p className="muted">Batas wilayah: GeoJSON 514 kabupaten/kota (disederhanakan); join pada kunci provinsi + kab/kota: {data.geo.length}/{regions.length} cocok.</p>
          </div>
          <div className="card chart-pad">
            <h3>Batasan</h3>
            <ul>
              <li>PCA eksploratif dan sensitif terhadap pilihan variabel serta standardisasi.</li>
              <li>Korelasi dan kedekatan di ruang PCA bukan bukti kausalitas.</li>
              <li>Twin Finder adalah alat eksplorasi; status justifikasinya pada ringkasan PCA: <code>{data.summary.twin_finder}</code>.</li>
              <li>Polygon disederhanakan; batas kecil/pulau kecil dapat tampak kasar.</li>
              <li>Perbandingan terbatas pada tahun data yang tersedia (2025).</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section eyebrow="04 / DEKLARASI AI" title="Penggunaan AI secara transparan.">
        <div className="callout card"><Database /><p>AI membantu pengodean, eksplorasi, dan perancangan antarmuka. Angka pada dashboard dibaca dari berkas data aktual proyek (master_analytical_final.csv, hasil PCA, GeoJSON); keputusan analitik diverifikasi terhadap pipeline Python.</p></div>
      </Section>
    </>
  )
}
