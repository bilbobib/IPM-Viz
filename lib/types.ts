export type NumKey =
  | 'ipm' | 'p0' | 'uhh' | 'hls' | 'rls' | 'pengeluaran_ribu_rp' | 'log_pengeluaran'
  | 'tpt' | 'tpak_l' | 'tpak_p' | 'ikk' | 'penduduk' | 'PC1' | 'PC2' | 'PC3'

export type Region = {
  id: string
  provinsi: string
  pulau: string
  kab_kota: string
  jenis: string
} & Record<NumKey, number>

/** Satu polygon kab/kota yang sudah diproyeksikan ke koordinat SVG (dihitung di server saat build). */
export type GeoFeat = {
  id: string
  d: string
  cx: number
  cy: number
  bbox: [number, number, number, number] // minX, minY, maxX, maxY
}

export type Loadings = { vars: string[]; pcs: string[]; values: number[][] }

export type DashboardData = {
  regions: Region[]
  geo: GeoFeat[]
  mapSize: { x: number; y: number; w: number; h: number }
  loadings: Loadings
  summary: Record<string, string>
  corr: { vars: string[]; matrix: number[][] }
  audit: Record<string, string>[]
}

export const INDICATORS: { key: NumKey; label: string; short: string; unit: string }[] = [
  { key: 'ipm', label: 'Indeks Pembangunan Manusia', short: 'IPM', unit: '' },
  { key: 'uhh', label: 'Umur Harapan Hidup', short: 'UHH', unit: 'tahun' },
  { key: 'hls', label: 'Harapan Lama Sekolah', short: 'HLS', unit: 'tahun' },
  { key: 'rls', label: 'Rata-rata Lama Sekolah', short: 'RLS', unit: 'tahun' },
  { key: 'pengeluaran_ribu_rp', label: 'Pengeluaran per Kapita', short: 'Pengeluaran', unit: 'ribu Rp' },
  { key: 'p0', label: 'Penduduk Miskin (P0)', short: 'Kemiskinan', unit: '%' },
  { key: 'tpt', label: 'Tingkat Pengangguran Terbuka', short: 'TPT', unit: '%' },
  { key: 'tpak_l', label: 'TPAK Laki-laki', short: 'TPAK L', unit: '%' },
  { key: 'tpak_p', label: 'TPAK Perempuan', short: 'TPAK P', unit: '%' },
  { key: 'ikk', label: 'Indeks Kemahalan Konstruksi', short: 'IKK', unit: '' },
]

/** 8 variabel aktif PCA (urutan sama dengan pca_loadings.csv). */
export const PCA_VARS: { key: NumKey; label: string }[] = [
  { key: 'uhh', label: 'UHH' },
  { key: 'hls', label: 'HLS' },
  { key: 'rls', label: 'RLS' },
  { key: 'log_pengeluaran', label: 'ln(Pengeluaran)' },
  { key: 'p0', label: 'P0' },
  { key: 'tpt', label: 'TPT' },
  { key: 'tpak_l', label: 'TPAK L' },
  { key: 'tpak_p', label: 'TPAK P' },
]

export const indLabel = (k: NumKey) => INDICATORS.find((i) => i.key === k)?.short ?? k
export const indUnit = (k: NumKey) => INDICATORS.find((i) => i.key === k)?.unit ?? ''

export const ISLAND_COLORS: Record<string, string> = {
  Sumatera: '#2f9a88',
  Jawa: '#3d6fa8',
  'Bali dan Nusa Tenggara': '#d97b45',
  Kalimantan: '#766497',
  Sulawesi: '#c0504d',
  Maluku: '#2aa7b8',
  Papua: '#8a6a4f',
}
