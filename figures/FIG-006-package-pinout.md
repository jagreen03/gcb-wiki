# FIG-006 — Package / pinout (concept)

> Text specification only. No image is produced in Phase A.
> **Concept-level.** Nothing in this figure is a committed package decision.

## Purpose

Give the datasheet a placeholder "what does the part physically look like"
figure: the co-packaged optics arrangement and the external interface groups,
so a reader can see where fiber, host, power, and bench I/O attach — without
implying any pin count or footprint is fixed.

## Description

**Type / geometry.** Two side-by-side panels.

**Panel A — package cross-section (schematic, not to scale).**
Bottom-to-top stack:
1. Organic / Si substrate with BGA field (label "host + power balls — count
   TBD").
2. Silicon interposer.
3. On the interposer, side by side: **pilot die** (FPGA/ASIC, digital + the
   single-slope readout + MMIO) and **photonic die** (Mach–Zehnder reduction
   mesh, PDs, thermal tuners).
4. **Fiber-attach block** on the photonic-die edge — label "WDM fiber ribbon,
   N lanes — N TBD".
5. Lid / heat spreader over the pilot die (label "thermal path — the photonic
   die runs near-isothermal, see ADR-001 rationale").

**Panel B — external interface groups (labelled boxes around a package
outline; NO pin numbers).**
- **Host** — "PCIe or AXI4 to host SoC; MMIO register window
  (`registers.yaml`, 0x00–0xC0)".
- **Optical** — "WDM input fiber(s) → reduction mesh; monitor tap out".
- **Bench loopback** — "parallel DAC out / SPI-SAR-ADC in
  (`greencoyote_dac_if.sv` / `greencoyote_adc_if.sv`) — present for bring-up,
  not a product datapath".
- **Clock** — "6 GHz reference in (or on-die PLL ref); 4-phase generated
  on-die in CML".
- **Power** — "core 0.7 V (logic), 0.8 V (readout analog), photonic tuner
  rail, PD bias — currents TBD".
- **Debug** — "JTAG / scan".

**Data.** Schematic — no data binding. Interface groups are read from
`gcb-spec/architecture.md` (five-repo / data-path), `registers.yaml` (MMIO
window), and the bench-loopback RTL headers. Every count, voltage tolerance,
and dimension is TBD.

## Viewer Conclusions

- GCB is a **co-packaged** photonic + electronic part: two dies on an
  interposer, fiber attached at the photonic-die edge.
- The bench DAC/ADC pins are a bring-up aid, not a production interface.
- The 4-phase 6 GHz clock is generated inside the package (CML island); only a
  reference enters.

## Invalid Conclusions

- **Not a pinout.** No pin count, ball map, footprint, or package size is
  implied or shown.
- Not a mechanical drawing — the stack order is illustrative; layer counts and
  thicknesses are unspecified.
- Not a claim that a package has been designed, quoted, or built.

## Sources

- `gcb-spec/architecture.md` — "Five repositories", "Data path"
- `gcb-spec/registers.yaml` — MMIO address window
- `gcb-rtl/rtl/greencoyote_dac_if.sv`, `greencoyote_adc_if.sv` — bench loopback
- `gcb-spec/docs/adr/ADR-001-cascade-adc-reset.md` — thermal / stage-reset
  rationale
- `gcb-wiki/product/GCB_Probable_Silicon_Product_10kft.md` — VISION (co-package
  framing)

## Render Status

`SPEC`. Data revision: n/a (concept schematic).

## Disclaimer Text

"Concept package arrangement — schematic, not to scale, not a pinout. No GCB
package has been designed or fabricated. All pin counts, dimensions, voltages,
and currents are TBD."
