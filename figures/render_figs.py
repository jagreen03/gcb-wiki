#!/usr/bin/env python3
"""
render_figs.py -- generate the Phase C SVGs strictly from the approved text
specs in gcb-wiki/figures/FIG-00N-*.md.

Rules honoured:
  * every label / number / geometry is copied verbatim from the spec file it
    belongs to; nothing is invented.  Where a spec gives a formula (FIG-004
    RSS stacking) the formula is evaluated, not guessed.
  * every SVG physically contains the burned-in string
    "PRELIMINARY CONCEPT — NO SILICON EXISTS" plus that figure's own
    Disclaimer Text.
  * pure string SVG -- deterministic, no external deps.

Run:  python render_figs.py         (writes FIG-00N-*.svg next to the specs)
"""
from __future__ import annotations
import html
import math
import pathlib

HERE = pathlib.Path(__file__).parent
DISCLAIMER = "PRELIMINARY CONCEPT — NO SILICON EXISTS"

FONT = "'Helvetica Neue',Arial,'DejaVu Sans',sans-serif"
MONO = "'DejaVu Sans Mono','Courier New',monospace"

INK      = "#1a1a1a"
SUBINK   = "#54606b"
BOX_F    = "#f4f6f8"
BOX_S    = "#5b6b7a"
ANA_F    = "#eef2f5"          # analog block fill (FIG-002)
GREEN_S  = "#1b7f5b"
GREEN_F  = "#e6f4ee"
GREY_S   = "#9aa4ad"
GREY_F   = "#f0f2f4"
AMBER_S  = "#b8860b"
AMBER_F  = "#fbf1dc"
RAIL     = "#c0392b"
BAND     = "#e8ebee"
DISC_F   = "#fff3f3"


# --------------------------------------------------------------------------- #
# primitives
# --------------------------------------------------------------------------- #
def e(s: str) -> str:
    return html.escape(str(s), quote=True)


def svg_open(w: int, h: int) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'width="{w}" height="{h}" font-family="{FONT}">\n'
        f'<defs>'
        f'<marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        f'markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{INK}"/></marker>'
        f'<marker id="arwg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        f'markerHeight="7" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{GREY_S}"/></marker>'
        f'</defs>\n'
        f'<rect x="0" y="0" width="{w}" height="{h}" fill="#ffffff"/>\n'
    )


def svg_close() -> str:
    return "</svg>\n"


def txt(x, y, s, size=13, anchor="start", fill=INK, weight="normal",
        family=FONT, italic=False):
    st = ' font-style="italic"' if italic else ""
    return (f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" '
            f'fill="{fill}" font-weight="{weight}" font-family="{family}"{st}>'
            f'{e(s)}</text>\n')


def mtxt(x, y, lines, size=12, lh=15, anchor="start", fill=INK, family=FONT):
    parts = [f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" '
             f'fill="{fill}" font-family="{family}">']
    for i, ln in enumerate(lines):
        dy = 0 if i == 0 else lh
        parts.append(f'<tspan x="{x}" dy="{dy}">{e(ln)}</tspan>')
    parts.append("</text>\n")
    return "".join(parts)


def box(x, y, w, h, fill=BOX_F, stroke=BOX_S, rx=7, sw=1.4, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>\n')


def line(x1, y1, x2, y2, stroke=INK, sw=1.4, dash=None, marker=False,
         marker_both=False):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    m = ""
    if marker:
        m = ' marker-end="url(#arw)"'
    if marker_both:
        m = ' marker-start="url(#arw)" marker-end="url(#arw)"'
    return (f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" '
            f'stroke-width="{sw}"{d}{m}/>\n')


def polyline(pts, stroke=INK, sw=1.6, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    p = " ".join(f"{x},{y}" for x, y in pts)
    return f'<polyline points="{p}" fill="none" stroke="{stroke}" stroke-width="{sw}"{d}/>\n'


def disclaimer_band(w, y):
    """Burned-in disclaimer strip. `y` is the top of the strip; height 46."""
    s = box(0, y, w, 46, fill=DISC_F, stroke=RAIL, rx=0, sw=1)
    s += txt(w / 2, y + 20, DISCLAIMER, size=14, anchor="middle", fill=RAIL,
             weight="bold")
    return s, y + 46


def caption(w, y, text_lines):
    s = ""
    yy = y + 14
    for ln in text_lines:
        s += txt(12, yy, ln, size=10.5, fill=SUBINK)
        yy += 13
    return s, yy


def write(name: str, body: str):
    (HERE / name).write_text(body, encoding="utf-8", newline="\n")
    print(f"wrote {name}  ({len(body)} bytes)")


# --------------------------------------------------------------------------- #
# FIG-001 — system data path
# --------------------------------------------------------------------------- #
def fig001():
    W, H = 1460, 470
    s = svg_open(W, H)
    s += txt(20, 30, "FIG-001  System data path", size=17, weight="bold")
    s += txt(20, 50, "Logical data path, left to right. One analog→digital "
             "conversion (stage 4). Arrow length has no timing meaning.",
             size=11, fill=SUBINK)

    stages = [
        ("1  Vortex 3.0 TCU",
         ["VX_tcu_core.result_if", "emits PE words + is_tile_final"],
         ["gcb-rtl/integration/", "VX_tcu_tilefinal_tag.sv"]),
        ("2  Q17.14 carry-save stream",
         ["M_AXIS_CS AXI4-Stream", "one record per tile-final",
          "NUM_LANES beats", "block-float 32→12"],
         ["gcb-rtl/integration/", "VX_tcu_shim_q1714.sv"]),
        ("3  Optical cascade",
         ["8-input reduction cells", "analog optical sum",
          "noise floor reset per stage (ADR-001)"],
         ["gcb-rtl/rtl/greencoyote_photonic_sequencer.sv,",
          "greencoyote_cs_lane_fifo.sv"]),
        ("4  Single-slope readout",
         ["discharge-mode C_int 2 pF", "chopped/AZ comparator vs shared ramp",
          "6 GHz Gray TDC ×4-phase", "3-point calib"],
         ["gcb-rtl/rtl/greencoyote_ss_tdc.sv,", "greencoyote_ss_calib.sv"]),
        ("5  MMIO register block",
         ["SS_READOUT 0xB0–0xC0", "registers.yaml"],
         ["gcb-rtl/rtl/greencoyote_pilot_regs.sv,",
          "greencoyote_axi_lite_wrapper.sv"]),
        ("6  Host",
         ["gcb_proxy.py safety supervisor", "gcb-dashboard live view"],
         ["gcb-host/"]),
    ]
    n = len(stages)
    bx0, by = 24, 92
    bw, bh, gap = 208, 150, 20
    for i, (title, body, owner) in enumerate(stages):
        x = bx0 + i * (bw + gap)
        fill = GREEN_F if i == 3 else BOX_F
        stroke = GREEN_S if i == 3 else BOX_S
        s += box(x, by, bw, bh, fill=fill, stroke=stroke)
        s += txt(x + bw / 2, by + 22, title, size=12.5, anchor="middle",
                 weight="bold")
        s += mtxt(x + 10, by + 44, body, size=10.3, lh=13)
        # owner band
        s += box(x, by + bh + 8, bw, 30, fill=GREY_F, stroke=GREY_S, rx=4, sw=1)
        s += mtxt(x + 8, by + bh + 22, owner, size=8.6, lh=10, family=MONO,
                  fill=SUBINK)
        # forward arrow
        if i < n - 1:
            ax = x + bw
            s += line(ax, by + bh / 2, ax + gap, by + bh / 2, marker=True)
        # stage-4 output label
        if i == 3:
            s += txt(x + bw / 2, by + bh - 8, "→ x_hat (Q2.16)", size=10.5,
                     anchor="middle", fill=GREEN_S, weight="bold")
    # 1→2 arrow annotation
    s += txt(bx0 + bw + gap / 2, by + bh / 2 - 8, "RNE, saturating", size=9.5,
             anchor="middle", fill=SUBINK)
    # 5↔6 bidirectional (redraw over the plain forward arrow)
    x5 = bx0 + 4 * (bw + gap) + bw
    s += line(x5, by + bh / 2, x5 + gap, by + bh / 2, marker_both=True)
    s += txt(x5 + gap / 2, by + bh / 2 - 8, "MMIO", size=9.5, anchor="middle",
             fill=SUBINK)

    s += txt(20, by + bh + 66, "Schematic — no data binding. Illustrates "
             "gcb-spec/architecture.md (\"Data path\"). Vortex-side blocks 1–2 "
             "are integration contracts, never synthesised into the pilot.",
             size=10, fill=SUBINK)

    band, y = disclaimer_band(W, H - 90)
    s += band
    s += txt(12, y + 16,
             "Logical data path, not to scale. No GCB hardware has been "
             "fabricated or measured. Vortex-side blocks are integration "
             "contracts staged in gcb-rtl for review, not part of the "
             "GreenCoyote-Bay pilot build.", size=9.5, fill=SUBINK)
    s += svg_close()
    write("FIG-001-system-data-path.svg", s)


# --------------------------------------------------------------------------- #
# FIG-002 — readout signal chain
# --------------------------------------------------------------------------- #
def fig002():
    W, H = 1520, 520
    s = svg_open(W, H)
    s += txt(20, 30, "FIG-002  Readout signal chain", size=17, weight="bold")
    s += txt(20, 50, "Stage 4 of FIG-001 expanded. Dashed line = analog|digital "
             "boundary at the comparator latch.", size=11, fill=SUBINK)

    stages = [
        ("1  Photodiode", ["I_PD : 0.74 µA RMS,", "4.45 µA FS (crest 6)"], "ana"),
        ("2  Discharge integrator",
         ["C_int = 2.0 pF, pre-charged", "PD sinks current for 256 ns",
          "V_FS = 568 mV; floor ≈ 0.2 V"], "ana"),
        ("3  Shared ramp",
         ["cascode NMOS sink + replica servo", "falling · 4.2 mV/ns",
          "0.20–0.77 V", "slope ±1.1 % over PVT"], "ana"),
        ("4  Chopped auto-zero preamp",
         ["2 stages · I_tail 30 µA", "F_chop 20 MHz · C_L 0.8 pF",
          "gated 20 ns on the", "calibration-known crossing"], "ana"),
        ("5  StrongARM latch", ["decision;", "analog|digital", "boundary here"],
         "ana"),
        ("6  Shared 6 GHz Gray TDC",
         ["12-bit carry-select counter", "4 phase latches (24 GS/s)",
          "per-channel {gray, phase}", "freeze on fire · 64 channels"], "dig"),
        ("7  3-point calibration",
         ["fixed-point Horner", "x_hat = C2·u² + C1·u + C0",
          "Q4.28 coeffs, Q2.16 out", "bit-exact RTL ↔ golden"], "dig"),
    ]
    bx0, by = 24, 150
    bw, bh, gap = 196, 170, 12
    for i, (title, body, kind) in enumerate(stages):
        x = bx0 + i * (bw + gap)
        if kind == "dig":
            fill, stroke, rx = GREEN_F, GREEN_S, 8
        else:
            fill, stroke, rx = ANA_F, BOX_S, 2
        s += box(x, by, bw, bh, fill=fill, stroke=stroke, rx=rx)
        s += txt(x + bw / 2, by + 20, title, size=11.5, anchor="middle",
                 weight="bold")
        s += mtxt(x + 9, by + 40, body, size=9.6, lh=12.5)
        if i < len(stages) - 1:
            s += line(x + bw, by + bh / 2, x + bw + gap, by + bh / 2, marker=True)
        if i == 6:
            s += txt(x + bw / 2, by + bh - 10, "→ x_hat → SS_READOUT readout",
                     size=9.5, anchor="middle", fill=GREEN_S, weight="bold")

    # analog|digital dashed boundary between stage 5 and 6
    xb = bx0 + 5 * (bw + gap) + (bw + gap) / 2 - gap / 2
    s += line(xb, by - 26, xb, by + bh + 40, stroke=INK, sw=1.2, dash="5 4")
    s += txt(xb - 6, by - 32, "analog", size=9.5, anchor="end", fill=SUBINK)
    s += txt(xb + 6, by - 32, "digital", size=9.5, anchor="start", fill=SUBINK)

    # annotation above stage 4
    x4 = bx0 + 3 * (bw + gap)
    s += box(x4 - 6, by - 44, bw + 12, 30, fill=AMBER_F, stroke=AMBER_S, rx=4,
             sw=1)
    s += txt(x4 + bw / 2, by - 25, "total input-referred noise 53 µV (≤ 55 µV gate)",
             size=9.6, anchor="middle", fill="#7a5c00")
    # annotation above stage 7
    x7 = bx0 + 6 * (bw + gap)
    s += mtxt(x7 - 4, by - 34,
              ["coefficients from SS_CAL_IDX/SS_CAL_DATA;",
               "3-pt solve is host/firmware float"], size=8.8, lh=10,
              fill=SUBINK)

    # inset waveform under stage 3 (schematic: held v_int + falling ramp cross)
    x3 = bx0 + 2 * (bw + gap)
    iw, ih = bw, 74
    iy = by + bh + 20
    s += box(x3, iy, iw, ih, fill="#ffffff", stroke=GREY_S, rx=4, sw=1)
    s += line(x3 + 8, iy + ih - 10, x3 + iw - 8, iy + ih - 10, stroke=GREY_S, sw=1)  # x axis
    s += line(x3 + 8, iy + 8, x3 + 8, iy + ih - 10, stroke=GREY_S, sw=1)            # y axis
    s += line(x3 + 12, iy + 26, x3 + iw - 12, iy + 26, stroke=SUBINK, sw=1.4)       # held v_int
    s += polyline([(x3 + 12, iy + 12), (x3 + iw - 12, iy + ih - 16)],
                  stroke=RAIL, sw=1.6)                                              # falling ramp
    s += txt(x3 + iw - 12, iy + 22, "v_int (held)", size=8, anchor="end",
             fill=SUBINK)
    s += txt(x3 + 14, iy + ih - 16, "falling ramp", size=8, anchor="start",
             fill=RAIL)
    s += txt(x3, iy + ih + 12, "inset: qualitative — slope / crossing not to scale",
             size=8.5, fill=SUBINK)

    band, y = disclaimer_band(W, H - 90)
    s += band
    s += txt(12, y + 16,
             "Single-slope CIS readout signal chain. Analog parameters are "
             "ngspice/ASAP7 simulation results (BSIM-CMG for the ramp, BSIM4 "
             "surrogate for the comparator .noise); the digital back-end is "
             "verified bit-exact in Icarus. No silicon.", size=9.5, fill=SUBINK)
    s += svg_close()
    write("FIG-002-readout-signal-chain.svg", s)


# --------------------------------------------------------------------------- #
# FIG-003 — ramp polarity
# --------------------------------------------------------------------------- #
def fig003():
    W, H = 1180, 720
    s = svg_open(W, H)
    s += txt(20, 30, "FIG-003  Ramp polarity: charge-up vs discharge", size=17,
             weight="bold")
    s += txt(20, 50, "y = node voltage 0 → 0.8 V.  x = time over one 256 ns "
             "window.  Trajectories are schematic.", size=11, fill=SUBINK)

    # panel geometry
    px, pw = 90, 900
    ph = 220
    vmax = 0.8

    def yof(top, v):
        return top + ph - (v / vmax) * (ph - 20) - 8

    def panel(top, label, sub):
        out = box(px, top, pw, ph, fill="#ffffff", stroke=BOX_S, rx=4)
        # usable band (grey) between floor 0.20 and 0.71 (1.25*V_FS)
        y_hi = yof(top, 0.71)
        y_lo = yof(top, 0.20)
        out += box(px + 1, y_hi, pw - 2, y_lo - y_hi, fill=BAND, stroke="none",
                   rx=0)
        # axes + ticks that the spec names: 0, 0.2, 0.568 (V_FS), 0.71, 0.8
        out += line(px, yof(top, 0), px + pw, yof(top, 0), stroke=GREY_S, sw=1)
        out += line(px, top + 4, px, yof(top, 0), stroke=GREY_S, sw=1)
        for v, lbl in [(0.0, "0"), (0.20, "0.20"), (0.568, "V_FS 0.568"),
                       (0.71, "1.25·V_FS 0.71"), (0.80, "0.80")]:
            yy = yof(top, v)
            out += line(px - 4, yy, px, yy, stroke=GREY_S, sw=1)
            out += txt(px - 8, yy + 3, lbl, size=8.6, anchor="end", fill=SUBINK)
        # red 0.8 V rail
        out += line(px, yof(top, 0.8), px + pw, yof(top, 0.8), stroke=RAIL,
                    sw=1.6, dash="6 3")
        out += txt(px + pw - 6, yof(top, 0.8) - 4, "0.8 V rail", size=9,
                   anchor="end", fill=RAIL)
        out += txt(px + 6, top + 18, label, size=13, weight="bold")
        out += txt(px + 6, top + 34, sub, size=10, fill=SUBINK)
        out += txt(px, top + ph + 14, "time →  0", size=9, fill=SUBINK)
        out += txt(px + pw, top + ph + 14, "256 ns", size=9, anchor="end",
                   fill=SUBINK)
        return out

    # Panel A — charge-up (rejected)
    topA = 78
    s += panel(topA, "A — Charge-up  (rejected)", "ramp_inl_reverse = 1")
    xL, xR = px + 20, px + pw - 20
    # v_int rises 0 -> V_FS ; small signals end low
    s += polyline([(xL, yof(topA, 0.0)), (xR, yof(topA, 0.568))], stroke=SUBINK,
                  sw=1.8)
    s += txt(xR + 4, yof(topA, 0.568), "v_int → V_FS", size=8.5, fill=SUBINK)
    # ramp rises 0 -> 0.71
    s += polyline([(xL, yof(topA, 0.0)), (xR, yof(topA, 0.71))], stroke=RAIL,
                  sw=1.8)
    s += txt(xR + 4, yof(topA, 0.71) + 3, "ramp ↑ to 1.25·V_FS ≈ 0.71 V",
             size=8.5, fill=RAIL)
    s += txt(px + pw / 2, yof(topA, 0.78),
             "< 80 mV: cannot cascode   (0.8 − 0.71 ≈ 0.08 V)", size=9.5,
             anchor="middle", fill=RAIL, weight="bold")
    s += txt(px + pw - 20, yof(topA, 0.10),
             "small signals cross near the ramp END", size=9, anchor="end",
             fill=SUBINK)

    # comparison callout between panels
    cy = topA + ph + 22
    s += box(px + 120, cy, pw - 240, 34, fill=AMBER_F, stroke=AMBER_S, rx=6, sw=1)
    s += txt(px + pw / 2, cy + 22,
             "Discharge polarity (reverse = 0) is worth ≈ 0.7 dB p05 vs "
             "charge-up (reverse = 1); it is not optional.", size=10.5,
             anchor="middle", fill="#7a5c00")

    # Panel B — discharge (accepted)
    topB = cy + 60
    s += panel(topB, "B — Discharge  (accepted)", "ramp_inl_reverse = 0")
    # v_int falls 0.77 -> 0.20 ; small signals stay high
    s += polyline([(xL, yof(topB, 0.77)), (xR, yof(topB, 0.20))], stroke=SUBINK,
                  sw=1.8)
    s += txt(xL - 4, yof(topB, 0.77) - 4, "v_int pre-charged ≈ 0.77 V", size=8.5,
             fill=SUBINK)
    # ramp falls 0.77 -> 0.20
    s += polyline([(xL, yof(topB, 0.77)), (xR, yof(topB, 0.20))], stroke=RAIL,
                  sw=1.8, dash="1 0")
    s += txt(xR + 4, yof(topB, 0.20), "ramp ↓ 0.77 → 0.20 V", size=8.5,
             fill=RAIL)
    s += txt(px + pw / 2, yof(topB, 0.30),
             "cascode affordable · slope ±1.1 % over 9 PVT corners", size=9.5,
             anchor="middle", fill=GREEN_S, weight="bold")
    s += txt(px + 20, yof(topB, 0.70),
             "small signals cross near the ramp START", size=9, anchor="start",
             fill=SUBINK)

    band, y = disclaimer_band(W, H - 66)
    s += band
    s += txt(12, y + 16,
             "Charge-up (rejected) vs discharge (accepted) single-slope "
             "readout. Voltage trajectories are schematic; rail head-room "
             "values and the ±1.1 % slope spread are ngspice/ASAP7 results "
             "(SPICE_RESULTS_V2.md).", size=9.5, fill=SUBINK)
    s += svg_close()
    write("FIG-003-ramp-polarity.svg", s)


# --------------------------------------------------------------------------- #
# FIG-004 — comparator noise budget stack
# --------------------------------------------------------------------------- #
def fig004():
    W, H = 1120, 640
    s = svg_open(W, H)
    s += txt(20, 30, "FIG-004  Comparator noise budget stack  (30 µA design point)",
             size=17, weight="bold")
    s += txt(20, 50, "RSS stack: segment height = √(running² + term²) − running. "
             "Bar top = RSS total, NOT the arithmetic sum.", size=11, fill=SUBINK)

    # plot area: y-axis 0 -> 70 µV
    ax_x, ax_top, ax_bot = 120, 90, 500
    ymax = 70.0

    def yof(v):
        return ax_bot - (v / ymax) * (ax_bot - ax_top)

    # y axis + ticks
    s += line(ax_x, ax_top, ax_x, ax_bot, stroke=INK, sw=1.4)
    s += line(ax_x, ax_bot, ax_x + 620, ax_bot, stroke=INK, sw=1.4)
    for v in range(0, 71, 10):
        yy = yof(v)
        s += line(ax_x - 5, yy, ax_x, yy, stroke=INK, sw=1)
        s += txt(ax_x - 9, yy + 4, str(v), size=10, anchor="end")
    s += txt(24, (ax_top + ax_bot) / 2, "input-referred noise  (µV RMS)",
             size=11, anchor="middle",
             fill=INK)  # rotated feel not needed; keep horizontal near axis
    s += txt(ax_x + 300, ax_bot + 24, "30 µA design point", size=11,
             anchor="middle", fill=SUBINK)

    # RSS segments (spec formula, 30 µA point)
    terms = [
        ("sigma_thermal — 47.7 µV", 47.7,
         "input pair + loads, over the comparator NBW; gamma_eff ≈ 1.4 (BSIM4)"),
        ("sigma_1/f (post-chop) — 15.6 µV", 15.6,
         "K_Fn proxy 5e-11 V²·µm², after 20 MHz chopper (43 µV auto-zero-only)"),
        ("sigma_latch / G_tot — 16 µV", 16.0,
         "StrongARM referred through the 2-stage gain G_tot ≈ 50"),
    ]
    bar_x, bar_w = ax_x + 90, 150
    running = 0.0
    fills = [BOX_F, "#dfeaf3", "#cfe0ec"]
    for i, (lbl, term, note) in enumerate(terms):
        seg = math.sqrt(running ** 2 + term ** 2) - running
        y_top = yof(running + seg)
        y_bot = yof(running)
        s += box(bar_x, y_top, bar_w, y_bot - y_top, fill=fills[i], stroke=BOX_S,
                 rx=0, sw=1.2)
        s += txt(bar_x + bar_w + 14, (y_top + y_bot) / 2 - 2, lbl, size=10.5,
                 weight="bold")
        s += txt(bar_x + bar_w + 14, (y_top + y_bot) / 2 + 12, note, size=9,
                 fill=SUBINK)
        running = math.sqrt(running ** 2 + term ** 2)
    rss_total = running
    s += txt(bar_x + bar_w / 2, yof(rss_total) - 8,
             f"RSS total ≈ {rss_total:.1f} µV  (≈ 53 µV)", size=10.5,
             anchor="middle", weight="bold", fill=INK)

    # reference lines
    y55 = yof(55.0)
    s += line(ax_x, y55, ax_x + 620, y55, stroke=INK, sw=1.6)
    s += txt(ax_x + 624, y55 + 4, "55 µV — combined comparator-noise gate",
             size=10)
    # +-16% surrogate band 44.5 - 61.5
    yb_hi, yb_lo = yof(61.5), yof(44.5)
    s += box(ax_x, yb_hi, 620, yb_lo - yb_hi, fill=BAND, stroke="none")
    s += txt(ax_x + 624, yb_hi + 12,
             "±16 % BSIM4-surrogate band 44.5–61.5 µV → CONDITIONAL GO",
             size=9.5, fill=SUBINK)
    # ~72 µV dotted
    y72 = yof(72.0)
    s += line(ax_x, y72, ax_x + 620, y72, stroke=RAIL, sw=1.4, dash="3 3")
    s += txt(ax_x + 624, y72 + 4,
             "~72 µV — readout p05 SNDR crosses 56 dB (v_comp_noise sweep, "
             "extrapolated)", size=9.5, fill=RAIL)

    # 15 µA greyed side annotation
    g_x = bar_x + bar_w + 470
    s += box(g_x, yof(39.0), 90, yof(0) - yof(39.0), fill=GREY_F, stroke=GREY_S,
             rx=0, sw=1)
    s += txt(g_x + 45, yof(39.0) - 8, "15 µA ≈ 39 µV", size=9.5, anchor="middle",
             fill=SUBINK)
    s += mtxt(g_x - 6, yof(39.0) + 20,
              ["decision-time-disqualified:", "preamp τ ≈ 40 ns > 30 ns",
               "ramp window"], size=8.6, lh=10, fill=SUBINK)

    band, y = disclaimer_band(W, H - 88)
    s += band
    s += txt(12, y + 16,
             "Comparator input-referred noise budget, 30 µA design point, RSS "
             "stack. sigma_thermal and sigma_1/f are ngspice .noise on a BSIM4 "
             "device gm-matched to ASAP7 (±16 %); sigma_latch is an assumed "
             "StrongARM value referred through the measured 2-stage gain. "
             "Verdict: CONDITIONAL GO pending a commercial transient-noise "
             "histogram.", size=9.3, fill=SUBINK)
    s += svg_close()
    write("FIG-004-noise-budget-stack.svg", s)


# --------------------------------------------------------------------------- #
# FIG-005 — decision tree
# --------------------------------------------------------------------------- #
def fig005():
    W, H = 1400, 900
    s = svg_open(W, H)
    s += txt(20, 30, "FIG-005  Readout architecture decision tree  (ICO → Single-Slope)",
             size=17, weight="bold")
    s += txt(20, 50, "Logical elimination, not a chronology. Every node is a "
             "row of DECISION_LEDGER.md.", size=11, fill=SUBINK)

    def node(x, y, w, h, title, lines, kind):
        if kind == "root":
            f, st = "#eef2f5", BOX_S
        elif kind == "rej":
            f, st = GREY_F, GREY_S
        elif kind == "acc":
            f, st = GREEN_F, GREEN_S
        elif kind == "open":
            f, st = AMBER_F, AMBER_S
        else:
            f, st = BOX_F, BOX_S
        o = box(x, y, w, h, fill=f, stroke=st)
        o += txt(x + w / 2, y + 17, title, size=11, anchor="middle",
                 weight="bold")
        o += mtxt(x + 8, y + 34, lines, size=8.8, lh=10.5, fill=INK)
        return o

    # root
    s += node(480, 70, 400, 34, "digitise the optical group output < 0.02 pJ/MAC",
              [], "root")
    s += line(680, 104, 680, 130, marker=False)
    # three branches
    s += line(230, 130, 1130, 130, sw=1.4)
    for bx in (230, 680, 1130):
        s += line(bx, 130, bx, 150, sw=1.4)

    s += node(120, 150, 220, 40, "per-channel TIA + multi-bit ADC", [], "mid")
    s += node(560, 150, 240, 40, "oscillator / phase accumulation", [], "mid")
    s += node(1000, 150, 260, 40, "direct comparison vs a shared ramp", [], "mid")

    # TIA reject leaf
    s += line(230, 190, 230, 216, marker=True)
    s += node(110, 220, 240, 56, "✗  per-channel TIA + multi-bit ADC",
              ["ADC energy floor exceeds 0.02 pJ/MAC",
               "at any buildable reduction depth"], "rej")

    # oscillator -> two leaves
    s += line(680, 190, 680, 214, sw=1.4)
    s += line(500, 214, 860, 214, sw=1.4)
    for bx in (500, 860):
        s += line(bx, 214, bx, 234, marker=True)
    s += node(360, 238, 280, 92, "✗  tail-injection ICO",
              ["encodes charge in PVT-dependent f(I);",
               "lin↔PN op-points contradict",
               "(no PVT margin)", "— superseded"], "rej")
    s += node(720, 238, 300, 92, "✗  charge-balancing ΔΣ  (0.5 fF node)",
              ["retired (ADR-005): no free oversampling;",
               "every sub-block re-adds the cost",
               "0.5 fF node — modulation too high"], "rej")

    # direct comparison -> single-slope CIS
    s += line(1130, 190, 1130, 214, marker=True)
    s += node(1010, 218, 240, 34, "single-slope CIS", [], "mid")
    s += line(1130, 252, 1130, 272, sw=1.4)
    s += line(1010, 272, 1250, 272, sw=1.4)
    for bx in (1010, 1250):
        s += line(bx, 272, bx, 292, marker=True)
    s += node(890, 296, 250, 78, "✗  charge-up  (rising ramp)",
              ["0.72 V ramp top from the 0.8 V rail:",
               "< 80 mV, cannot cascode",
               "→ ramp_inl_reverse = 1"], "rej")
    s += node(1150, 296, 190, 78, "✓  discharge  (falling ramp)",
              ["ACCEPTED (ADR-005)", "→ ramp_inl_reverse = 0"], "acc")

    # accepted detail box
    s += line(1245, 374, 1245, 396, marker=True)
    s += node(1010, 400, 340, 130, "✓  ACCEPTED — single-slope CIS readout",
              ["2.0 pF C_int, discharge mode",
               "cascode NMOS sink + replica servo ramp",
               "chopped/AZ preamp, I_tail 30 µA",
               "12-bit, 6 GHz ×4-phase Gray TDC",
               "3-point (quadratic) calibration",
               "carry-select counter · CML clock · static CMOS logic"], "acc")
    s += line(1180, 530, 1180, 552, marker=True)
    s += node(1000, 556, 360, 66, "◐  OPEN",
              ["Spectre transient-noise histogram",
               "lifts CONDITIONAL GO → GO"], "open")

    # secondary rejected leaves list
    s += txt(120, 470, "Secondary rejected decisions (see DECISION_LEDGER.md):",
             size=11, weight="bold")
    secs = [
        "10-bit quantization — crest-factor failure",
        "CDS — −1.7 dB (comparator dominates kT/C and 1/f)",
        "300 MHz PD chopper — cyclostationary mixer",
        "DAC ramp ≤4-pt cal — scoring artifact (42 dB vs 58 dB)",
        "1 pF C_int — rail collision",
        "15 µA comparator tail — settling time",
        "ripple-carry Gray counter — SS/125 °C timing",
        "Xyce via conda — Trilinos missing NOX/LOCA",
    ]
    yy = 492
    for t in secs:
        s += txt(128, yy, "✗  " + t, size=9.6, fill=SUBINK)
        yy += 16

    band, y = disclaimer_band(W, H - 66)
    s += band
    s += txt(12, y + 16,
             "Architecture decision tree for the GCB receiver. Kill reasons "
             "are specific to the GCB operating point (0.8 V, 256 ns, crest 6, "
             "56 dB target). Mirrors DECISION_LEDGER.md; the accepted path is "
             "CONDITIONAL GO pending a commercial transient-noise histogram.",
             size=9.4, fill=SUBINK)
    s += svg_close()
    write("FIG-005-decision-tree.svg", s)


# --------------------------------------------------------------------------- #
# FIG-006 — package / pinout (concept)
# --------------------------------------------------------------------------- #
def fig006():
    W, H = 1620, 700
    s = svg_open(W, H)
    s += txt(20, 30, "FIG-006  Package / pinout  (concept — not a pinout)",
             size=17, weight="bold")
    s += txt(20, 50, "Schematic, not to scale. No pin count, ball map, "
             "footprint or package size is defined. All values TBD.", size=11,
             fill=SUBINK)

    # Panel A — cross-section stack
    ax, aw = 40, 560
    s += txt(ax, 82, "A — package cross-section (schematic, not to scale)",
             size=12, weight="bold")
    y = 100
    def layer(yy, hh, label, fill=BOX_F):
        o = box(ax, yy, aw, hh, fill=fill, stroke=BOX_S, rx=3)
        o += txt(ax + aw / 2, yy + hh / 2 + 4, label, size=10, anchor="middle")
        return o
    s += layer(y, 34, "5  lid / heat spreader over the pilot die  —  "
               "thermal path; photonic die near-isothermal (ADR-001)")
    y += 44
    # 3: pilot die | photonic die side by side, on interposer
    half = aw / 2 - 6
    s += box(ax, y, half, 70, fill=GREEN_F, stroke=GREEN_S, rx=3)
    s += mtxt(ax + 10, y + 22, ["3  pilot die (FPGA/ASIC)",
                                "digital + single-slope readout + MMIO"],
              size=9.2, lh=12)
    s += box(ax + half + 12, y, half, 70, fill="#eef2f5", stroke=BOX_S, rx=3)
    s += mtxt(ax + half + 22, y + 22, ["3  photonic die",
                                       "MZ reduction mesh, PDs, thermal tuners"],
              size=9.2, lh=12)
    # fiber-attach block on photonic-die edge
    s += box(ax + aw - 8, y + 14, 44, 42, fill=AMBER_F, stroke=AMBER_S, rx=3)
    s += txt(ax + aw + 40, y + 12, "4  WDM fiber ribbon, N lanes — N TBD",
             size=9, anchor="start", fill="#7a5c00")
    y += 80
    s += layer(y, 26, "2  silicon interposer", fill="#e8ebee")
    y += 36
    s += layer(y, 30, "1  substrate + BGA field  —  host + power balls — count TBD",
               fill=GREY_F)
    s += txt(ax, y + 52, "N, layer counts, thicknesses: all TBD", size=9,
             fill=SUBINK)

    # Panel B — external interface groups
    bx0 = 700
    s += txt(bx0, 82, "B — external interface groups (no pin numbers)", size=12,
             weight="bold")
    s += box(bx0 + 150, 150, 220, 220, fill="#eef2f5", stroke=BOX_S, rx=6)
    s += txt(bx0 + 260, 265, "GCB package", size=11, anchor="middle",
             fill=SUBINK)
    # descriptions kept verbatim from the spec, pre-broken (no auto-wrap that
    # could split a phrase like "4-phase generated on-die in CML")
    groups = [
        ("Host", ["PCIe or AXI4 to host SoC;",
                  "MMIO register window (registers.yaml, 0x00–0xC0)"]),
        ("Optical", ["WDM input fiber(s) → reduction mesh; monitor tap out"]),
        ("Bench loopback", ["parallel DAC out / SPI-SAR-ADC in",
                            "(greencoyote_dac_if.sv / greencoyote_adc_if.sv)",
                            "— present for bring-up, not a product datapath"]),
        ("Clock", ["6 GHz reference in (or on-die PLL ref);",
                   "4-phase generated on-die in CML"]),
        ("Power", ["core 0.7 V (logic), 0.8 V (readout analog),",
                   "photonic tuner rail, PD bias — currents TBD"]),
        ("Debug", ["JTAG / scan"]),
    ]
    gy = 148
    for name, lines in groups:
        s += box(bx0 + 460, gy, 460, 70, fill=BOX_F, stroke=BOX_S, rx=5)
        s += txt(bx0 + 470, gy + 16, name, size=10.5, weight="bold")
        s += mtxt(bx0 + 470, gy + 31, lines[:4], size=8.4, lh=9.5, fill=SUBINK)
        s += line(bx0 + 370, 260, bx0 + 460, gy + 34, stroke=GREY_S, sw=1)
        gy += 80

    band, y = disclaimer_band(W, H - 66)
    s += band
    s += txt(12, y + 16,
             "Concept package arrangement — schematic, not to scale, not a "
             "pinout. No GCB package has been designed or fabricated. All pin "
             "counts, dimensions, voltages, and currents are TBD.", size=9.5,
             fill=SUBINK)
    s += svg_close()
    write("FIG-006-package-pinout.svg", s)


if __name__ == "__main__":
    fig001()
    fig002()
    fig003()
    fig004()
    fig005()
    fig006()
    print("done — 6 SVGs")
