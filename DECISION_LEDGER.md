# GCB Decision Ledger

Every architectural decision with a recorded state. One table.

**Status values:** `Accepted` · `Rejected` · `Superseded` (a better option
replaced it) · `Retired` (branch closed, no successor) · `Open`.
`[Unfiled]` = no evidence document exists yet.

**Dates** are the commit date of the governing evidence, or — for pre-SPICE
architectural audits that were never committed as standalone docs (the ICO /
ΔΣ / ADC-energy-floor work) — the session date on which the call was made
(2026-09-06, approximate). ADR-001 predates this work (2026-08-28); the bench
parameter sheet is 2026-09-02; the readout SPICE / RTL / ADR-005 work all
landed 2026-09-07.

Evidence-doc shorthand:
- **SR1 / SR2 / SR3** = `gcb-papers/data/readout/spice/SPICE_RESULTS{,_V2,_V3}.md`
- **RTL** = `gcb-papers/data/readout/rtl/RTL_REPORT.md`
- **ANL** = `gcb-papers/data/readout/ANALYSIS.md`
- **ADR-00x** = `gcb-spec/docs/adr/ADR-00x-*.md`
- **DD-001** = `gcb-spec/registers.yaml` → `design_decisions:`
- **MC** = `gcb-spec/models/readout/ss_readout_mc.py`
- **BENCH** = `gcb-spec/bench_emulation_parameters.md` ⇄ `gcb-rtl/sim/mmi_tree_model.py`
- **SPENV** = `gcb-spec/docs/spice_setup.md` + `gcb-spec/scripts/setup_spice_env.sh`
- **XYCE** = `gcb-spec/models/readout/spice/xyce_build_notes.md`

| Path | Status | Evidence Doc | One-Line Reason | Date |
|---|---|---|---|---|
| `readout.architecture` | Accepted | ADR-005 | Single-slope CIS wins every gate: one silicon conversion per output, passive integration, bit-exact RTL, ~0.55 fJ/MAC. | 2026-09-07 |
| `readout.integrator` | Accepted | SR2 §6.2–6.3 | 2.0 pF `C_int`, discharge mode — smallest cap keeping the 1.25×FS ramp under the 0.8 V rail with ~110 mV margin. | 2026-09-07 |
| `readout.ramp.generator` | Accepted | SR2 §1 | Cascoded NMOS sink on `C_ramp`, replica-servo reference — slope 4.18–4.22 mV/ns across 9 PVT corners (±1.1 %), INL 0.04–0.11 % FS raw. | 2026-09-07 |
| `readout.comparator.preamp` | Accepted | SR3 §3, §7 | Chopped + auto-zeroed 2-stage preamp, `I_tail` = 30 µA/stage — quietest usable point (τ ≈ 21 ns); total noise 53 µV ≤ 55 µV with a 20 MHz chopper. | 2026-09-07 |
| `readout.comparator.gating` | Accepted | SR3 §5d; `registers.yaml` SS_TDC_CTRL | 20 ns power-gate window placed on the calibration-known crossing (`code·T_LSB`), never triggered by a comparator output. | 2026-09-07 |
| `readout.tdc` | Accepted | RTL §2; MC | 12-bit coarse + 2-bit phase (6 GHz × 4-phase = 24 GS/s). 10-bit alone fails the crest factor. | 2026-09-07 |
| `readout.calibration` | Accepted | RTL §1; MC | 3-point (quadratic) cal through {0, x_ref/2, x_ref}: +0.6 dB median / +1.6 dB p05 vs 2-point, zero energy. | 2026-09-07 |
| `tdc.counter` | Accepted | DD-001; RTL §3 | Carry-select 12-bit Gray counter — ~112 ps path at SS/125 °C, ~55 ps slack. | 2026-09-07 |
| `tdc.clock` | Accepted | RTL §3c; DD-001 | CML for the 4-phase 6 GHz clock generation + trunk; static CMOS has unacceptable skew and dynamic power at 6 GHz. | 2026-09-07 |
| `tdc.logic` | Accepted | RTL §3c | Counter, phase latches, capture and calibration stay static CMOS — one CML island only. | 2026-09-07 |
| `analog.cascade.stage-reset` | Accepted | ADR-001 | Reset the analog noise floor at every cascade stage boundary — converts a physics wall into reserved headroom bits. | 2026-08-28 |
| `toolchain.spice` | Accepted | SPENV | Self-built ngspice-44 `--enable-osdi` + OpenVAF BSIM-CMG 111 + ASAP7 r1p7, no root. | 2026-09-07 |
| `readout.encode.ico.tail-injection` | Superseded | ADR-005 (context); SR3 | Unprovable; encodes charge in f(I) requiring impossible PVT calibration. | 2026-09-06 |
| `readout.encode.ico.c-node` | Rejected | [Unfiled] | 0.5 fF oscillator node — `I_PD,FS/I_bias` modulation ratio too high; INL uncontrollable across PVT. | 2026-09-06 |
| `readout.convert.sigma-delta` | Retired | ADR-005 | Audit-only branch; "no free oversampling" charge-domain analysis enabled the fast pivot. | 2026-09-07 |
| `readout.convert.tia-adc` | Rejected | SR1; ADR-005 | Per-channel TIA + multi-bit ADC — ADC energy floor exceeds the 0.02 pJ/MAC digital baseline at any buildable reduction depth. | 2026-09-06 |
| `readout.tdc.resolution.10b` | Rejected | SR2; ANL | 10-bit quantization fails on the crest factor; 12-bit + 4-phase required. | 2026-09-06 |
| `readout.comparator.cds` | Rejected | SR1 §4; ANL | Loses in this specific architecture because comparator dominates kT/C and 1/f. | 2026-09-06 |
| `readout.chopper.pd` | Rejected | SR3 | 300 MHz photodiode chopper is a cyclostationary mixer on the photocurrent; replaced by a MHz-range CIS chopper on the preamp. | 2026-09-06 |
| `readout.ramp.polarity.rising` | Rejected | SR2 §1c; SR1 | Rising PMOS ramp — a 0.72 V ramp top from a 0.8 V rail leaves < 80 mV, cannot be cascoded. | 2026-09-07 |
| `readout.ramp.dac` | Rejected | SR1 | Scoring artifact retracted (42 dB vs 58 dB) based on actual signal distribution. | 2026-09-07 |
| `readout.integrator.cap.1pF` | Rejected | SR1 §3; SR2 §6.2 | 1 pF `C_int` — `V_FS` too large, the 1.25×FS ramp collides the 0.8 V rail. | 2026-09-07 |
| `tdc.counter.ripple` | Rejected | DD-001; RTL §3 | Ripple-carry 12-bit Gray counter ~195 ps > 166.7 ps at SS/125 °C; a TT-only timing run hides the failure. | 2026-09-07 |
| `readout.comparator.tail.15uA` | Rejected | SR3 §5b | 15 µA comparator tail — preamp τ ≈ 40 ns > the ~30 ns ramp window; cannot resolve the crossing in time. | 2026-09-07 |
| `toolchain.spice.xyce` | Rejected | XYCE; SR3 §6 | Xyce via conda-forge Trilinos — Trilinos build lacks NOX/LOCA and EpetraExt/BTF; a from-source Trilinos build was out of scope. | 2026-09-07 |
| `readout.comparator.noise.spectre-histogram` | Open | SR3 §9 | A commercial (Spectre, native BSIM-CMG) transient-noise histogram to close the ±16 % surrogate uncertainty on the 53 µV number — lifts CONDITIONAL GO → GO. | 2026-09-07 |
| `readout.comparator.preamp.gmc-fallback` | Open | SR3 §11 | g_m–C integrating preamp — documented, unbuilt; decouples gain from the 0.8 V load headroom. Build only if the Spectre histogram breaches 55 µV. | 2026-09-07 |
| `optical.cell.combiner-loss` | Open | BENCH | Combiner / insertion loss regime of the discrete-component 8-input reduction cell — to be measured on the bench, not modelled. | 2026-09-02 |
| `optical.cell.fanin` | Open | [Unfiled] | First reduction cell fan-in: 4:1 vs 8:1 not yet chosen. | 2026-09-02 |
| `doctrine.pbg.telemetry-vector-space` | Accepted | `09_pbg_telemetry_vector_space.md`; TKT-005 | PBG taxonomy formalised as a 3D bipolar vector space — X Specification (Green/Red), Y Quality (Blue/Yellow), Z Emergence (Purple/Light-Gray); `‖T‖₂ ∈ [0, √3]`; `pgvector(3)` schema + ticket-frontmatter contract for telemetry clustering. Six colour names unchanged. | 2026-09-08 |
