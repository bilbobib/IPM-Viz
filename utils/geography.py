"""
geography.py — GeoJSON join helpers and map rendering utilities.
"""

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from typing import Optional, Any

from utils.data_loader import load_geojson, get_indicator_config


def get_geojson_key_field(geojson: dict) -> str:
    """
    Detect which property field in the GeoJSON to use for joining.
    Prefer a BPS code field; fall back to name-based fields.
    """
    if not geojson.get("features"):
        return "name"
    
    sample = geojson["features"][0].get("properties", {})
    
    # Priority order for key detection
    for candidate in ["ADM2_PCODE", "adm2_pcode", "kode_bps", "bps_code",
                       "PCODE", "pcode", "ADM2_EN", "adm2_en",
                       "NAME_2", "name", "Name", "NAME", "Kab_Kota", "kab_kota"]:
        if candidate in sample:
            return candidate
    
    return list(sample.keys())[0] if sample else "name"


def normalize_name(s: str) -> str:
    """Normalize region name for fuzzy join."""
    if pd.isna(s):
        return ""
    s = str(s).lower().strip()
    # Remove common prefixes
    for prefix in ["kab. ", "kab ", "kota ", "kabupaten ", "kota administrasi "]:
        if s.startswith(prefix):
            s = s[len(prefix):]
            break
    # Normalize chars
    replacements = {
        "é": "e", "è": "e", "ê": "e",
        "á": "a", "â": "a",
        "/": " ", "-": " ",
    }
    for src, tgt in replacements.items():
        s = s.replace(src, tgt)
    return s.strip()


def build_choropleth(
    df: pd.DataFrame,
    geojson: dict,
    color_col: str,
    title: str = "",
    colorscale: Optional[Any] = None,
    hover_cols: Optional[list] = None,
    selected_region: Optional[str] = None,
    height: int = 560,
) -> go.Figure:
    """
    Build a choropleth map using Plotly with exact prompt styling:
    - 514 actual GeoJSON polygons
    - Semantic color palettes (IPM / Poverty / PCA)
    - Custom tooltip: Kab/kota, Provinsi, Indikator + Nilai + Satuan, IPM, P0, PC1, PC2
    - Selected region highlight
    """
    geo_key = get_geojson_key_field(geojson)
    df_plot = df.copy()
    join_col = "region"

    # Default semantic colorscales
    from utils.data_loader import PALETTE_IPM, PALETTE_POVERTY, PALETTE_PCA
    if colorscale is None:
        if color_col == "ipm":
            colorscale = PALETTE_IPM
        elif color_col in ["poverty", "p0", "tpt"]:
            colorscale = PALETTE_POVERTY
        elif color_col in ["pc1", "pc2"]:
            colorscale = PALETTE_PCA
        else:
            colorscale = PALETTE_IPM

    # Label format
    label_map = get_indicator_config()
    cfg = label_map.get(color_col, {})
    color_label = cfg.get("short", color_col.upper())
    unit = cfg.get("unit", "")

    # Build standard customdata columns for Section 13 requirement:
    # 0: region, 1: province, 2: color_col, 3: ipm, 4: poverty, 5: pc1, 6: pc2
    cols_to_pull = ["region", "province"]
    if color_col not in cols_to_pull:
        cols_to_pull.append(color_col)
    for c in ["ipm", "poverty", "pc1", "pc2"]:
        if c not in cols_to_pull and c in df_plot.columns:
            cols_to_pull.append(c)

    # Fill NA for smooth tooltip display
    for c in cols_to_pull:
        if c in df_plot.columns and df_plot[c].dtype.kind in "fc":
            df_plot[c] = df_plot[c].fillna(0)

    # Prepare custom hover template
    c_idx_map = {col: i for i, col in enumerate(cols_to_pull)}
    
    reg_idx = c_idx_map['region']
    prv_idx = c_idx_map['province']
    hover_parts = [
        f"<b>%{{customdata[{reg_idx}]}}</b><br>",
        f"Provinsi: %{{customdata[{prv_idx}]}}<br>",
    ]
    if color_col in c_idx_map:
        val_idx = c_idx_map[color_col]
        unit_str = f" {unit}" if unit else ""
        hover_parts.append(f"{color_label}: %{{customdata[{val_idx}]:.2f}}{unit_str}<br>")
    if "ipm" in c_idx_map and color_col != "ipm":
        ipm_idx = c_idx_map['ipm']
        hover_parts.append(f"IPM: %{{customdata[{ipm_idx}]:.2f}}<br>")
    if "poverty" in c_idx_map and color_col != "poverty":
        pov_idx = c_idx_map['poverty']
        hover_parts.append(f"Kemiskinan P0: %{{customdata[{pov_idx}]:.2f}}%<br>")
    if "pc1" in c_idx_map and "pc2" in c_idx_map:
        pc1_idx = c_idx_map['pc1']
        pc2_idx = c_idx_map['pc2']
        hover_parts.append(f"PC1: %{{customdata[{pc1_idx}]:+.3f}} | PC2: %{{customdata[{pc2_idx}]:+.3f}}<br>")
    hover_parts.append("<extra></extra>")
    hover_template = "".join(hover_parts)

    fig = px.choropleth(
        df_plot,
        geojson=geojson,
        locations=join_col,
        featureidkey=f"properties.{geo_key}",
        color=color_col,
        color_continuous_scale=colorscale,
        height=height,
    )

    # Attach custom tooltip and customdata
    fig.update_traces(
        customdata=df_plot[cols_to_pull].values,
        hovertemplate=hover_template,
        marker_line_width=0.4,
        marker_line_color="#FFFFFF",
    )

    # If selected region, overlay a highlight marker on its centroid
    if selected_region and "lat" in df_plot.columns and "lon" in df_plot.columns:
        sel_row = df_plot[df_plot["region"] == selected_region]
        if not sel_row.empty:
            s_lat = sel_row.iloc[0].get("lat")
            s_lon = sel_row.iloc[0].get("lon")
            if pd.notna(s_lat) and pd.notna(s_lon):
                fig.add_trace(go.Scattergeo(
                    lat=[s_lat],
                    lon=[s_lon],
                    mode="markers+text",
                    marker=dict(
                        size=14,
                        color="#D97745",
                        symbol="star",
                        line=dict(width=2, color="#17252A"),
                    ),
                    text=[selected_region],
                    textposition="top center",
                    textfont=dict(size=12, color="#17252A", family="Inter"),
                    name=f"Fokus: {selected_region}",
                    hoverinfo="skip",
                ))

    fig.update_geos(
        fitbounds="locations",
        visible=False,
        showcoastlines=False,
        showland=False,
    )

    fig.update_layout(
        title=dict(
            text=title,
            font=dict(size=15, color="#17252A"),
        ),
        margin=dict(l=0, r=0, t=40, b=0),
        coloraxis_colorbar=dict(
            title=dict(text=color_label + (f" ({unit})" if unit else ""), side="right"),
            thickness=14,
            len=0.7,
            tickfont=dict(size=11, color="#17252A"),
        ),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        geo=dict(bgcolor="rgba(0,0,0,0)"),
    )

    return fig


def build_bubble_map(
    df: pd.DataFrame,
    lat_col: str = "lat",
    lon_col: str = "lon",
    size_col: str = "population",
    color_col: str = "ipm",
    title: str = "Peta Proporsional",
    height: int = 520,
) -> go.Figure:
    """
    Build a proportional symbol (bubble) map using lat/lon.
    Falls back to centroid-based coordinates if available.
    """
    label_map = get_indicator_config()
    color_label = label_map.get(color_col, {}).get("short", color_col.upper())
    size_label = label_map.get(size_col, {}).get("short", size_col.capitalize())

    df_plot = df.copy().dropna(subset=[color_col])
    
    # Compute bubble sizes — normalize to reasonable pixel range
    if size_col in df_plot.columns and df_plot[size_col].notna().any():
        sz = df_plot[size_col].fillna(0)
        sz_min, sz_max = sz.min(), sz.max()
        if sz_max > sz_min:
            sz_norm = 4 + 40 * (sz - sz_min) / (sz_max - sz_min)
        else:
            sz_norm = pd.Series([10] * len(df_plot), index=df_plot.index)
        df_plot["_bubble_size"] = sz_norm
    else:
        df_plot["_bubble_size"] = 10
    
    # Build text for hover
    custom = []
    for _, row in df_plot.iterrows():
        region = row.get("region", "")
        prov = row.get("province", "")
        ipm_val = row.get("ipm", np.nan)
        pop_val = row.get("population", np.nan)
        p0_val = row.get("poverty", np.nan)
        text = (
            f"<b>{region}</b><br>"
            f"Provinsi: {prov}<br>"
            f"IPM: {ipm_val:.2f}<br>"
        )
        if not np.isnan(pop_val):
            text += f"Penduduk: {int(pop_val):,}<br>"
        if not np.isnan(p0_val):
            text += f"P0: {p0_val:.2f}%<br>"
        custom.append(text)
    
    # We need lat/lon. If not in df, cannot build bubble map properly.
    # Return a message figure if no coordinates.
    if lat_col not in df_plot.columns or lon_col not in df_plot.columns:
        fig = go.Figure()
        fig.add_annotation(
            text="Koordinat lat/lon tidak tersedia dalam dataset.<br>Peta bubble memerlukan data koordinat.",
            xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False,
            font=dict(size=14, color="#666"),
        )
        fig.update_layout(height=height, paper_bgcolor="rgba(0,0,0,0)")
        return fig
    
    df_valid = df_plot.dropna(subset=[lat_col, lon_col])
    
    fig = go.Figure()
    
    fig.add_trace(go.Scattergeo(
        lat=df_valid[lat_col],
        lon=df_valid[lon_col],
        mode="markers",
        marker=dict(
            size=df_valid["_bubble_size"],
            color=df_valid[color_col],
            colorscale="Viridis",
            showscale=True,
            colorbar=dict(
                title=dict(text=color_label, side="right"),
                thickness=14,
                len=0.6,
            ),
            line=dict(width=0.5, color="white"),
            opacity=0.8,
        ),
        text=[custom[i] for i in range(len(df_valid))],
        hovertemplate="%{text}<extra></extra>",
        name="",
    ))
    
    fig.update_geos(
        scope="asia",
        center=dict(lat=-2.5, lon=118),
        projection_scale=3.5,
        showcoastlines=True,
        coastlinecolor="#ccc",
        showland=True,
        landcolor="#f8f8f8",
        showocean=True,
        oceancolor="#e8f4f8",
        showframe=False,
    )
    
    fig.update_layout(
        title=dict(text=title, font=dict(size=14)),
        height=height,
        margin=dict(l=0, r=0, t=40, b=0),
        paper_bgcolor="rgba(0,0,0,0)",
    )
    
    return fig
