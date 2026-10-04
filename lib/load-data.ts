import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DashboardData, GeoFeat, Region, NumKey } from './types'

/** CSV parser yang aman untuk sel ber-kutip (mis. source_audit.csv). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  const s = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

const NUM_KEYS: NumKey[] = ['ipm','p0','uhh','hls','rls','pengeluaran_ribu_rp','log_pengeluaran','tpt','tpak_l','tpak_p','ikk','penduduk','PC1','PC2','PC3']

// Proyeksi equirectangular sederhana; cukup untuk Indonesia (±11°S–6°N).
const S = 40, LON0 = 94.8, LAT0 = 6.3
const px = (lon: number) => (lon - LON0) * S
const py = (lat: number) => (LAT0 - lat) * S
const r1 = (v: number) => Math.round(v * 10) / 10

type Ring = number[][]
function ringArea(r: Ring) {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < r.length - 1; i++) {
    const [x0, y0] = r[i], [x1, y1] = r[i + 1]
    const f = x0 * y1 - x1 * y0
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
  }
  a /= 2
  return { a, cx: a ? cx / (6 * a) : r[0][0], cy: a ? cy / (6 * a) : r[0][1] }
}

export async function loadDashboardData(): Promise<DashboardData> {
  const dir = path.join(process.cwd(), 'public', 'data')
  const read = (f: string) => fs.readFile(path.join(dir, f), 'utf8')
  const [masterTxt, geoTxt, loadTxt, sumTxt, corrTxt, auditTxt] = await Promise.all([
    read('master_analytical_final.csv'), read('kabkota_514_simplified.geojson'), read('pca_loadings.csv'),
    read('pca_summary.csv'), read('correlation_matrix.csv'), read('source_audit.csv'),
  ])

  const [head, ...body] = parseCsv(masterTxt)
  const regions: Region[] = body.map((cells) => {
    const o: Record<string, string> = {}
    head.forEach((h, i) => (o[h] = cells[i] ?? ''))
    const r: Record<string, string | number> = {
      id: `${o.provinsi}|${o.kab_kota}`, provinsi: o.provinsi, pulau: o.pulau, kab_kota: o.kab_kota, jenis: o.jenis,
    }
    for (const k of NUM_KEYS) r[k] = Number(o[k])
    return r as Region
  })
  const ids = new Set(regions.map((r) => r.id))

  const gj = JSON.parse(geoTxt) as { features: { properties: { kab_kota: string; provinsi: string }; geometry: { type: string; coordinates: any } }[] }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const geo: GeoFeat[] = []
  for (const f of gj.features) {
    const id = `${f.properties.provinsi}|${f.properties.kab_kota}`
    if (!ids.has(id)) continue // join key provinsi|kab_kota: 514/514 cocok
    const polys: Ring[][] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    let d = '', best = { a: 0, cx: 0, cy: 0 }
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
    for (const poly of polys) {
      for (const ring of poly) {
        if (ring.length < 4) continue
        const pr: Ring = ring.map(([lo, la]) => [r1(px(lo)), r1(py(la))])
        d += 'M' + pr.map((p) => p[0] + ' ' + p[1]).join('L') + 'Z'
        for (const [x, y] of pr) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y }
        const m = ringArea(pr)
        if (Math.abs(m.a) > Math.abs(best.a)) best = m
      }
    }
    if (!d) continue
    minX = Math.min(minX, bx0); minY = Math.min(minY, by0); maxX = Math.max(maxX, bx1); maxY = Math.max(maxY, by1)
    geo.push({ id, d, cx: r1(best.cx || (bx0 + bx1) / 2), cy: r1(best.cy || (by0 + by1) / 2), bbox: [bx0, by0, bx1, by1] })
  }
  const pad = 12
  // geser agar peta mulai dari (pad,pad) tanpa mengubah path: pakai viewBox, bukan translasi data
  const mapSize = { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }

  const lt = parseCsv(loadTxt)
  const loadings = { pcs: lt[0].slice(1), vars: lt.slice(1).map((r) => r[0]), values: lt.slice(1).map((r) => r.slice(1).map(Number)) }
  const summary: Record<string, string> = {}
  parseCsv(sumTxt).slice(1).forEach(([k, v]) => (summary[k] = v))
  const ct = parseCsv(corrTxt)
  const corr = { vars: ct[0].slice(1), matrix: ct.slice(1).map((r) => r.slice(1).map(Number)) }
  const [ah, ...ab] = parseCsv(auditTxt)
  const audit = ab.map((r) => Object.fromEntries(ah.map((h, i) => [h, r[i] ?? ''])))

  return { regions, geo, mapSize, loadings, summary, corr, audit }
}
