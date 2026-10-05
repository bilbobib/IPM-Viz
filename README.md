# Di Balik Angka IPM 2025

> **Potret Multidimensi dan Analisis Spasial Pembangunan Manusia Indonesia 2025**

Dashboard interaktif untuk mengeksplorasi perbedaan profil pembangunan manusia pada **514 kabupaten/kota di Indonesia** menggunakan data BPS tahun 2025.

**Pertanyaan utama:**  
> Apakah kabupaten/kota dengan IPM yang serupa benar-benar memiliki profil pembangunan manusia yang sama?

## Demo

- **Dashboard:** https://ipm-viz.vercel.app/
- **Repository:** https://github.com/bilbobib/IPM-Viz

## Tentang Proyek

IPM merupakan indikator ringkasan pembangunan manusia. Dashboard ini tidak berhenti pada perbandingan nilai IPM, tetapi mengeksplorasi dimensi yang menyusunnya serta indikator sosial-ekonomi lain untuk melihat variasi antarwilayah.

Analisis difokuskan pada tiga perspektif visualisasi:

1. **Geospasial** — distribusi indikator pada 514 kabupaten/kota.
2. **Multivariat** — hubungan antarindikator dan reduksi dimensi menggunakan Principal Component Analysis (PCA).
3. **Hierarkis** — struktur Indonesia → kelompok pulau → provinsi → kabupaten/kota.

Dashboard juga menyediakan eksplorasi profil wilayah dan **Twin Finder**, yaitu pencarian wilayah dengan IPM yang relatif dekat tetapi posisi profilnya berbeda di ruang PC1–PC2. Fitur ini bersifat eksploratif dan tidak dimaksudkan sebagai pengelompokan formal atau bukti kausal.

## Fitur Dashboard

### 01 — Ikhtisar & Peta

- Ringkasan jumlah wilayah, IPM tertinggi/terendah, median IPM, dan median kemiskinan.
- Histogram distribusi indikator.
- Peringkat 10 wilayah teratas/terbawah berdasarkan indikator yang dipilih.
- Peta 514 kabupaten/kota dengan dua mode:
  - **Poligon/choropleth**
  - **Bubble/proportional symbol**, dengan ukuran berdasarkan jumlah penduduk dan warna berdasarkan indikator.
- Pemilihan indikator, provinsi, dan wilayah.
- Tooltip, pemilihan wilayah, zoom, pan, dan reset peta.
- Profil ringkas wilayah terpilih.

### 02 — Hubungan & Multivariat

- Scatter plot interaktif untuk dua indikator pilihan.
- Garis tren OLS dan koefisien korelasi Pearson.
- Matriks korelasi untuk delapan variabel aktif PCA.
- PCA menggunakan delapan variabel:
  - UHH
  - HLS
  - RLS
  - ln(Pengeluaran per Kapita)
  - P0
  - TPT
  - TPAK laki-laki
  - TPAK perempuan
- Visualisasi skor PC1–PC2.
- PCA biplot dan loading untuk interpretasi arah kontribusi variabel.
- Parallel coordinates untuk membandingkan profil multidimensi.
- Pemilihan wilayah pada visualisasi untuk menghubungkan eksplorasi antarbagian dashboard.

### 03 — Profil, Variasi & Struktur

- Profil wilayah terhadap median nasional.
- Perbandingan dengan wilayah lain.
- Twin Finder berbasis kedekatan IPM dan jarak terstandar pada PC1–PC2.
- Variasi kabupaten/kota di dalam provinsi.
- **Treemap** dan **sunburst** untuk struktur hierarkis:
  **Indonesia → pulau → provinsi → kabupaten/kota**.
- Drill-down dan breadcrumb pada visualisasi hierarki.
- Ukuran hierarki merepresentasikan jumlah penduduk; warna merepresentasikan IPM.

### 04 — Temuan & Metodologi

- Ringkasan temuan eksploratif.
- Pasangan wilayah dengan IPM hampir sama tetapi jarak profil PCA besar.
- Alur pengolahan data.
- Audit sumber data.
- Keterbatasan analisis.
- Deklarasi penggunaan AI.

## Data dan Sumber

Sumber utama seluruh indikator statistik adalah **Badan Pusat Statistik (BPS), tahun 2025**. Metadata sumber yang digunakan dalam proyek terdokumentasi pada:

`data/source_audit.csv`

Variabel utama yang terdokumentasi meliputi:

| Variabel | Keterangan |
|---|---|
| IPM | Indeks Pembangunan Manusia |
| UHH | Umur Harapan Hidup |
| HLS | Harapan Lama Sekolah |
| RLS | Rata-rata Lama Sekolah |
| Pengeluaran | Pengeluaran per kapita disesuaikan |
| P0 | Persentase Penduduk Miskin |
| TPT | Tingkat Pengangguran Terbuka |
| TPAK L | Tingkat Partisipasi Angkatan Kerja laki-laki |
| TPAK P | Tingkat Partisipasi Angkatan Kerja perempuan |
| IKK | Indeks Kemahalan Konstruksi, sebagai indikator suplementer |
| Penduduk | Jumlah penduduk, sebagai indikator suplementer untuk ukuran visual |

### Sumber BPS

Daftar judul tabel/publikasi, tahun, satuan, URL, dan tanggal akses tersedia secara terstruktur di `data/source_audit.csv`.

Beberapa sumber utama:

- [Indeks Pembangunan Manusia 2025 — BPS](https://www.bps.go.id/id/publication/2026/04/24/f96755ab0e48765d028c0462/indeks-pembangunan-manusia-2025.html)
- [Umur Harapan Hidup Saat Lahir — BPS](https://www.bps.go.id/id/statistics-table/2/MjI3MCMy/umur-harapan-hidup-saat-lahir-menurut-jenis-kelamin-menggunakan-uhh-hasil-sp2020-lf-.html)
- [Expected Years of Schooling (EYS) by Gender — BPS](https://www.bps.go.id/id/statistics-table/2/NDU3IzI%3D/expected-years-of-schooling--eys--by-gender.html)
- [Mean Years of Schooling (MYS) — BPS](https://www.bps.go.id/id/statistics-table/2/NDE1IzI=/-metode-baru--rata-rata-lama-sekolah--tahun-.html)
- [Adjusted Per Capita Expenditure — BPS](https://www.bps.go.id/id/statistics-table/2/NDYxIzI%3D/adjusted-per-capita-expenditure-by-gender--thousand-rupiah-person-year-.html)
- [Persentase Penduduk Miskin (P0) menurut Kabupaten/Kota — BPS](https://www.bps.go.id/id/statistics-table/2/NjIxIzI%3D/persentase-penduduk-miskin-p0-menurut-kabupaten-kota.html)
- [Tingkat Pengangguran Terbuka menurut Jenis Kelamin dan Kabupaten/Kota — BPS](https://www.bps.go.id/id/statistics-table/2/MjgyNCMy/tingkat-pengangguran-terbuka-menurut-jenis-kelamin-dan-kabupaten-kota-.html)
- [Tingkat Partisipasi Angkatan Kerja Menurut Jenis Kelamin — BPS](https://www.bps.go.id/id/statistics-table/2/MjIwMCMy/tingkat-partisipasi-angkatan-kerja-menurut-jenis-kelamin.html)
- [Indeks Kemahalan Konstruksi Provinsi dan Kabupaten/Kota 2025 — BPS](https://www.bps.go.id/id/publication/2025/10/01/935f3f46173c68d21b6c5126/indeks-kemahalan-konstruksi-provinsi-dan-kabupaten-kota-2025.html)
- [Jumlah Penduduk menurut Kabupaten/Kota dan Kelompok Umur — BPS](https://www.bps.go.id/id/statistics-table/2/Mjc5MCMy/-jumlah-penduduk-menurut-kabupaten-kota-dan-kelompok-umur.html)

### Batas Wilayah

Visualisasi peta menggunakan GeoJSON batas administratif kabupaten/kota yang disederhanakan. Berkas pendukungnya adalah:

`public/data/kabkota_514_simplified.geojson`

Metadata sumber batas wilayah dan lisensinya dicatat pada `data/source_audit.csv`. Batas wilayah merupakan **data pendukung non-BPS**, sedangkan nilai indikator statistik tetap berasal dari BPS.

## Metodologi Analitik

### Persiapan Data

Dataset analitik utama berada pada:

`data/master_analytical_final.csv`

Dashboard memuat salinan runtime data dari:

`public/data/master_analytical_final.csv`

Setiap observasi diidentifikasi berdasarkan kombinasi provinsi dan kabupaten/kota. Proyek mencatat **514 observasi dengan 514 kunci wilayah unik**.

Untuk PCA, delapan variabel aktif diproses sebagai profil multidimensi. Pengeluaran per kapita digunakan dalam bentuk logaritmik (`ln(Pengeluaran)`) sebelum standardisasi. Variabel kemudian dianalisis pada skala terstandardisasi.

### Principal Component Analysis

Hasil PCA yang digunakan dashboard disimpan dalam:

- `data/pca_scores.csv`
- `data/pca_loadings.csv`
- `data/pca_summary.csv`

Ringkasan PCA mencatat delapan variabel aktif dan dua komponen yang dipertahankan. Nilai skor, loading, eigenvalue, explained variance, dan korelasi terkait tidak dihitung ulang oleh browser; dashboard membaca hasil analitik yang telah disiapkan.

### Visual Encoding

- **Peta poligon:** warna → nilai indikator.
- **Peta bubble:** ukuran → jumlah penduduk; warna → nilai indikator.
- **Scatter plot:** posisi x/y → dua indikator; warna → kelompok pulau.
- **PCA scatter:** x/y → PC1/PC2; warna → IPM.
- **Parallel coordinates:** sumbu → delapan variabel PCA; garis → profil wilayah.
- **Treemap/sunburst:** ukuran → jumlah penduduk; warna → IPM.

## Struktur Repository

```text
IPM-Viz/
├── app/                         # Next.js App Router dan styling
├── components/
│   └── dashboard/
│       ├── charts/              # Komponen visualisasi
│       └── tabs/                # Empat bagian utama dashboard
├── data/                        # Dataset analitik dan metadata sumber
├── lib/
│   ├── dashboard-context.tsx    # State dan interaksi dashboard
│   ├── load-data.ts             # Loader dan parsing data
│   ├── stats.ts                 # Fungsi statistik client-side
│   └── types.ts                 # Tipe data dan konfigurasi indikator
├── public/
│   └── data/                    # Data yang dibaca oleh aplikasi saat runtime
├── utils/                       # Modul analitik/preprocessing dan referensi pipeline
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Teknologi

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Lucide React**
- **Vercel Analytics**
- SVG/React untuk visualisasi interaktif yang berjalan langsung di sisi aplikasi.

Repository menggunakan **pnpm** sebagai package manager.

## Menjalankan Secara Lokal

Prasyarat: Node.js dan pnpm.

```bash
pnpm install
pnpm dev
```

Kemudian buka:

```text
http://localhost:3000
```

Untuk production build:

```bash
pnpm build
pnpm start
```

## Deployment

Aplikasi merupakan aplikasi **Next.js** dan dideploy sebagai situs publik menggunakan **Vercel**.

URL deployment saat proyek ini diserahkan:

**https://ipm-viz.vercel.app/**

Repository publik:

**https://github.com/bilbobib/IPM-Viz**

## Transparansi dan Keterbatasan

Beberapa hasil pada dashboard bersifat eksploratif. Korelasi, posisi pada ruang PCA, dan kedekatan profil tidak boleh ditafsirkan sebagai hubungan sebab-akibat.

PCA sensitif terhadap pemilihan variabel, transformasi, dan standardisasi. Nilai PC merupakan koordinat relatif dalam ruang terstandardisasi; tanda positif/negatif tidak secara otomatis berarti baik/buruk.

Twin Finder juga merupakan alat eksplorasi, bukan metode clustering formal. Ringkasan PCA pada proyek saat ini mencatat status justifikasi Twin Finder sebagai `NOT_YET_JUSTIFIED`; fitur tersebut karena itu diposisikan sebagai alat eksplorasi pola, bukan kesimpulan inferensial.

Geometri peta telah disederhanakan sehingga beberapa batas wilayah kecil dapat tampak lebih kasar.

## Penggunaan AI

AI digunakan sebagai **alat bantu** dalam proses pengembangan, termasuk pengodean, eksplorasi, debugging/iterasi, dan perancangan antarmuka. Data, hasil analisis, interpretasi, dan keputusan akhir tetap menjadi tanggung jawab pengembang proyek dan diverifikasi terhadap berkas data serta pipeline analitik yang tersedia di repository.

## Konteks Akademik

Proyek ini dikembangkan sebagai tugas **UAS Visualisasi Data dan Informasi (K203407)**, Program Studi Komputasi Statistik, Politeknik Statistika STIS.

**Penulis:** Mario Mikail H. Simanjuntak  
**NIM:** 222313196

---

*Sumber statistik utama: Badan Pusat Statistik (BPS), data tahun 2025.*
