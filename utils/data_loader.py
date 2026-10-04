"""
data_loader.py — Flexible data loading with column aliasing.
Resolves column name variations gracefully without overwriting values.
"""

import pandas as pd
import numpy as np
import json
import streamlit as st
from pathlib import Path

# ---------------------------------------------------------------------------
# Column alias mapping
# ---------------------------------------------------------------------------
COLUMN_ALIASES = {
    "province":    ["provinsi", "province", "prov"],
    "island":      ["pulau", "island", "island_group", "kelompok_pulau"],
    "region":      ["kab_kota", "kabupaten_kota", "kabkota", "region", "nama_kab", "kab/kota", "nama"],
    "geo_name":    ["nama_geo", "nama_geografi", "geo_name"],
    "region_type": ["jenis", "type", "tipe"],
    "ipm":         ["ipm", "hdi", "hdi_value"],
    "uhh":         ["uhh", "life_expectancy", "harapan_hidup"],
    "hls":         ["hls", "expected_schooling", "harapan_lama_sekolah"],
    "rls":         ["rls", "mean_schooling", "rata_lama_sekolah"],
    "expenditure": ["pengeluaran_ribu_rp", "pengeluaran", "expenditure", "pengeluaran_ribu"],
    "log_expenditure": ["log_pengeluaran", "ln_pengeluaran", "log_expenditure", "log_pengeluaran_ribu_rp"],
    "poverty":     ["p0", "poverty_rate", "pct_miskin", "persentase_penduduk_miskin"],
    "tpt":         ["tpt", "unemployment", "pengangguran"],
    "tpak_male":   ["tpak_l", "tpak_laki", "tpak_male", "tpak_laki_laki"],
    "tpak_female": ["tpak_p", "tpak_perempuan", "tpak_female"],
    "ikk":         ["ikk"],
    "population":  ["penduduk", "population", "pop"],
    "pc1":         ["pc1", "PC1"],
    "pc2":         ["pc2", "PC2"],
    "pc3":         ["pc3", "PC3"],
    "ipm_calc":    ["ipm_hitung", "ipm_calc"],
    "ipm_diff":    ["selisih_ipm", "ipm_diff"],
}

# Island group mapping based on province names
ISLAND_GROUP_MAP = {
    "Aceh": "Sumatera",
    "Sumatera Utara": "Sumatera",
    "Sumatera Barat": "Sumatera",
    "Riau": "Sumatera",
    "Jambi": "Sumatera",
    "Sumatera Selatan": "Sumatera",
    "Bengkulu": "Sumatera",
    "Lampung": "Sumatera",
    "Kep. Bangka Belitung": "Sumatera",
    "Kepulauan Bangka Belitung": "Sumatera",
    "Kepulauan Riau": "Sumatera",
    "DKI Jakarta": "Jawa",
    "Jawa Barat": "Jawa",
    "Jawa Tengah": "Jawa",
    "DI Yogyakarta": "Jawa",
    "Jawa Timur": "Jawa",
    "Banten": "Jawa",
    "Bali": "Bali & Nusa Tenggara",
    "Nusa Tenggara Barat": "Bali & Nusa Tenggara",
    "Nusa Tenggara Timur": "Bali & Nusa Tenggara",
    "Kalimantan Barat": "Kalimantan",
    "Kalimantan Tengah": "Kalimantan",
    "Kalimantan Selatan": "Kalimantan",
    "Kalimantan Timur": "Kalimantan",
    "Kalimantan Utara": "Kalimantan",
    "Sulawesi Utara": "Sulawesi",
    "Sulawesi Tengah": "Sulawesi",
    "Sulawesi Selatan": "Sulawesi",
    "Sulawesi Tenggara": "Sulawesi",
    "Gorontalo": "Sulawesi",
    "Sulawesi Barat": "Sulawesi",
    "Maluku": "Maluku",
    "Maluku Utara": "Maluku",
    "Papua Barat": "Papua",
    "Papua Barat Daya": "Papua",
    "Papua": "Papua",
    "Papua Selatan": "Papua",
    "Papua Tengah": "Papua",
    "Papua Pegunungan": "Papua",
}


def _normalize_col(name: str) -> str:
    """Lowercase, strip, replace spaces/hyphens with underscore."""
    return name.lower().strip().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "")


def resolve_columns(df: pd.DataFrame) -> dict:
    """
    Given a dataframe, return a dict mapping canonical key → actual column name.
    Uses COLUMN_ALIASES. If no match found, key is absent from result.
    """
    normalized = {_normalize_col(c): c for c in df.columns}
    resolved = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            norm = _normalize_col(alias)
            if norm in normalized:
                resolved[canonical] = normalized[norm]
                break
    return resolved


@st.cache_data(show_spinner=False)
def load_main_data() -> pd.DataFrame:
    """Load and normalize master_analytical_final.csv."""
    path = Path(__file__).parent.parent / "data" / "master_analytical_final.csv"
    df = pd.read_csv(path)
    cols = resolve_columns(df)

    # Standardize column names to canonical
    rename_map = {v: k for k, v in cols.items() if v != k}
    df = df.rename(columns=rename_map)

    # Ensure island group column
    if "island" not in df.columns or df["island"].isna().all():
        df["island"] = df["province"].map(ISLAND_GROUP_MAP).fillna("Lainnya")
    
    # Ensure geo_name for map join
    if "geo_name" not in df.columns and "region" in df.columns:
        df["geo_name"] = df["region"]

    # Create display label
    df["label"] = df["province"] + " — " + df["region"]

    # Compute ln expenditure if missing
    if "log_expenditure" not in df.columns and "expenditure" in df.columns:
        df["log_expenditure"] = np.log(df["expenditure"])

    return df


@st.cache_data(show_spinner=False)
def load_pca_scores() -> pd.DataFrame:
    """Load PCA scores."""
    path = Path(__file__).parent.parent / "data" / "pca_scores.csv"
    df = pd.read_csv(path)
    cols = resolve_columns(df)
    rename_map = {v: k for k, v in cols.items() if v != k}
    return df.rename(columns=rename_map)


@st.cache_data(show_spinner=False)
def load_pca_loadings() -> pd.DataFrame:
    """Load PCA loadings."""
    path = Path(__file__).parent.parent / "data" / "pca_loadings.csv"
    df = pd.read_csv(path, index_col=0)
    return df


@st.cache_data(show_spinner=False)
def load_pca_summary() -> dict:
    """Load PCA summary as dict."""
    path = Path(__file__).parent.parent / "data" / "pca_summary.csv"
    df = pd.read_csv(path)
    return dict(zip(df["metric"], df["value"]))


@st.cache_data(show_spinner=False)
def load_geojson() -> dict:
    """Load GeoJSON."""
    path = Path(__file__).parent.parent / "data" / "kabkota_514_simplified.geojson"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_data() -> dict:
    """Run data quality checks. Returns report dict."""
    report = {}
    try:
        df = load_main_data()
        report["n_regions"] = len(df)
        report["n_expected"] = 514
        report["n_regions_ok"] = len(df) == 514

        key_col = "province"
        if "region" in df.columns and "province" in df.columns:
            report["n_duplicate_keys"] = df.duplicated(subset=["province", "region"]).sum()
        else:
            report["n_duplicate_keys"] = "N/A"

        for col in ["ipm", "uhh", "hls", "rls", "poverty", "tpt", "tpak_male", "tpak_female", "pc1", "pc2"]:
            if col in df.columns:
                report[f"missing_{col}"] = int(df[col].isna().sum())

        # GeoJSON check
        geo = load_geojson()
        report["geojson_features"] = len(geo.get("features", []))
        report["geojson_ok"] = len(geo.get("features", [])) >= 510  # allow slight mismatch

    except Exception as e:
        report["error"] = str(e)

    return report


# ---------------------------------------------------------------------------
# Design System Color Constants (Section 12 Master Prompt)
# ---------------------------------------------------------------------------
COLOR_BG = "#F7F5F0"
COLOR_SURFACE = "#FFFFFF"
COLOR_TEXT = "#17252A"
COLOR_SECONDARY = "#536166"
COLOR_BORDER = "#D9DEDC"
COLOR_ACCENT_TEAL = "#176B67"
COLOR_ACCENT_ORANGE = "#D97745"

# Palettes
PALETTE_IPM = ["#E5F3F0", "#B8DDD7", "#78BDB5", "#3D918A", "#176B67"]
PALETTE_POVERTY = ["#FFF0E6", "#F7C7A8", "#EFA070", "#D96C43", "#B94D2B"]
PALETTE_PCA = [[0.0, "#6C5B8C"], [0.5, "#F2F0EC"], [1.0, "#D97745"]]
PALETTE_TEAL_SEQ = ["#E5F3F0", "#B8DDD7", "#78BDB5", "#3D918A", "#176B67"]
PALETTE_ORANGE_SEQ = ["#FFF0E6", "#F7C7A8", "#EFA070", "#D96C43", "#B94D2B"]


def get_indicator_config() -> dict:
    """Return indicator display config for selectors and maps using semantic palette."""
    return {
        "ipm": {
            "label": "IPM (Indeks Pembangunan Manusia)",
            "short": "IPM",
            "unit": "",
            "colorscale": PALETTE_IPM,
            "description": "Indeks komposit pembangunan manusia (0–100) berbasis kesehatan, pendidikan, dan pengeluaran.",
            "higher_better": True,
        },
        "poverty": {
            "label": "P0 — Persentase Penduduk Miskin",
            "short": "P0 (%)",
            "unit": "%",
            "colorscale": PALETTE_POVERTY,
            "description": "Persentase penduduk di bawah garis kemiskinan BPS.",
            "higher_better": False,
        },
        "uhh": {
            "label": "UHH — Umur Harapan Hidup saat Lahir",
            "short": "UHH (thn)",
            "unit": "tahun",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Perkiraan rata-rata usia yang dapat ditempuh bayi yang baru lahir.",
            "higher_better": True,
        },
        "hls": {
            "label": "HLS — Harapan Lama Sekolah",
            "short": "HLS (thn)",
            "unit": "tahun",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Lamanya sekolah yang diharapkan akan dirasakan oleh anak pada umur tertentu.",
            "higher_better": True,
        },
        "rls": {
            "label": "RLS — Rata-rata Lama Sekolah",
            "short": "RLS (thn)",
            "unit": "tahun",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Jumlah tahun yang digunakan oleh penduduk usia ≥15 tahun dalam menjalani pendidikan formal.",
            "higher_better": True,
        },
        "expenditure": {
            "label": "Pengeluaran per Kapita Disesuaikan",
            "short": "Pengeluaran (ribu Rp)",
            "unit": "ribu Rp/tahun",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Pengeluaran riil per kapita per tahun yang disesuaikan.",
            "higher_better": True,
        },
        "tpt": {
            "label": "TPT — Tingkat Pengangguran Terbuka",
            "short": "TPT (%)",
            "unit": "%",
            "colorscale": PALETTE_POVERTY,
            "description": "Persentase angkatan kerja yang tidak bekerja dan sedang mencari pekerjaan.",
            "higher_better": False,
        },
        "tpak_male": {
            "label": "TPAK Laki-laki",
            "short": "TPAK L (%)",
            "unit": "%",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Tingkat Partisipasi Angkatan Kerja penduduk laki-laki.",
            "higher_better": True,
        },
        "tpak_female": {
            "label": "TPAK Perempuan",
            "short": "TPAK P (%)",
            "unit": "%",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Tingkat Partisipasi Angkatan Kerja penduduk perempuan.",
            "higher_better": True,
        },
        "ikk": {
            "label": "IKK — Indeks Kemahalan Konstruksi",
            "short": "IKK",
            "unit": "",
            "colorscale": PALETTE_ORANGE_SEQ,
            "description": "Indeks harga relatif konstruksi dibandingkan kota acuan.",
            "higher_better": False,
        },
        "population": {
            "label": "Jumlah Penduduk",
            "short": "Penduduk (jiwa)",
            "unit": "jiwa",
            "colorscale": PALETTE_TEAL_SEQ,
            "description": "Total jumlah penduduk kabupaten/kota.",
            "higher_better": None,
        },
        "pc1": {
            "label": "PC1 — Skor Komponen Utama 1",
            "short": "PC1",
            "unit": "",
            "colorscale": PALETTE_PCA,
            "description": "Dimensi 1: Merangkum kapasitas pembangunan manusia & kesejahteraan ekonomi (49,9% variansi).",
            "higher_better": None,
        },
        "pc2": {
            "label": "PC2 — Skor Komponen Utama 2",
            "short": "PC2",
            "unit": "",
            "colorscale": PALETTE_PCA,
            "description": "Dimensi 2: Menangkap dinamika pasar kerja & partisipasi angkatan kerja (19,9% variansi).",
            "higher_better": None,
        },
    }
