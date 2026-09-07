# FIG-002 — Readout signal chain

> Text specification only. No image is produced in Phase A.

## Purpose

Expand stage 4 of FIG-001: the physical + digital chain that turns one optical
group output into a calibrated `x_hat`, with the key parameter on each hop.

## Description

**Type / geometry.** Left-to-right signal chain, one row, ~7 stages. Analog
stages drawn as circuit-ish blocks, digital stages as rounded boxes; a vertical
dashed line marks the analog|digital boundary at the comparator latch. A small
inset waveform under the ramp block shows `v_int` (held, flat) and the falling
ramp crossing it.

**Elements & labels (in order):**

1. **Photodiode** — "`I_PD` : 0.74 µA RMS, 4.45 µA FS (crest 6)".
2. **Discharge integrator** — "`C_int` = 2.0 pF, pre-charged; PD sinks current
   for 256 ns; `V_FS` = 568 mV; floor ≈ 0.2 V".
3. **Shared ramp** — "cascode NMOS sink + replica servo · falling · 4.2 mV/ns
   · 0.20–0.77 V · slope ±1.1 % over PVT".
4. **Chopped auto-zero preamp** — "2 stages · `I_tail` 30 µA · `F_chop`
   20 MHz · `C_L` 0.8 pF · gated 20 ns on the calibration-known crossing".
5. **StrongARM latch** — "decision; dashed analog|digital boundary here".
6. **Shared 6 GHz Gray TDC** — "12-bit carry-select counter · 4 phase latches
   (24 GS/s) · per-channel {gray, phase} freeze on `fire` · 64 channels".
7. **3-point calibration** — "fixed-point Horner `x_hat = C2·u² + C1·u + C0`,
   Q4.28 coeffs, Q2.16 out · bit-exact RTL ↔ golden".
   Output: "`x_hat` → `SS_READOUT` readout".

**Annotations.** Above stage 4: "total input-referred noise 53 µV (≤ 55 µV
gate)". Above stage 7: "coefficients from `SS_CAL_IDX`/`SS_CAL_DATA`; 3-pt
solve is host/firmware float".

**Data.**
- `I_PD`, `C_int`, `V_FS`, ramp slope/window: `SPICE_RESULTS_V2.md` §1, header.
- Preamp params, 53 µV total, 20 ns gate: `SPICE_RESULTS_V3.md` §3, §7, §5d.
- TDC / calib structure, bit-exact: `RTL_REPORT.md` §1–§2.
- `ss_readout_mc.py` DEFAULTS for the model-side numbers.

## Viewer Conclusions

- Integration is passive (a cap + a reset switch); the only active analog in
  the accumulate path is the comparator, and it is powered ~20 ns per
  conversion.
- The 6 GHz counter and its 4 phase latches are **shared** across 64 channels;
  each channel adds only a small enabled register.
- The calibration back-end is deterministic digital and is bit-exact between
  RTL and the Python golden model.

## Invalid Conclusions

- Not a schematic — transistor-level topology (cascode devices, chopper
  switches, StrongARM internals) is illustrative, not a netlist.
- The 53 µV is a `.noise` integral from a BSIM4 surrogate (±16 %), **not** a
  transient-noise histogram — see FIG-004 and the CONDITIONAL GO caveat.
- Waveform inset is qualitative; slope and crossing point are not to scale.

## Sources

- `gcb-papers/data/readout/spice/SPICE_RESULTS_V2.md` §1, §6
- `gcb-papers/data/readout/spice/SPICE_RESULTS_V3.md` §3, §5, §7
- `gcb-papers/data/readout/rtl/RTL_REPORT.md` §1–§4
- `gcb-spec/models/readout/ss_readout_mc.py` (`DEFAULTS`)

## Render Status

`SPEC`. Data revision: n/a.

## Disclaimer Text

"Single-slope CIS readout signal chain. Analog parameters are ngspice/ASAP7
simulation results (BSIM-CMG for the ramp, BSIM4 surrogate for the comparator
`.noise`); the digital back-end is verified bit-exact in Icarus. No silicon."
