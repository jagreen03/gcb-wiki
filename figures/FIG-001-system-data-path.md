# FIG-001 — System data path

> Text specification only. No image is produced in Phase A.

## Purpose

Give a first-time reader the whole GCB fabric on one line: where a number
enters (Vortex tensor core) and where it leaves (host over MMIO), and which
repo/RTL owns each hop.

## Description

**Type / geometry.** Left-to-right block diagram, single row, 6 primary
stages, one feedback/return arrow (MMIO ↔ host). A thin band under each stage
names the owning file(s).

**Elements & labels (in order):**

1. **Vortex 3.0 TCU** — sub-box "`VX_tcu_core.result_if`". Emits PE words +
   `is_tile_final`.
2. **Q17.14 carry-save stream** — label "`M_AXIS_CS` AXI4-Stream · one record
   per tile-final · `NUM_LANES` beats · block-float 32→12". Arrow from 1→2
   annotated "RNE, saturating".
3. **Optical cascade** — label "8-input reduction cells · analog optical
   sum · noise floor reset per stage (ADR-001)".
4. **Single-slope readout** — label "discharge-mode `C_int` 2 pF · chopped/AZ
   comparator vs shared ramp · 6 GHz Gray TDC ×4-phase · 3-point calib".
   Output label "`x_hat` (Q2.16)".
5. **MMIO register block** — label "`SS_READOUT` 0xB0–0xC0 · `registers.yaml`".
6. **Host** — label "`gcb_proxy.py` safety supervisor · `gcb-dashboard` live
   view". Bidirectional arrow to 5.

**Owner band (under each stage):** 1 `gcb-rtl/integration/VX_tcu_tilefinal_tag.sv`
· 2 `gcb-rtl/integration/VX_tcu_shim_q1714.sv` · 3
`gcb-rtl/rtl/greencoyote_photonic_sequencer.sv`, `greencoyote_cs_lane_fifo.sv`
· 4 `gcb-rtl/rtl/greencoyote_ss_tdc.sv`, `greencoyote_ss_calib.sv` · 5
`gcb-rtl/rtl/greencoyote_pilot_regs.sv`, `greencoyote_axi_lite_wrapper.sv` · 6
`gcb-host/`.

**Data.** Schematic — no data binding. Illustrates
`gcb-spec/architecture.md` ("Data path" section) verbatim.

## Viewer Conclusions

- There is exactly **one** analog→digital conversion in the pipeline, at
  stage 4.
- The Vortex-side blocks (1–2) are contracts, not GCB silicon; they live in
  `gcb-rtl/integration/` and are never synthesised into the pilot.
- The register map is the single control surface between fabric and host.

## Invalid Conclusions

- Not a timing or dataflow-rate diagram — arrow length carries no latency or
  bandwidth meaning.
- Not a floorplan; stages are logical, not physical placement.
- The optical cascade (3) is a discrete-bench concept, not fabricated silicon.

## Sources

- `gcb-spec/architecture.md` — "Five repositories", "Data path"
- `gcb-spec/carry_save_streaming_contract.md` §4–§6
- `gcb-spec/vortex_integration_notes.md` §8
- `gcb-spec/docs/adr/ADR-001-cascade-adc-reset.md`
- `gcb-spec/docs/adr/ADR-005-Single-Slope-Readout.md`

## Render Status

`SPEC`. Data revision: n/a (schematic).

## Disclaimer Text

"Logical data path, not to scale. No GCB hardware has been fabricated or
measured. Vortex-side blocks are integration contracts staged in `gcb-rtl` for
review, not part of the GreenCoyote-Bay pilot build."
