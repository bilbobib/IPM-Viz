"""
hierarchy.py — Treemap and Sunburst chart builders.
Hierarchy: Indonesia → Kelompok Pulau → Provinsi → Kabupaten/Kota
"""

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from typing import Optional


ISLAND_COLORS = {
    "Sumatera": "#4CAF50",
    "Jawa": "#2196F3",
    "Bali & Nusa Tenggara": "#FF9800",
    "Kalimantan": "#9C27B0",
    "Sulawesi": "#F44336",
    "Maluku": "#00BCD4",
    "Papua": "#795548",
    "Lainnya": "#9E9E9E",
}


def build_treemap(
    df: pd.DataFrame,
    color_col: str = "ipm",
    size_col: str = "population",
    focus_province: Optional[str] = None,
    focus_island: Optional[str] = None,
    height: int = 580,
) -> go.Figure:
    """
    Build a treemap with hierarchy:
    Mode 1 (Overview): Indonesia -> Pulau -> Provinsi -> Kab/Kota
    Mode 2 (Focused): Focus on selected Island or Province
    Size = Population (with explanatory note), Color = IPM (palette teal sequential).
    """
    df_plot = df.copy()

    from utils.data_loader import PALETTE_IPM, ISLAND_GROUP_MAP

    if "island" not in df_plot.columns:
        df_plot["island"] = df_plot.get("province", pd.Series(dtype=str)).map(ISLAND_GROUP_MAP).fillna("Lainnya")

    # Apply Mode 2 focus if requested
    mode_title = "Nasional (514 Wilayah)"
    if focus_province and focus_province != "(Semua)" and "province" in df_plot.columns:
        df_plot = df_plot[df_plot["province"] == focus_province]
        mode_title = f"Fokus Provinsi: {focus_province}"
    elif focus_island and focus_island != "(Semua)" and "island" in df_plot.columns:
        df_plot = df_plot[df_plot["island"] == focus_island]
        mode_title = f"Fokus Pulau: {focus_island}"

    use_size = size_col in df_plot.columns and df_plot[size_col].notna().any()
    if not use_size:
        df_plot["_count"] = 1
        actual_size = "_count"
        size_note = "(Ukuran = Jumlah Wilayah)"
    else:
        actual_size = size_col
        df_plot[actual_size] = df_plot[actual_size].fillna(df_plot[actual_size].median())
        size_note = "(Ukuran ∝ Jumlah Penduduk)"

    df_plot["_root"] = "Indonesia"

    if focus_province and focus_province != "(Semua)":
        path_cols = ["province", "region"]
    elif focus_island and focus_island != "(Semua)":
        path_cols = ["island", "province", "region"]
    else:
        path_cols = ["_root", "island", "province", "region"]

    path_cols = [c for c in path_cols if c in df_plot.columns]

    fig = px.treemap(
        df_plot,
        path=path_cols,
        values=actual_size,
        color=color_col if color_col in df_plot.columns else None,
        color_continuous_scale=PALETTE_IPM,
        height=height,
    )

    fig.update_traces(
        textfont_size=12,
        hovertemplate=(
            "<b>%{label}</b><br>"
            "Penduduk: %{value:,.0f} jiwa<br>"
            "IPM: %{color:.2f}<br>"
            "<extra></extra>"
        ),
        root_color="rgba(0,0,0,0)",
        marker=dict(cornerradius=4),
    )

    fig.update_layout(
        title=dict(
            text=f"Peta Pohon Hierarkis — {mode_title} {size_note}",
            font=dict(size=15, color="#17252A"),
        ),
        margin=dict(l=0, r=0, t=50, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        coloraxis_colorbar=dict(
            title=dict(text="IPM", side="right"),
            thickness=14,
            len=0.65,
            tickfont=dict(size=11, color="#17252A"),
        ),
    )

    return fig


def build_sunburst(
    df: pd.DataFrame,
    color_col: str = "ipm",
    size_col: str = "population",
    height: int = 580,
) -> go.Figure:
    """
    Build a sunburst chart with 4-level hierarchy:
    Indonesia -> Pulau -> Provinsi -> Kab/Kota.
    Clickable, drilldown, zoomable, color=IPM.
    """
    df_plot = df.copy()
    from utils.data_loader import PALETTE_IPM, ISLAND_GROUP_MAP

    if "island" not in df_plot.columns:
        df_plot["island"] = df_plot.get("province", pd.Series(dtype=str)).map(ISLAND_GROUP_MAP).fillna("Lainnya")

    use_size = size_col in df_plot.columns and df_plot[size_col].notna().any()
    if not use_size:
        df_plot["_count"] = 1
        actual_size = "_count"
        size_note = "(Ukuran = Jumlah Wilayah)"
    else:
        actual_size = size_col
        df_plot[actual_size] = df_plot[actual_size].fillna(df_plot[actual_size].median())
        size_note = "(Ukuran ∝ Jumlah Penduduk)"

    df_plot["_root"] = "Indonesia"
    path_cols = ["_root", "island", "province", "region"]
    path_cols = [c for c in path_cols if c in df_plot.columns]

    fig = px.sunburst(
        df_plot,
        path=path_cols,
        values=actual_size,
        color=color_col if color_col in df_plot.columns else None,
        color_continuous_scale=PALETTE_IPM,
        height=height,
    )

    fig.update_traces(
        textfont_size=11,
        hovertemplate=(
            "<b>%{label}</b><br>"
            "Penduduk: %{value:,.0f} jiwa<br>"
            "IPM: %{color:.2f}<br>"
            "<extra></extra>"
        ),
        insidetextorientation="radial",
        leaf=dict(opacity=0.88),
    )

    fig.update_layout(
        title=dict(
            text=f"Diagram Matahari (Sunburst) — Struktur 4 Tingkat {size_note}",
            font=dict(size=15, color="#17252A"),
        ),
        margin=dict(l=0, r=0, t=50, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
        coloraxis_colorbar=dict(
            title=dict(text="IPM", side="right"),
            thickness=14,
            len=0.6,
            tickfont=dict(size=11, color="#17252A"),
        ),
    )

    return fig


def build_province_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate to province level for hierarchical summaries.
    """
    group_cols = ["island", "province"]
    group_cols = [c for c in group_cols if c in df.columns]
    
    agg_map = {}
    for col in ["ipm", "poverty", "uhh", "hls", "rls", "pc1", "pc2"]:
        if col in df.columns:
            agg_map[col] = "mean"
    if "population" in df.columns:
        agg_map["population"] = "sum"
    if "region" in df.columns:
        agg_map["region"] = "count"
    
    if not group_cols or not agg_map:
        return pd.DataFrame()
    
    summary = df.groupby(group_cols).agg(agg_map).reset_index()
    if "region" in summary.columns:
        summary = summary.rename(columns={"region": "n_kab_kota"})
    
    return summary
