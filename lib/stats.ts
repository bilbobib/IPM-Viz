export const fmt = (v: number, d = 2) =>
  Number.isFinite(v) ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(v) : '–'
export const fmtFixed = (v: number, d = 2) =>
  Number.isFinite(v) ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v) : '–'
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const sortedAsc = (a: number[]) => [...a].sort((x, y) => x - y)
export function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN
  const p = (sorted.length - 1) * q
  const lo = Math.floor(p), hi = Math.ceil(p)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo)
}
export const median = (a: number[]) => quantile(sortedAsc(a), 0.5)
export const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN)
export function std(a: number[]) {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1))
}
export function pearson(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y)
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) ** 2
    syy += (y[i] - my) ** 2
  }
  return sxy / Math.sqrt(sxx * syy)
}
export function ols(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y)
  let sxy = 0, sxx = 0
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2 }
  const slope = sxy / sxx
  return { slope, intercept: my - slope * mx }
}
export function extent(a: number[]): [number, number] {
  let lo = Infinity, hi = -Infinity
  for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v }
  return [lo, hi]
}
export function niceTicks(min: number, max: number, n = 5) {
  if (!(max > min)) return [min]
  const raw = (max - min) / n
  const pow = 10 ** Math.floor(Math.log10(raw))
  const f = raw / pow
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(Math.round(v / step) * step)
  return out
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const STOPS = ['#e4f2eb', '#9bd0c0', '#2f9a88', '#0f5a52'].map(hex)
export function seq(t: number) {
  const x = clamp(t, 0, 1) * (STOPS.length - 1)
  const i = Math.min(Math.floor(x), STOPS.length - 2)
  const f = x - i
  const c = STOPS[i].map((v, k) => Math.round(v + (STOPS[i + 1][k] - v) * f))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
/** Diverging orange (negatif) – putih – teal (positif), t di [-1,1]. */
export function div(t: number) {
  const a = clamp(Math.abs(t), 0, 1)
  const base = [246, 247, 243]
  const end = t >= 0 ? [27, 122, 109] : [217, 123, 69]
  const c = base.map((v, k) => Math.round(v + (end[k] - v) * a))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
