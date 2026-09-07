# FIG-003 — Ramp polarity: charge-up vs discharge

> Text specification only. No image is produced in Phase A.

## Purpose

Show why the readout uses a **discharge-mode** integrator + **falling** ramp,
not the intuitive charge-up + rising ramp: it is a 0.8 V head-room argument
plus a ~0.7 dB SNDR polarity effect.

## Description

**Type / geometry.** Two stacked panels, shared x-axis = time over one 256 ns
window; y-axis = node voltage, 0 → 0.8 V, with a red "0.8 V rail" line and a
grey "usable band" shaded region on each.

**Panel A — Charge-up (rejected).**
- `v_int` rises from 0 as the PD charges `C_int`; small signals end **low**
  (near 0), full-scale ends near `V_FS`.
- Ramp **rises** from ~0 toward `1.25 · V_FS ≈ 0.71 V`; a rising PMOS current
  source has only `0.8 − 0.71 ≈ 0.08 V` of headroom at the top → annotate
  "< 80 mV: cannot cascode".
- Small signals cross **near the end of the ramp** → `ramp_inl_reverse = 1`;
  INL accumulated over the full travel bears on them.

**Panel B — Discharge (accepted).**
- `C_int` pre-charged to ~0.77 V; PD **sinks** current; `v_int` falls; small
  signals stay **high** (near 0.77 V), full-scale falls to the ~0.20 V floor.
- Ramp **falls** from ~0.77 V to ~0.20 V; the NMOS sink has full `V_DS` at the
  top of the useful range and only loses head-room near 0 V, below the used
  code floor → annotate "cascode affordable · slope ±1.1 % over 9 PVT corners".
- Small signals cross **near the start of the ramp** → `ramp_inl_reverse = 0`.

**Comparison callout (between panels).** "Discharge polarity (reverse = 0) is
worth ≈ 0.7 dB p05 vs charge-up (reverse = 1); it is not optional."

**Data.**
- Rail headroom numbers, cascode-vs-single-device: `SPICE_RESULTS_V2.md`
  §1c, §6.2.
- Slope spread across corners: `SPICE_RESULTS_V2.md` §1a
  (table) / `gcb-papers/data/readout/ramp_inl/ramp_inl_meta.json` (`slope_mV_ns`).
- reverse=1 vs reverse=0 p05 delta: `SPICE_RESULTS_V2.md` §3 (c1 vs c2 rows),
  and the c1/c2 columns of `gcb-papers/data/readout/spice/mc_v2/*_f15e-6_c{1,2}.json`.
- The falling-ramp INL curves themselves: `ramp_inl/ramp_inl_{tt,ss,ff}_{-40,27,125}.csv`
  (`u`, `delta`).

## Viewer Conclusions

- The polarity choice is forced by the 0.8 V supply, not by preference:
  a rising source cannot be cascoded into a 0.71 V node.
- Discharge mode keeps the ramp's fragile (triode-knee) region below the used
  code range, so the cascoded sink holds a flat current.
- Choosing the wrong polarity costs measurable SNDR (~0.7 dB p05).

## Invalid Conclusions

- Waveform slopes/curvatures are schematic; the real ramp INL is 0.04–0.11 %
  of FS (see the CSVs), far smaller than any visible curvature here.
- Not a claim that charge-up is unworkable in general — only that it fails
  *this* 0.8 V rail with *this* `V_FS` and ramp span.
- Panels are not to a common absolute time scale beyond "one 256 ns window".

## Sources

- `gcb-papers/data/readout/spice/SPICE_RESULTS_V2.md` §1a, §1c, §3, §6.2
- `gcb-papers/data/readout/ramp_inl/ramp_inl_meta.json`,
  `ramp_inl_*.csv`
- `gcb-papers/data/readout/spice/mc_v2/*_f15e-6_c{1,2}.json`
- Ledger rows `readout.ramp.polarity.rising`, `readout.ramp.generator`,
  `readout.integrator`

## Render Status

`APPROVED` — SVG rendered by `figures/render_figs.py` on 2026-09-07, committed as `figures/FIG-003-ramp-polarity.svg`. Verified: XML well-formed, the burned-in string "PRELIMINARY CONCEPT — NO SILICON EXISTS" present, every label/number in this spec present in the SVG text, no viewBox overflow. Data revision: schematic — this spec is the source of truth (numbers trace onward via the Sources list).

## Disclaimer Text

"Charge-up (rejected) vs discharge (accepted) single-slope readout. Voltage
trajectories are schematic; rail head-room values and the ±1.1 % slope spread
are ngspice/ASAP7 results (`SPICE_RESULTS_V2.md`)."
