"""
analytics.py — Statistical calculations and advanced visualizations:
- Distribution plot with Q1, Median, Q3, and selected region positioning
- Ranking plot (Top 10 / Bottom 10 lollipop / bar)
- Relationship scatterplot with trendline and association disclaimer
- Correlation heatmap (diverging purple - neutral - orange, centered at 0)
- Within-province variation range plot (Min — Median — Max for all 38 provinces)
- Algorithmic IPM Twin Finder (IPM tolerance + standardized PCA Euclidean distance)
- Data-driven automated narrative generation engine
"""

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from typing import Optional, Tuple, Dict, Any, List

from utils.data_loader import (
    COLOR_BG, COLOR_SURFACE, COLOR_TEXT, COLOR_SECONDARY, COLOR_BORDER,
    COLOR_ACCENT_TEAL, COLOR_ACCENT_ORANGE,
    PALETTE_IPM, PALETTE_POVERTY, PALETTE_PCA
)


# ---------------------------------------------------------------------------
# 1. DISTRIBUTION PLOT (Section 9)
# ---------------------------------------------------------------------------
def build_distribution_plot(
    df: pd.DataFrame,
    selected_region: Optional[str] = None,
    indicator: str = "ipm",
    height: int = 420,
) -> Tuple[go.Figure, Dict[str, Any]]:
    """
    Build a rich distribution plot (Histogram + Boxplot overlay) with explicit
    markers for Q1, Median, Q3, and the currently selected region.
    Returns the Plotly figure and summary stats dict.
    """
    df_clean = df.dropna(subset=[indicator]).copy()
    vals = df_clean[indicator]

    # Calculate statistics
    val_min = float(vals.min())
    val_max = float(vals.max())
    val_mean = float(vals.mean())
    val_median = float(vals.median())
    val_q1 = float(vals.quantile(0.25))
    val_q3 = float(vals.quantile(0.75))
    val_iqr = val_q3 - val_q1

    stats = {
        "min": val_min,
        "max": val_max,
        "mean": val_mean,
        "median": val_median,
        "q1": val_q1,
        "q3": val_q3,
        "iqr": val_iqr,
    }

    # Selected region value
    sel_val = None
    sel_prov = ""
    sel_rank = None
    sel_pct = None
    if selected_region and "region" in df_clean.columns:
        match = df_clean[df_clean["region"] == selected_region]
        if not match.empty:
            sel_val = float(match.iloc[0][indicator])
            sel_prov = match.iloc[0].get("province", "")
            sel_pct = float((vals <= sel_val).mean() * 100)
            sel_rank = int((vals > sel_val).sum() + 1)
            stats["selected"] = {
                "region": selected_region,
                "province": sel_prov,
                "value": sel_val,
                "percentile": sel_pct,
                "rank": sel_rank,
            }

    fig = go.Figure()

    # Histogram
    fig.add_trace(go.Histogram(
        x=vals,
        nbinsx=35,
        marker=dict(
            color=COLOR_ACCENT_TEAL,
            line=dict(color=COLOR_SURFACE, width=1),
            opacity=0.75,
        ),
        name="Kabupaten/Kota",
        hovertemplate="Rentang: %{x}<br>Jumlah: %{y} kab/kota<extra></extra>",
    ))

    # Reference lines for Q1, Median, Q3
    fig.add_vline(
        x=val_median,
        line_width=2.5,
        line_dash="solid",
        line_color=COLOR_TEXT,
        annotation_text=f"Median: {val_median:.2f}",
        annotation_position="top left",
        annotation_font=dict(size=11, color=COLOR_TEXT),
    )

    fig.add_vline(
        x=val_q1,
        line_width=1.5,
        line_dash="dot",
        line_color=COLOR_SECONDARY,
        annotation_text=f"Q1: {val_q1:.2f}",
        annotation_position="bottom left",
        annotation_font=dict(size=10, color=COLOR_SECONDARY),
    )

    fig.add_vline(
        x=val_q3,
        line_width=1.5,
        line_dash="dot",
        line_color=COLOR_SECONDARY,
        annotation_text=f"Q3: {val_q3:.2f}",
        annotation_position="bottom right",
        annotation_font=dict(size=10, color=COLOR_SECONDARY),
    )

    # Highlight selected region
    if sel_val is not None:
        fig.add_vline(
            x=sel_val,
            line_width=3,
            line_dash="dash",
            line_color=COLOR_ACCENT_ORANGE,
            annotation_text=f"{selected_region}: {sel_val:.2f}",
            annotation_position="top right",
            annotation_font=dict(size=12, color=COLOR_ACCENT_ORANGE),
        )

    # Indikator labels
    label_map = {
        "ipm": "Indeks Pembangunan Manusia (IPM)",
        "poverty": "Persentase Penduduk Miskin (P0 %)",
        "uhh": "Umur Harapan Hidup (tahun)",
        "hls": "Harapan Lama Sekolah (tahun)",
        "rls": "Rata-rata Lama Sekolah (tahun)",
        "expenditure": "Pengeluaran per Kapita Disesuaikan (ribu Rp/tahun)",
        "tpt": "Tingkat Pengangguran Terbuka (%)",
    }
    x_label = label_map.get(indicator, indicator.upper())

    fig.update_layout(
        title=dict(
            text=f"Distribusi {x_label} Kabupaten/Kota Indonesia (N=514)",
            font=dict(size=15, color=COLOR_TEXT),
        ),
        xaxis=dict(
            title=dict(text=x_label, font=dict(size=12, color=COLOR_TEXT)),
            gridcolor="rgba(217, 222, 220, 0.4)",
            zeroline=False,
        ),
        yaxis=dict(
            title=dict(text="Frekuensi (Jumlah Wilayah)", font=dict(size=12, color=COLOR_TEXT)),
            gridcolor="rgba(217, 222, 220, 0.4)",
        ),
        height=height,
        margin=dict(l=40, r=40, t=50, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        bargap=0.08,
        showlegend=False,
    )

    return fig, stats


# ---------------------------------------------------------------------------
# 2. RANKING PLOT (Section 10)
# ---------------------------------------------------------------------------
def build_ranking_plot(
    df: pd.DataFrame,
    indicator: str = "ipm",
    mode: str = "top",
    top_n: int = 10,
    height: int = 380,
) -> go.Figure:
    """
    Build horizontal bar/lollipop ranking chart for Top 10 or Bottom 10 regions.
    Prevents rendering all 514 bars, focusing on meaningful contrast.
    """
    df_clean = df.dropna(subset=[indicator, "region"]).copy()

    ascending = (mode == "bottom")
    df_sorted = df_clean.sort_values(by=indicator, ascending=ascending).head(top_n)

    # For horizontal display, reverse so highest rank is at top
    df_display = df_sorted.iloc[::-1]

    bar_color = COLOR_ACCENT_TEAL if mode == "top" else COLOR_ACCENT_ORANGE
    title_mode = "10 Kabupaten/Kota Tertinggi" if mode == "top" else "10 Kabupaten/Kota Terendah"

    label_map = {
        "ipm": "IPM",
        "poverty": "Kemiskinan P0 (%)",
        "uhh": "UHH (tahun)",
        "hls": "HLS (tahun)",
        "rls": "RLS (tahun)",
        "expenditure": "Pengeluaran (ribu Rp)",
        "tpt": "TPT (%)",
    }
    short_lbl = label_map.get(indicator, indicator.upper())

    y_labels = [f"{r['region']} ({r.get('province', '')})" for _, r in df_display.iterrows()]

    fig = go.Figure()

    fig.add_trace(go.Bar(
        x=df_display[indicator],
        y=y_labels,
        orientation="h",
        marker=dict(
            color=bar_color,
            line=dict(color=COLOR_TEXT, width=1),
            opacity=0.85,
        ),
        text=[f"{v:.2f}" for v in df_display[indicator]],
        textposition="outside",
        textfont=dict(size=11, color=COLOR_TEXT),
        hovertemplate="<b>%{y}</b><br>" + short_lbl + ": %{x:.2f}<extra></extra>",
    ))

    fig.update_layout(
        title=dict(
            text=f"{title_mode} — {short_lbl}",
            font=dict(size=14, color=COLOR_TEXT),
        ),
        xaxis=dict(
            title=dict(text=short_lbl, font=dict(size=11, color=COLOR_TEXT)),
            gridcolor="rgba(217, 222, 220, 0.4)",
            zeroline=False,
        ),
        yaxis=dict(
            tickfont=dict(size=11, color=COLOR_TEXT),
        ),
        height=height,
        margin=dict(l=10, r=60, t=40, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        showlegend=False,
    )

    return fig


# ---------------------------------------------------------------------------
# 3. INTERACTIVE SCATTERPLOT (Section 15)
# ---------------------------------------------------------------------------
def build_scatterplot(
    df: pd.DataFrame,
    x_col: str = "poverty",
    y_col: str = "ipm",
    selected_region: Optional[str] = None,
    color_by: str = "island",
    height: int = 500,
) -> go.Figure:
    """
    Build an interactive scatterplot between any two numerical variables,
    with OLS trendline, clear axis units, and association disclaimer.
    """
    df_clean = df.dropna(subset=[x_col, y_col]).copy()

    indicator_labels = {
        "ipm": "IPM (0–100)",
        "poverty": "Persentase Penduduk Miskin / P0 (%)",
        "uhh": "Umur Harapan Hidup / UHH (tahun)",
        "hls": "Harapan Lama Sekolah / HLS (tahun)",
        "rls": "Rata-rata Lama Sekolah / RLS (tahun)",
        "expenditure": "Pengeluaran per Kapita (ribu Rp/tahun)",
        "log_expenditure": "ln(Pengeluaran per Kapita)",
        "tpt": "Tingkat Pengangguran Terbuka / TPT (%)",
        "tpak_male": "TPAK Laki-laki (%)",
        "tpak_female": "TPAK Perempuan (%)",
        "ikk": "Indeks Kemahalan Konstruksi (IKK)",
        "population": "Jumlah Penduduk (jiwa)",
        "pc1": "Skor PC1 (Dimensi 1)",
        "pc2": "Skor PC2 (Dimensi 2)",
    }

    x_title = indicator_labels.get(x_col, x_col)
    y_title = indicator_labels.get(y_col, y_col)

    # Calculate Pearson correlation
    corr_r = df_clean[x_col].corr(df_clean[y_col])

    # Fit linear regression manually for clean display
    x_vals = df_clean[x_col].values
    y_vals = df_clean[y_col].values
    slope, intercept = np.polyfit(x_vals, y_vals, 1)
    line_x = np.linspace(x_vals.min(), x_vals.max(), 100)
    line_y = slope * line_x + intercept

    fig = go.Figure()

    # OLS Trendline
    fig.add_trace(go.Scatter(
        x=line_x,
        y=line_y,
        mode="lines",
        line=dict(color=COLOR_TEXT, width=2, dash="dash"),
        name=f"Tren Asosiasi (r={corr_r:.3f})",
        hoverinfo="skip",
    ))

    # Scatter points
    hover_texts = []
    for _, row in df_clean.iterrows():
        reg = row.get("region", "")
        prv = row.get("province", "")
        xv = row.get(x_col, np.nan)
        yv = row.get(y_col, np.nan)
        ipm_v = row.get("ipm", np.nan)
        hover_texts.append(
            f"<b>{reg}</b> ({prv})<br>"
            f"{x_title}: {xv:.2f}<br>"
            f"{y_title}: {yv:.2f}<br>"
            f"IPM: {ipm_v:.2f}"
        )
    df_clean["_hover"] = hover_texts

    # Check color grouping
    if color_by == "island" and "island" in df_clean.columns:
        islands = df_clean["island"].unique()
        color_palette = [
            "#176B67", "#D97745", "#2B6CB0", "#6C5B8C",
            "#C53030", "#319795", "#B7791F", "#718096"
        ]
        for i, isl in enumerate(sorted(islands)):
            sub = df_clean[df_clean["island"] == isl]
            fig.add_trace(go.Scatter(
                x=sub[x_col],
                y=sub[y_col],
                mode="markers",
                marker=dict(
                    size=7,
                    color=color_palette[i % len(color_palette)],
                    opacity=0.75,
                    line=dict(width=0.4, color=COLOR_SURFACE),
                ),
                text=sub["_hover"],
                hovertemplate="%{text}<extra></extra>",
                name=isl,
            ))
    else:
        fig.add_trace(go.Scatter(
            x=df_clean[x_col],
            y=df_clean[y_col],
            mode="markers",
            marker=dict(
                size=7,
                color=COLOR_ACCENT_TEAL,
                opacity=0.75,
                line=dict(width=0.4, color=COLOR_SURFACE),
            ),
            text=df_clean["_hover"],
            hovertemplate="%{text}<extra></extra>",
            name="Kabupaten/Kota",
        ))

    # Highlight selected region
    if selected_region and "region" in df_clean.columns:
        sel_row = df_clean[df_clean["region"] == selected_region]
        if not sel_row.empty:
            sr = sel_row.iloc[0]
            fig.add_trace(go.Scatter(
                x=[sr[x_col]],
                y=[sr[y_col]],
                mode="markers+text",
                marker=dict(
                    color=COLOR_ACCENT_ORANGE,
                    size=15,
                    symbol="star",
                    line=dict(color=COLOR_TEXT, width=1.8),
                ),
                text=[selected_region],
                textposition="top center",
                textfont=dict(size=12, color=COLOR_TEXT, family="Inter"),
                name=f"Fokus: {selected_region}",
                hovertemplate=sr["_hover"] + "<extra></extra>",
            ))

    fig.update_layout(
        title=dict(
            text=f"Hubungan antara {x_title} dan {y_title} (r = {corr_r:+.3f})",
            font=dict(size=15, color=COLOR_TEXT),
        ),
        xaxis=dict(
            title=dict(text=x_title, font=dict(size=12, color=COLOR_TEXT)),
            gridcolor="rgba(217, 222, 220, 0.4)",
        ),
        yaxis=dict(
            title=dict(text=y_title, font=dict(size=12, color=COLOR_TEXT)),
            gridcolor="rgba(217, 222, 220, 0.4)",
        ),
        height=height,
        margin=dict(l=50, r=30, t=50, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            font=dict(size=10),
        ),
    )

    return fig


# ---------------------------------------------------------------------------
# 4. CORRELATION HEATMAP (Section 16)
# ---------------------------------------------------------------------------
def build_correlation_heatmap(
    df: pd.DataFrame,
    cols: Optional[List[str]] = None,
    height: int = 500,
) -> go.Figure:
    """
    Build a correlation heatmap of all key numerical variables.
    Palette: Purple (#6C5B8C) <- Neutral (#F2F0EC) -> Orange (#D97745), centered at 0.
    """
    default_cols = [
        "ipm", "poverty", "uhh", "hls", "rls",
        "log_expenditure", "tpt", "tpak_male", "tpak_female", "ikk", "pc1", "pc2"
    ]
    use_cols = [c for c in (cols or default_cols) if c in df.columns]

    label_map = {
        "ipm": "IPM",
        "poverty": "Kemiskinan P0",
        "uhh": "UHH",
        "hls": "HLS",
        "rls": "RLS",
        "log_expenditure": "ln(Pengeluaran)",
        "tpt": "TPT",
        "tpak_male": "TPAK Laki",
        "tpak_female": "TPAK Perempuan",
        "ikk": "IKK",
        "pc1": "PC1",
        "pc2": "PC2",
        "population": "Penduduk",
    }
    short_labels = [label_map.get(c, c) for c in use_cols]

    corr_df = df[use_cols].corr()

    # Diverging color scale: purple <- neutral -> orange
    heatmap_scale = [
        [0.0, "#6C5B8C"],
        [0.5, "#F2F0EC"],
        [1.0, "#D97745"],
    ]

    fig = go.Figure(data=go.Heatmap(
        z=corr_df.values,
        x=short_labels,
        y=short_labels,
        zmin=-1.0,
        zmax=1.0,
        colorscale=heatmap_scale,
        colorbar=dict(
            title=dict(text="Korelasi (r)", side="right"),
            thickness=14,
            len=0.75,
            tickvals=[-1, -0.5, 0, 0.5, 1],
        ),
        text=[[f"{v:+.2f}" for v in row] for row in corr_df.values],
        texttemplate="%{text}",
        textfont=dict(size=10, color=COLOR_TEXT),
        hovertemplate="Variabel X: %{x}<br>Variabel Y: %{y}<br>Korelasi Pearson (r): %{z:+.3f}<extra></extra>",
    ))

    fig.update_layout(
        title=dict(
            text="Matriks Korelasi Indikator Sosial-Ekonomi (N=514)",
            font=dict(size=15, color=COLOR_TEXT),
        ),
        xaxis=dict(tickangle=-35, tickfont=dict(size=11, color=COLOR_TEXT)),
        yaxis=dict(tickfont=dict(size=11, color=COLOR_TEXT)),
        height=height,
        margin=dict(l=60, r=20, t=50, b=60),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
    )

    return fig


# ---------------------------------------------------------------------------
# 5. WITHIN-PROVINCE VARIATION (Section 24)
# ---------------------------------------------------------------------------
def build_province_variation_plot(
    df: pd.DataFrame,
    indicator: str = "ipm",
    height: int = 700,
) -> go.Figure:
    """
    Build a Min — Median — Max range plot for all 38 provinces.
    Highlights internal provincial disparity (range between highest & lowest kab/kota).
    """
    df_clean = df.dropna(subset=[indicator, "province"]).copy()

    # Group by province
    agg_df = df_clean.groupby("province").agg(
        val_min=(indicator, "min"),
        val_median=(indicator, "median"),
        val_max=(indicator, "max"),
        count=("region", "count"),
        island=("island", "first"),
    ).reset_index()

    agg_df["range"] = agg_df["val_max"] - agg_df["val_min"]
    # Sort by median for clear analytical hierarchy
    agg_df = agg_df.sort_values(by="val_median", ascending=True)

    fig = go.Figure()

    # Horizontal bar / line representing min to max range
    for _, row in agg_df.iterrows():
        fig.add_trace(go.Scatter(
            x=[row["val_min"], row["val_max"]],
            y=[row["province"], row["province"]],
            mode="lines",
            line=dict(color=COLOR_BORDER, width=4),
            hoverinfo="skip",
            showlegend=False,
        ))

    # Min points
    fig.add_trace(go.Scatter(
        x=agg_df["val_min"],
        y=agg_df["province"],
        mode="markers",
        marker=dict(size=7, color=COLOR_ACCENT_ORANGE, symbol="circle"),
        name="Minimum Kab/Kota",
        hovertemplate="Provinsi: %{y}<br>Min: %{x:.2f}<extra></extra>",
    ))

    # Max points
    fig.add_trace(go.Scatter(
        x=agg_df["val_max"],
        y=agg_df["province"],
        mode="markers",
        marker=dict(size=7, color=COLOR_ACCENT_TEAL, symbol="circle"),
        name="Maksimum Kab/Kota",
        hovertemplate="Provinsi: %{y}<br>Maks: %{x:.2f}<extra></extra>",
    ))

    # Median points
    fig.add_trace(go.Scatter(
        x=agg_df["val_median"],
        y=agg_df["province"],
        mode="markers",
        marker=dict(size=9, color=COLOR_TEXT, symbol="diamond"),
        name="Median Provinsi",
        hovertemplate="Provinsi: %{y}<br>Median: %{x:.2f}<br>Rentang: %{customdata:.2f}<extra></extra>",
        customdata=agg_df["range"],
    ))

    label_map = {
        "ipm": "IPM",
        "poverty": "Kemiskinan P0 (%)",
        "uhh": "UHH (tahun)",
        "rls": "RLS (tahun)",
    }
    lbl = label_map.get(indicator, indicator.upper())

    fig.update_layout(
        title=dict(
            text=f"Variasi Internal Provinsi — Rentang Nilai {lbl} (Min — Median — Maks)",
            font=dict(size=15, color=COLOR_TEXT),
        ),
        xaxis=dict(
            title=dict(text=lbl, font=dict(size=12, color=COLOR_TEXT)),
            gridcolor="rgba(217, 222, 220, 0.4)",
        ),
        yaxis=dict(
            tickfont=dict(size=10, color=COLOR_TEXT),
        ),
        height=height,
        margin=dict(l=140, r=30, t=50, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.01,
            xanchor="right",
            x=1,
            font=dict(size=10),
        ),
    )

    return fig


# ---------------------------------------------------------------------------
# 6. ALGORITHMIC IPM TWIN FINDER (Section 23)
# ---------------------------------------------------------------------------
def find_ipm_twins(
    df: pd.DataFrame,
    ref_region: str,
    tolerance: float = 0.5,
    sort_by: str = "pca",
) -> Tuple[Optional[pd.Series], pd.DataFrame]:
    """
    Search for algorithmic twin candidates of ref_region with IPM within +-tolerance.
    Calculates standardized Euclidean distance in PCA space:
      d = sqrt( ((PC1_cand - PC1_ref)/std_PC1)^2 + ((PC2_cand - PC2_ref)/std_PC2)^2 )
    Returns (ref_row, candidates_df).
    """
    df_clean = df.copy()
    match = df_clean[df_clean["region"] == ref_region]
    if match.empty:
        # Flexible match for prefixes like Kab., Kota, etc.
        norm_ref = ref_region.lower().replace("kab.", "").replace("kabupaten", "").replace("kota", "").strip()
        match = df_clean[df_clean["region"].str.lower().str.replace("kab.", "").str.replace("kabupaten", "").str.replace("kota", "").str.strip() == norm_ref]
    if match.empty:
        norm_ref = ref_region.lower().replace("kab.", "").replace("kabupaten", "").replace("kota", "").strip()
        match = df_clean[df_clean["region"].str.contains(norm_ref, case=False, na=False)]
    if match.empty:
        return None, pd.DataFrame()

    ref = match.iloc[0]
    actual_ref_region = ref["region"]
    ref_ipm = ref["ipm"]
    ref_pc1 = ref["pc1"]
    ref_pc2 = ref["pc2"]

    # Filter candidates
    candidates = df_clean[
        (df_clean["region"] != actual_ref_region) &
        (df_clean["ipm"].between(ref_ipm - tolerance, ref_ipm + tolerance))
    ].copy()

    if candidates.empty:
        return ref, candidates

    # Standardized PCA distance
    pc1_sd = df_clean["pc1"].std() or 1.0
    pc2_sd = df_clean["pc2"].std() or 1.0

    candidates["pca_distance"] = np.sqrt(
        ((candidates["pc1"] - ref_pc1) / pc1_sd) ** 2 +
        ((candidates["pc2"] - ref_pc2) / pc2_sd) ** 2
    )

    candidates["ipm_diff"] = abs(candidates["ipm"] - ref_ipm)

    # Classify contrast
    p75 = candidates["pca_distance"].quantile(0.75)
    p90 = candidates["pca_distance"].quantile(0.90)

    def _classify(dist):
        if dist >= p90:
            return "Kontras Sangat Tinggi ↑↑", "twin-contrast-high"
        elif dist >= p75:
            return "Kontras Tinggi ↑", "twin-contrast-med"
        else:
            return "Profil Cenderung Serupa", "twin-contrast-low"

    classifications = [_classify(d) for d in candidates["pca_distance"]]
    candidates["contrast_label"] = [c[0] for c in classifications]
    candidates["contrast_class"] = [c[1] for c in classifications]

    if sort_by == "pca":
        candidates = candidates.sort_values(by="pca_distance", ascending=False)
    else:
        candidates = candidates.sort_values(by="ipm_diff", ascending=True)

    return ref, candidates


# ---------------------------------------------------------------------------
# 7. AUTOMATIC DATA-DRIVEN NARRATIVE ENGINE (Section 27)
# ---------------------------------------------------------------------------
def get_region_narrative(row: pd.Series, df: pd.DataFrame) -> Dict[str, str]:
    """
    Generate accurate data-driven narrative strictly from calculated quantiles and medians.
    No LLM, no hallucinated statements.
    """
    region = row.get("region", "")
    prov = row.get("province", "")
    ipm_val = row.get("ipm", np.nan)
    p0_val = row.get("poverty", np.nan)
    pc1_val = row.get("pc1", np.nan)
    pc2_val = row.get("pc2", np.nan)

    ipm_median = df["ipm"].median()
    p0_median = df["poverty"].median()
    p0_q3 = df["poverty"].quantile(0.75)
    ipm_pct = (df["ipm"] <= ipm_val).mean() * 100

    # IPM text
    if ipm_val >= ipm_median:
        ipm_pos = f"berada di atas median kabupaten/kota Indonesia ({ipm_median:.2f}), menduduki persentil ke-{ipm_pct:.1f}%"
    else:
        ipm_pos = f"berada di bawah median kabupaten/kota Indonesia ({ipm_median:.2f}), menduduki persentil ke-{ipm_pct:.1f}%"

    # Poverty text
    if p0_val >= p0_q3:
        pov_pos = f"tergolong kuartil tertinggi (relatif tinggi) sebesar {p0_val:.2f}% (Q3 nasional = {p0_q3:.2f}%)"
    elif p0_val >= p0_median:
        pov_pos = f"berada di atas median nasional ({p0_median:.2f}%) sebesar {p0_val:.2f}%"
    else:
        pov_pos = f"berada di bawah median nasional ({p0_median:.2f}%) sebesar {p0_val:.2f}%"

    # PCA position text
    pc1_dir = "positif (kapasitas pembangunan manusia relatif kuat)" if pc1_val >= 0 else "negatif (kapasitas pembangunan manusia menghadapi tantangan)"
    pc2_dir = "positif (didominasi partisipasi angkatan kerja tinggi)" if pc2_val >= 0 else "negatif (karakteristik pasar kerja dengan pengangguran/partisipasi lebih rendah)"

    narrative = {
        "ipm_narrative": f"Kabupaten/Kota {region} ({prov}) memiliki IPM sebesar {ipm_val:.2f}, yang {ipm_pos}.",
        "poverty_narrative": f"Tingkat kemiskinan (P0) wilayah ini {pov_pos}.",
        "pca_narrative": f"Dalam ruang PCA, skor PC1 bernilai {pc1_val:+.3f} ({pc1_dir}) dan skor PC2 bernilai {pc2_val:+.3f} ({pc2_dir}). Posisi ini mendeskripsikan koordinat relatif wilayah, bukan vonis mutlak.",
    }

    return narrative


# ---------------------------------------------------------------------------
# 8. REGION COMPARISON BAR CHART (Section 12 Master Prompt)
# ---------------------------------------------------------------------------
def build_region_comparison_chart(
    df: pd.DataFrame,
    reg1_name: str,
    reg2_name: str,
    height: int = 420,
) -> go.Figure:
    """
    Build a comparative horizontal bar chart comparing two regions across
    8 key dimensions standardized to z-scores, with actual values displayed as labels.
    """
    r1_df = df[df["region"] == reg1_name]
    r2_df = df[df["region"] == reg2_name]

    if r1_df.empty or r2_df.empty:
        fig = go.Figure()
        fig.add_annotation(text="Pilih dua wilayah yang valid untuk menampilkan grafik perbandingan.",
                           xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
        return fig

    r1 = r1_df.iloc[0]
    r2 = r2_df.iloc[0]

    indicators = [
        ("ipm", "IPM (Indeks)", ""),
        ("uhh", "UHH (Kesehatan)", "thn"),
        ("hls", "HLS (Sekolah)", "thn"),
        ("rls", "RLS (Pendidikan)", "thn"),
        ("log_expenditure", "ln(Pengeluaran)", ""),
        ("poverty", "P0 (Kemiskinan)*", "%"),
        ("tpt", "TPT (Pengangguran)*", "%"),
        ("pc2", "PC2 (Angkatan Kerja)", ""),
    ]

    labels = []
    z1_vals = []
    z2_vals = []
    txt1 = []
    txt2 = []

    for col, lbl, unit in indicators:
        if col in df.columns:
            m = df[col].mean()
            s = df[col].std()
            val1 = r1[col]
            val2 = r2[col]
            z1 = (val1 - m) / s if s > 0 else 0
            z2 = (val2 - m) / s if s > 0 else 0

            # Raw actual text formatting
            if col == "log_expenditure":
                disp1 = f"Rp {r1['expenditure']:,.0f}rb"
                disp2 = f"Rp {r2['expenditure']:,.0f}rb"
            elif col in ["poverty", "tpt"]:
                disp1 = f"{val1:.1f}%"
                disp2 = f"{val2:.1f}%"
            elif col == "ipm":
                disp1 = f"{val1:.2f}"
                disp2 = f"{val2:.2f}"
            else:
                disp1 = f"{val1:.2f}{unit}"
                disp2 = f"{val2:.2f}{unit}"

            labels.append(lbl)
            z1_vals.append(z1)
            z2_vals.append(z2)
            txt1.append(disp1)
            txt2.append(disp2)

    fig = go.Figure()

    fig.add_trace(go.Bar(
        y=labels,
        x=z1_vals,
        name=f"Fokus: {reg1_name}",
        orientation="h",
        marker=dict(color=COLOR_ACCENT_TEAL, opacity=0.9),
        text=txt1,
        textposition="auto",
        textfont=dict(size=11, color="#FFFFFF"),
        hovertemplate=f"<b>%{{y}}</b><br>{reg1_name}: %{{text}} (z-score: %{{x:+.2f}})<extra></extra>",
    ))

    fig.add_trace(go.Bar(
        y=labels,
        x=z2_vals,
        name=f"Pembanding: {reg2_name}",
        orientation="h",
        marker=dict(color=COLOR_ACCENT_ORANGE, opacity=0.9),
        text=txt2,
        textposition="auto",
        textfont=dict(size=11, color="#FFFFFF"),
        hovertemplate=f"<b>%{{y}}</b><br>{reg2_name}: %{{text}} (z-score: %{{x:+.2f}})<extra></extra>",
    ))

    fig.add_vline(x=0, line_color="#17252A", line_width=1.2, line_dash="dash")

    fig.update_layout(
        barmode="group",
        height=height,
        title=dict(
            text=f"Profil Komparatif Standar (z-score): {reg1_name} vs {reg2_name}",
            font=dict(size=15, color="#17252A"),
        ),
        xaxis=dict(
            title="Skor Relatif Terhadap Rata-Rata Nasional (z-score)",
            gridcolor="rgba(217, 222, 220, 0.4)",
            zeroline=False,
        ),
        yaxis=dict(autorange="reversed"),
        legend=dict(
            orientation="h",
            yanchor="bottom", y=1.02,
            xanchor="right", x=1,
            font=dict(size=11),
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        margin=dict(l=20, r=20, t=50, b=40),
    )

    return fig

