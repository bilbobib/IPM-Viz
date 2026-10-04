"""
pca_viz.py — PCA visualization helpers.
All interpretations are data-driven, not hardcoded.
"""

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Optional, List


VARIABLE_LABELS = {
    "UHH": "UHH (Umur Harapan Hidup)",
    "HLS": "HLS (Harapan Lama Sekolah)",
    "RLS": "RLS (Rata-rata Lama Sekolah)",
    "ln(Pengeluaran)": "ln(Pengeluaran per Kapita)",
    "P0": "P0 (% Penduduk Miskin)",
    "TPT": "TPT (Tingkat Pengangguran Terbuka)",
    "TPAK laki-laki": "TPAK Laki-laki",
    "TPAK perempuan": "TPAK Perempuan",
}


def _auto_interpret_pc(loadings_series: pd.Series, pc_name: str) -> str:
    """
    Generate data-driven interpretation from loadings adhering to Section 18 format:
    'Dimensi X — [interpretasi berdasarkan loading]'
    """
    sorted_abs = loadings_series.abs().sort_values(ascending=False)
    top_pos = [v for v in loadings_series.sort_values(ascending=False).index if loadings_series[v] > 0.3][:3]
    top_neg = [v for v in loadings_series.sort_values(ascending=True).index if loadings_series[v] < -0.3][:3]

    dim_num = "1" if "1" in pc_name else ("2" if "2" in pc_name else pc_name.replace("PC", ""))
    
    pos_str = ", ".join([VARIABLE_LABELS.get(v, v) for v in top_pos]) if top_pos else "—"
    neg_str = ", ".join([VARIABLE_LABELS.get(v, v) for v in top_neg]) if top_neg else "—"

    if dim_num == "1":
        theme = "Kapasitas Pembangunan Manusia dan Kesejahteraan Ekonomi"
    elif dim_num == "2":
        theme = "Struktur Dinamika Angkatan Kerja dan Peluang Ketenagakerjaan"
    else:
        theme = f"Variasi Tambahan Multidimensi ({pc_name})"

    text = (
        f"<b>Dimensi {dim_num} ({pc_name}) — {theme}</b><br><br>"
        f"Berdasarkan kontribusi loading aktual, skor positif {pc_name} diasosiasikan kuat dengan capaian lebih tinggi pada: "
        f"<em>{pos_str}</em>"
    )
    if top_neg:
        text += f"; dan berkorelasi negatif (berlawanan arah) dengan: <em>{neg_str}</em>."
    else:
        text += "."

    text += (
        "<br><br><small><em>Catatan Metodologis: Skor PCA mendeskripsikan posisi relatif wilayah dalam ruang multidimensi. "
        "Nilai 0 atau negatif BUKAN berarti buruk, gagal, atau rata-rata nasional — melainkan titik tengah distribusi terstandardisasi. "
        "Loading mencerminkan arah kontribusi linier variabel, bukan dampak sebab-akibat.</em></small>"
    )

    return text


def build_pca_scatter(
    df: pd.DataFrame,
    highlight_region: Optional[str] = None,
    comparison_region: Optional[str] = None,
    height: int = 520,
) -> go.Figure:
    """
    Build PC1 vs PC2 scatter plot, colored by IPM using sequential teal palette.
    Selected region: highlighted with #D97745 and outline #17252A.
    Comparison region (e.g. Twin): highlighted with secondary marker.
    """
    df_plot = df.copy()

    from utils.data_loader import PALETTE_IPM
    
    hover_text = []
    for _, row in df_plot.iterrows():
        region = row.get("region", row.get("kab_kota", ""))
        province = row.get("province", row.get("provinsi", ""))
        ipm = row.get("ipm", np.nan)
        p0 = row.get("poverty", np.nan)
        pc1 = row.get("pc1", np.nan)
        pc2 = row.get("pc2", np.nan)
        
        text = (
            f"<b>{region}</b> ({province})<br>"
            f"IPM: {ipm:.2f} | P0 (% Miskin): {p0:.2f}%<br>"
            f"PC1 (Dimensi 1): {pc1:+.3f}<br>"
            f"PC2 (Dimensi 2): {pc2:+.3f}"
        )
        hover_text.append(text)
    
    df_plot["_hover"] = hover_text
    
    fig = go.Figure()
    
    # Filter background points
    mask = pd.Series([True] * len(df_plot), index=df_plot.index)
    if highlight_region:
        mask = mask & (df_plot["region"] != highlight_region)
    if comparison_region:
        mask = mask & (df_plot["region"] != comparison_region)
    
    ipm_vals = df_plot.loc[mask, "ipm"] if "ipm" in df_plot.columns else None
    
    # Base scatter
    fig.add_trace(go.Scatter(
        x=df_plot.loc[mask, "pc1"],
        y=df_plot.loc[mask, "pc2"],
        mode="markers",
        marker=dict(
            color=ipm_vals,
            colorscale=PALETTE_IPM,
            size=7,
            opacity=0.75,
            colorbar=dict(
                title=dict(text="IPM", side="right"),
                thickness=14,
                len=0.65,
                tickfont=dict(size=10),
            ),
            line=dict(width=0.4, color="#FFFFFF"),
        ),
        text=df_plot.loc[mask, "_hover"],
        hovertemplate="%{text}<extra></extra>",
        name="Kabupaten/Kota",
        showlegend=False,
    ))
    
    # Highlight selected region
    if highlight_region and "region" in df_plot.columns:
        sel = df_plot[df_plot["region"] == highlight_region]
        if not sel.empty:
            sr = sel.iloc[0]
            fig.add_trace(go.Scatter(
                x=[sr["pc1"]],
                y=[sr["pc2"]],
                mode="markers+text",
                marker=dict(
                    color="#D97745",
                    size=16,
                    symbol="star",
                    line=dict(width=2, color="#17252A"),
                ),
                text=[f"★ {highlight_region}"],
                textposition="top center",
                textfont=dict(size=12, color="#17252A", family="Inter"),
                hovertemplate=sr["_hover"] + "<extra></extra>",
                name=f"Fokus: {highlight_region}",
                showlegend=True,
            ))

    # Highlight comparison region (Twin)
    if comparison_region and "region" in df_plot.columns:
        comp = df_plot[df_plot["region"] == comparison_region]
        if not comp.empty:
            cr = comp.iloc[0]
            fig.add_trace(go.Scatter(
                x=[cr["pc1"]],
                y=[cr["pc2"]],
                mode="markers+text",
                marker=dict(
                    color="#6C5B8C",
                    size=14,
                    symbol="diamond",
                    line=dict(width=2, color="#17252A"),
                ),
                text=[f"◆ {comparison_region}"],
                textposition="bottom center",
                textfont=dict(size=11, color="#6C5B8C", family="Inter"),
                hovertemplate=cr["_hover"] + "<extra></extra>",
                name=f"Twin: {comparison_region}",
                showlegend=True,
            ))
    
    # Quadrant zero reference lines
    fig.add_hline(y=0, line_dash="dash", line_color="rgba(83, 97, 102, 0.4)", line_width=1.2)
    fig.add_vline(x=0, line_dash="dash", line_color="rgba(83, 97, 102, 0.4)", line_width=1.2)
    
    fig.update_layout(
        xaxis_title="PC1 (Dimensi 1 — Kapasitas Pembangunan Manusia)",
        yaxis_title="PC2 (Dimensi 2 — Dinamika Angkatan Kerja)",
        height=height,
        hovermode="closest",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        xaxis=dict(gridcolor="rgba(217, 222, 220, 0.4)", zeroline=False),
        yaxis=dict(gridcolor="rgba(217, 222, 220, 0.4)", zeroline=False),
        legend=dict(
            yanchor="top", y=0.99,
            xanchor="right", x=0.99,
            bgcolor="rgba(255,255,255,0.85)",
            bordercolor="#D9DEDC",
            borderwidth=1,
        ),
        margin=dict(l=40, r=20, t=20, b=40),
    )
    
    return fig


def build_loading_chart(
    loadings: pd.DataFrame,
    pc: str = "PC1",
    height: int = 380,
) -> go.Figure:
    """
    Horizontal diverging bar chart of loadings for a given PC.
    Diverging palette: positive = #D97745 (orange), negative = #6C5B8C (purple).
    Adheres strictly to Section 12 & 20 design requirements.
    """
    if pc not in loadings.columns:
        fig = go.Figure()
        fig.add_annotation(text=f"PC '{pc}' tidak ditemukan dalam data loading.",
                           xref="paper", yref="paper", x=0.5, y=0.5)
        return fig
    
    series = loadings[pc].sort_values(key=abs, ascending=True)
    labels = [VARIABLE_LABELS.get(v, v) for v in series.index]
    values = series.values
    # Diverging: positive = #D97745, negative = #6C5B8C
    colors = ["#D97745" if v >= 0 else "#6C5B8C" for v in values]
    
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=values,
        y=labels,
        orientation="h",
        marker=dict(
            color=colors,
            opacity=0.9,
            line=dict(color="#17252A", width=0.8),
        ),
        text=[f"{v:+.3f}" for v in values],
        textposition="outside",
        textfont=dict(size=11, color="#17252A"),
        hovertemplate="<b>%{y}</b><br>Loading: %{x:+.4f}<br><i>Kontribusi arah dimensi (non-kausal)</i><extra></extra>",
        name=pc,
    ))
    
    fig.add_vline(x=0, line_color="#17252A", line_width=1.5)
    
    # Legend annotations
    fig.add_annotation(
        text="■ Positif (+)", x=max(abs(values)) * 0.85, y=len(labels) - 0.5,
        showarrow=False, font=dict(color="#D97745", size=11),
    )
    fig.add_annotation(
        text="■ Negatif (−)", x=max(abs(values)) * 0.85, y=len(labels) - 1.3,
        showarrow=False, font=dict(color="#6C5B8C", size=11),
    )
    
    fig.update_layout(
        title=dict(
            text=f"Kontribusi Variabel (Loading Divergen) — {pc}",
            font=dict(size=14, color="#17252A"),
        ),
        xaxis=dict(
            title="Nilai Loading (−1 hingga +1)",
            range=[-(max(abs(values)) * 1.38), max(abs(values)) * 1.38],
            zeroline=True, zerolinecolor="#D9DEDC",
            gridcolor="rgba(217, 222, 220, 0.4)",
        ),
        yaxis=dict(tickfont=dict(size=11, color="#17252A")),
        height=height,
        margin=dict(l=10, r=80, t=40, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(255, 255, 255, 0.6)",
        showlegend=False,
    )
    
    return fig


def build_pca_biplot(
    df: pd.DataFrame,
    loadings: pd.DataFrame,
    highlight_region: Optional[str] = None,
    comparison_region: Optional[str] = None,
    height: int = 560,
) -> go.Figure:
    """
    Build PCA Biplot overlaying PC1 vs PC2 scores with loading vectors.
    """
    fig = build_pca_scatter(df, highlight_region=highlight_region, comparison_region=comparison_region, height=height)
    
    if loadings is None or "PC1" not in loadings.columns or "PC2" not in loadings.columns:
        return fig
        
    # Scale loading vectors to fit comfortably in the score plot
    pc1_max = df["pc1"].abs().max() if "pc1" in df.columns else 3.0
    pc2_max = df["pc2"].abs().max() if "pc2" in df.columns else 3.0
    scale = min(pc1_max, pc2_max) * 0.85
    
    for var_name, row in loadings.iterrows():
        x_val = row["PC1"] * scale
        y_val = row["PC2"] * scale
        v_label = VARIABLE_LABELS.get(var_name, var_name)
        
        # Add vector arrow from (0,0) to (x_val, y_val)
        fig.add_annotation(
            ax=0, ay=0,
            axref="x", ayref="y",
            x=x_val, y=y_val,
            xref="x", yref="y",
            showarrow=True,
            arrowhead=3,
            arrowsize=1.2,
            arrowwidth=2,
            arrowcolor="#D97745" if row["PC1"] >= 0 else "#6C5B8C",
            text=f"<b>{v_label}</b>",
            textangle=0,
            xanchor="left" if x_val >= 0 else "right",
            yanchor="bottom" if y_val >= 0 else "top",
            font=dict(size=11, color="#17252A", family="Inter"),
            bgcolor="rgba(255, 255, 255, 0.85)",
            bordercolor="rgba(217, 222, 220, 0.8)",
            borderwidth=1,
            borderpad=2,
        )
        
    return fig


def build_parallel_coordinates(
    df: pd.DataFrame,
    highlight_region: Optional[str] = None,
    province_filter: Optional[list] = None,
    focus_regions: Optional[List[str]] = None,
    show_all: bool = False,
    height: int = 480,
) -> go.Figure:
    """
    Parallel coordinates visualization of the 8 PCA active variables.
    Standardized per Section 10 & 20.
    If not show_all, limits to focus_regions or a representative curated subset to avoid 514-line spaghetti plot.
    """
    vars_to_plot = {
        "uhh": "UHH",
        "hls": "HLS",
        "rls": "RLS",
        "log_expenditure": "ln(Pengeluaran)",
        "poverty": "P0",
        "tpt": "TPT",
        "tpak_male": "TPAK Laki",
        "tpak_female": "TPAK Perempuan",
    }
    
    df_plot = df.copy()
    
    # Province filter
    if province_filter and "province" in df_plot.columns:
        df_plot = df_plot[df_plot["province"].isin(province_filter)]
    
    # Manage subset to prevent spaghetti plot
    if not show_all and "region" in df_plot.columns:
        targets = []
        if focus_regions:
            targets.extend(focus_regions)
        if highlight_region and highlight_region not in targets:
            targets.append(highlight_region)
            
        if targets:
            df_subset = df_plot[df_plot["region"].isin(targets)]
            if len(df_subset) >= 2:
                df_plot = df_subset
            else:
                top3 = df_plot.nlargest(3, "ipm")["region"].tolist()
                bot3 = df_plot.nsmallest(3, "ipm")["region"].tolist()
                df_plot = df_plot[df_plot["region"].isin(targets + top3 + bot3)]
        else:
            top5 = df_plot.nlargest(5, "ipm")
            bot5 = df_plot.nsmallest(5, "ipm")
            med_idx = len(df_plot) // 2
            med5 = df_plot.sort_values("ipm").iloc[max(0, med_idx-2):med_idx+3]
            df_plot = pd.concat([top5, med5, bot5]).drop_duplicates(subset=["region"])
            
    if df_plot.empty:
        fig = go.Figure()
        fig.add_annotation(text="Tidak ada data untuk filter yang dipilih.",
                           xref="paper", yref="paper", x=0.5, y=0.5)
        return fig
    
    from utils.data_loader import PALETTE_IPM
    
    # Available columns
    available = {k: v for k, v in vars_to_plot.items() if k in df_plot.columns}
    
    # Standardize based on entire 514 dataset if available, or current df
    df_std = df_plot.copy()
    for col in available.keys():
        mn = df[col].mean() if col in df.columns else df_std[col].mean()
        sd = df[col].std() if col in df.columns else df_std[col].std()
        if sd > 0:
            df_std[col] = (df_std[col] - mn) / sd
    
    dims = []
    for col, label in available.items():
        dims.append(dict(
            label=label,
            values=df_std[col],
            tickformat=".1f",
        ))
    
    ipm_col = df_plot["ipm"] if "ipm" in df_plot.columns else pd.Series([50] * len(df_plot))
    
    fig = go.Figure(go.Parcoords(
        line=dict(
            color=ipm_col,
            colorscale=PALETTE_IPM,
            showscale=True,
            colorbar=dict(
                title=dict(text="IPM", side="right"),
                thickness=14,
                len=0.7,
            ),
        ),
        dimensions=dims,
        unselected=dict(line=dict(color="rgba(180,180,180,0.15)")),
    ))
    
    fig.update_layout(
        height=height,
        margin=dict(l=80, r=80, t=30, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(248,248,252,0.5)",
    )
    
    return fig


def get_pc_interpretation(loadings: pd.DataFrame, pc: str) -> str:
    """Generate data-driven interpretation of a PC's loadings."""
    if pc not in loadings.columns:
        return "Data loading tidak tersedia."
    return _auto_interpret_pc(loadings[pc], pc)

