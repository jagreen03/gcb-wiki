# FIG-004 — Comparator noise budget stack

> Text specification only. No image is produced in Phase A.

## Purpose

Show the input-referred noise budget of the accepted comparator (30 µA design
point) as an RSS stack against the 55 µV gate, and mark the ±16 % surrogate
band that keeps the verdict at CONDITIONAL GO.

## Description

**Type / geometry.** Single vertical stacked bar, y-axis = input-referred
noise (µV RMS), 0 → 70. Segments stack in **RSS** order (each segment height =
`sqrt(running_total² + term²) − running_total`, so the bar top = the RSS
total, not the arithmetic sum — state this in the caption).

**Segments (bottom → top), 30 µA point:**
1. `σ_thermal` — 47.7 µV — "input pair + loads, integrated over the comparator
   NBW; γ_eff ≈ 1.4 (BSIM4)".
2. `σ_1/f (post-chop)` — 15.6 µV — "K_Fn proxy 5e-11 V²·µm², after 20 MHz
   chopper (43 µV auto-zero-only)".
3. `σ_latch / G_tot` — 16 µV — "StrongARM referred through the 2-stage gain
   G_tot ≈ 50".
   → **RSS total ≈ 53 µV**.

**Reference lines / bands.**
- Solid line at **55 µV** — "combined comparator-noise gate".
- Shaded band **44.5–61.5 µV** — "±16 % BSIM4-surrogate uncertainty → verdict
  held at CONDITIONAL GO".
- Dotted line at **~72 µV** — "readout p05 SNDR crosses 56 dB here
  (`v_comp_noise` sweep, extrapolated)".

**Side annotation (15 µA point, greyed):** total ≈ 39 µV but
**decision-time-disqualified** (preamp τ ≈ 40 ns > 30 ns ramp window).

**Data.**
- Segment values, γ_eff, chop factor: `SPICE_RESULTS_V3.md` §7 (table) and
  `gcb-papers/data/readout/spice/comparator_noise.json`
  (`rows[*].v_thermal_stage1_uV`, `v_1f_resid_uV`, `v_latch_ref_uV`,
  `v_total_uV`).
- BSIM4 `.noise` spectra behind σ_thermal:
  `gcb-papers/data/readout/spice/cmp_noise_spectrum_{15,30}uA.txt`.
- 55 µV gate, ±16 % band, CONDITIONAL GO: `SPICE_RESULTS_V3.md` §9.
- ~72 µV p05 crossing: `SPICE_RESULTS_V3.md` §10 and
  `mc_v2/{ff_125,tt_27}_nsweep{40..65}_c2.json`.
- 15 µA decision-time disqualification: `SPICE_RESULTS_V3.md` §5b.

## Viewer Conclusions

- Thermal dominates; 1/f is under control only because of the chopper (43 →
  16 µV); the latch is a real but secondary term.
- The 53 µV total sits below both the 55 µV comparator gate and, with ~19 µV to
  spare, the ~72 µV point where the *readout* SNDR would fail.
- Lower-noise operating points exist (15 µA → 39 µV) but are unusable on
  settling time.

## Invalid Conclusions

- The bar is **RSS**, not additive — segment heights are not the raw σ values;
  read the top of the bar for the total.
- 53 µV is a `.noise` integral from a gm-matched BSIM4 device, **not** a
  transient histogram and **not** an ASAP7 BSIM-CMG result.
- The ~72 µV line is a linear extrapolation of a 6-point sweep at two corners,
  not a measured threshold.

## Sources

- `gcb-papers/data/readout/spice/SPICE_RESULTS_V3.md` §7, §9, §10, §5b
- `gcb-papers/data/readout/spice/comparator_noise.json`
- `gcb-papers/data/readout/spice/cmp_noise_spectrum_{15,30}uA.txt`
- `gcb-papers/data/readout/spice/mc_v2/*_nsweep*_c2.json`

## Render Status

`APPROVED` — SVG rendered by `figures/render_figs.py` on 2026-09-07, committed as `figures/FIG-004-noise-budget-stack.svg`. Verified: XML well-formed, the burned-in string "PRELIMINARY CONCEPT — NO SILICON EXISTS" present, every label/number in this spec present in the SVG text, no viewBox overflow. Data revision: schematic — this spec is the source of truth (numbers trace onward via the Sources list).

## Disclaimer Text

"Comparator input-referred noise budget, 30 µA design point, RSS stack. σ_thermal
and σ_1/f are ngspice `.noise` on a BSIM4 device gm-matched to ASAP7 (±16 %);
σ_latch is an assumed StrongARM value referred through the measured 2-stage
gain. Verdict: CONDITIONAL GO pending a commercial transient-noise histogram."
