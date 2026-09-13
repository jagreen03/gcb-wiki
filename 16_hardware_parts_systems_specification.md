# Hardware Parts — Systems Specification

**Scope:** the complete functional set of hardware parts across the
GreenCoyote-Bay / ODIN_Bridge program — not just the optical WDM transport
epic (`TKT-019`, documented in [`14-Optical-Transport-Doctrine.md`](14-Optical-Transport-Doctrine.md)
and [`15_hardware_inventory_and_testability.md`](15_hardware_inventory_and_testability.md)).
This document cross-references **11 sibling repositories** on disk
(`gcb-spec`, `gcb-rtl`, `gcb-host`, `gcb-dashboard`, `gcb-papers`,
`gcb-python-orchestrator`, `gcb-photonic-qam-v2`, `gcb-pic-core`,
`gcb-analog-rx`, `gcb-wdm-transceiver`, plus the vendored `vortex/` tree) and
every claim below was checked against the actual file in that repository at
the time of writing — no part's status is asserted from memory of a prior
summary.

## Epistemic status — read this before anything else below

**No silicon has been fabricated anywhere in this program.** Every digital
block is at most **RTL, simulated** (Verilator or Icarus Verilog, no
synthesis-to-silicon). Every analog/mixed-signal block is at most
**SPICE-characterized on an academic predictive PDK** (ASAP7, a 7 nm
*research* design kit with no foundry behind it — not a commercial process).
Every board/chassis/backplane image that exists is explicitly labeled
**"AI-generated concept renders... not photographs or CAD"** by its own
repository README — zero mechanical or electrical engineering content. The
RISC-V/GPGPU compute core is third-party, vendored source (Vortex), itself
never fabricated by this program. Nothing below should be read as, or
presented to a third party as, evidence of a working physical system.

Completion-level vocabulary used throughout (consistent with
[`14-Optical-Transport-Doctrine.md`](14-Optical-Transport-Doctrine.md)'s
labels, extended with the levels this broader survey actually needs):

| Label | Meaning |
|---|---|
| **CONCEPT ONLY** | Named/described in a doc; no model, RTL, or layout exists. Includes AI-rendered concept art. |
| **BEHAVIORAL MODEL** | A Python/Verilog-A numerical model exists; no RTL or SPICE netlist. |
| **RTL, SIMULATED** | Synthesizable RTL exists and passes a testbench in a free simulator (Verilator/Icarus). No synthesis, no silicon. |
| **SPICE-CHARACTERIZED (academic PDK)** | A transistor-level netlist has been simulated (ngspice/Xyce) on ASAP7 and Monte-Carlo'd across PVT corners. No commercial PDK, no tapeout. |
| **CONDITIONAL GO** | A formal gate-review verdict (`gcb-spec` ADR process): all quantitative gates pass, but one modeling uncertainty is still open (see the part's own entry). |
| **FABRICATED / CHARACTERIZED ON BENCH** | Not used anywhere in this document — no part has reached this level. |

---

## 1. Complete functional set — identification

| # | Part | Category | Repository / location |
|---|------|----------|------------------------|
| 1 | Vortex 3.0 RISC-V/GPGPU compute core | Silicon die (third-party, vendored) | `vortex/` (external) |
| 2 | Q17.14 tile-writeback integration shim | Digital IC block (RTL) | `gcb-rtl/integration/` |
| 3 | INT4 Tensor Compute Engine (MAC array, SRAM, DMA/dispatch) | Digital IC block (RTL) | `gcb-wdm-transceiver/rtl/` |
| 4 | DWDM optical transport datapath | Digital IC block (RTL) | `gcb-wdm-transceiver/rtl/` |
| 5 | Photonic QAM V2.0 digital receiver prototype | Digital IC block (RTL) | `gcb-photonic-qam-v2/rtl/` |
| 6 | Digital Pilot FPGA controller | Digital IC block (RTL, FPGA target) | `gcb-rtl/rtl/` |
| 7 | Streaming Tensor DMA | Digital IC block (RTL) | `gcb-rtl/rtl/` |
| 8 | Photonic Integrated Circuit (PIC) — MZI mesh + photodiodes | Photonic IC | `gcb-pic-core/` |
| 9 | DWDM laser/modulator bank | Photonic/electro-optic | `gcb-spec/` (bench params only) |
| 10 | On-die mixed-signal Rx front-end (integrator + comparator) | Mixed-signal block | `gcb-analog-rx/`, `gcb-spec/models/readout/` |
| 11 | Shared TDC + calibration digital back-end | Mixed-signal/digital IC block (RTL) | `gcb-rtl/rtl/` |
| 12 | Phase I bench receiver chain (COTS PD + TIA + SAR ADC) | Board-level / COTS electronic IC | `gcb-rtl/rtl/greencoyote_adc_if.sv` + COTS (unspecified) |
| 13 | Bench DAC stimulus interface | Board-level / COTS electronic IC | `gcb-rtl/rtl/greencoyote_dac_if.sv` + COTS (unspecified) |
| 14 | Host driver + MMIO control plane | Board-level / software | `gcb-host/` |
| 15 | Compiler/scheduler + telemetry persistence | Board-level / software | `gcb-python-orchestrator/` |
| 16 | Monitoring dashboard + hardware-visualization pipeline | Board-level / software | `gcb-dashboard/` |
| 17 | Mechanical chassis, backplane, and carrier cards | Back-plane / mechanical | `gcb-spec/concepts/` |

Parts 1–13 are required for a working optical-compute signal chain; 14–16 are
required control/observability infrastructure for *operating* that chain
(not silicon themselves, included because the brief asks for "board-level
component... required for a working system"); 17 is listed for completeness
and is, in its entirety, concept art with no engineering content.

---

## 2–4. Part number, status, functionality, systems data, and testability

Sections 2, 3, and 4 of the brief are combined below, per part, to avoid
triplicating each part's identity — each entry carries all three explicitly
labeled.

### Part 1 — Vortex 3.0 RISC-V/GPGPU compute core

**Part number / designation:** none assigned by this program — third-party,
vendored source tree at `vortex/` (Georgia Tech, open-source, MIT-class
license; see `vortex/README.md`). Not a `gcb-*` repository.
**Completion status:** upstream project is a mature, multi-backend
(`simx` C++ sim / RTL sim / physical FPGA) open-source GPGPU; **this
program's own integration with it is RTL-simulated only** — no FPGA or ASIC
bring-up of Vortex has been performed under GCB. The specific interface this
program taps (`VX_tcu_core.result_if` tensor-core writeback) is documented,
source-verified against the cloned tree, in `gcb-spec/vortex_integration_notes.md`.
**Available now:** the `result_if` writeback format (`tcu_result_t`, fp32/int32),
required `VX_CFG_*` build flags, and the Q17.14 shim that consumes it (Part 2).
**Missing:** any GCB-side bring-up of Vortex itself on real FPGA/ASIC;
end-to-end co-simulation of a full Vortex core driving the shim is not
evidenced in this survey.

- **Role:** general-purpose compute tier; emits a resolved partial-sum tile
  (tensor-core accumulator) at each MMA tile boundary, which the Q17.14 shim
  converts for the optical path (`00_system_context.md`).
- **Interfaces:** `VX_tcu_core.result_if` (Vortex-native); fp32/int32 tensor
  result words.
- **Data formats:** fp32 / int32 accumulator words (Vortex-native), pre-shim.
- **Performance:** not characterized by this program (upstream project's own
  figures are out of scope here).
- **Dependencies:** none upstream (it is the root of the compute chain);
  downstream consumer is Part 2.
- **Config/mode controls:** `VX_CFG_*` build-time flags (per
  `vortex_integration_notes.md`) select the TCU configuration this program
  targets.
- **Standalone testability — silicon:** N/A — no GCB-fabricated silicon;
  upstream Vortex ships its own `simx` simulator, RTL testbenches, and
  FPGA bitstream flow independently of this program.
- **Standalone testability — electronics:** not applicable at the GCB level;
  any physical test would use upstream Vortex's own FPGA bring-up flow
  (Xilinx/Altera boards per `vortex/README.md`), not a GCB-specific fixture.

### Part 2 — Q17.14 tile-writeback integration shim

**Part number / designation:** `VX_tcu_shim_q1714.sv`,
`VX_tcu_q1714_convert_pkg.sv`, `VX_tcu_tilefinal_tag.sv` (+
`VX_tcu_tilefinal_sva.sv` / `_bind.sv` for formal assertions) —
`gcb-rtl/integration/`.
**Completion status:** **RTL, simulated.** Testbenches exist
(`integration/tb/tb_VX_tcu_q1714_convert.sv`, `tb_VX_tcu_shim_q1714.sv`,
`VX_tcu_tilefinal_tag_obs.sv`), CI-gated via
`.github/workflows/integration-tb.yml`.
**Available now:** fp32/int32 → Q17.14 fixed-point conversion, tile-final
tagging/observation logic. **Missing:** no synthesis/timing closure
evidenced for this block specifically (separate from the Vivado OOC step
noted for Part 6).

- **Role:** bridges Vortex's own accumulator word format to the streaming
  contract the photonic pilot consumes — the "Integration Boundary" block in
  `00_system_context.md`.
- **Interfaces:** upstream — `VX_tcu_core.result_if`; downstream — the
  32-bit Q17.14 `TDATA` payload of `carry_save_streaming_contract.md` §6.1
  (framing sideband `TLAST`/`TID`/`TUSER={nan_inf,clamp,cell_lane}`/`TKEEP`
  carried separately, per the same section).
  **Correction to a common simplification:** `00_system_context.md` itself
  flags its own diagram's "40-bit AXI4-Stream" label as conceptual — the
  actual payload is 32 bits plus sideband, not a 40-bit bus.
- **Data formats:** fp32/int32 in; Q17.14 fixed-point out.
- **Performance:** not separately characterized; inherits Part 6's pipeline
  timing once integrated.
- **Dependencies:** Part 1 (source data), Part 6 (consumer).
- **Config/mode controls:** none beyond the `VX_CFG_*` build-time selection
  inherited from Part 1's integration.
- **Standalone testability — silicon:** N/A, this is RTL only; test via the
  existing Icarus/Verilator testbenches listed above — no chip exists to
  probe.
- **Standalone testability — electronics:** none required yet (pre-silicon);
  the CI-run testbenches are the complete present-day verification surface.
  Equipment: a free Verilog/SystemVerilog simulator only (no lab equipment).

### Part 3 — INT4 Tensor Compute Engine

**Part number / designation:** 13 RTL modules in
`gcb-wdm-transceiver/rtl/`: `gcb_int4_mac_array.sv`, `gcb_mac_tile_array.sv`,
`gcb_operand_stage.sv`, `gcb_tile_requantize.sv`, `gcb_tensor_memory_engine.sv`,
`gcb_tensor_operand_sram.sv`, `gcb_tensor_sram_controller.sv`,
`gcb_sram_sp1w1r.sv`, `gcb_tensor_broadcast_fabric.sv`,
`gcb_tensor_dma_arbiter.sv`, `gcb_tensor_address_translation.sv`,
`gcb_tensor_command_wiring.sv`, `gcb_max_reduce.sv`, `gcb_inline_vector_unit.sv`,
plus the instruction-side `gcb_opcode_dispatcher.sv`,
`gcb_instruction_fetch_queue.sv`, `gcb_vortex_command_processor.sv`,
`gcb_execution_scheduler.sv`.
**Completion status:** **RTL, simulated and lint-clean.** Confirmed this
session: `bash sim/lint.sh` passes 36/36 tops under Verilator `-Wall`, and
this engine's own cocotb suites (`Makefile.mac_tile_array`,
`Makefile.tile_requantize`, `Makefile.operand_stage`,
`Makefile.stage_mac_requant`, `Makefile.mac_requant_chain`,
`Makefile.compute_e2e`, `Makefile.sram`, `Makefile.sram_partial`,
`Makefile.max_reduce`) are part of the repository's own regression surface.
**Available now:** INT4 × INT4 → INT16 MAC tile array, block-float
requantization, operand staging/broadcast, SRAM controller + double-buffered
operand SRAM, DMA arbitration/address translation, and a 70B-transformer-class
workload trace validated against these parameters (`gcb-wiki/06`).
**Missing:** no synthesis/PPA closure beyond Yosys cell-count estimates
(`10_open_source_eda_toolchain.md`); no silicon.

- **Role:** the electrical INT4 compute substrate — the "golden reference"
  matrix-multiply path the photonic path is meant to approximate/validate
  against (per `gcb-photonic-qam-v2/intent.md`).
- **Interfaces:** AXI-class command/data wiring internally
  (`gcb_tensor_command_wiring.sv`); consumes operand streams from the DMA
  tier (Part 3's own `gcb_tensor_dma_arbiter.sv`, distinct from Part 7's
  `greencoyote_streaming_dma.sv` — these are two *different* DMA blocks in
  two different repositories, not the same part).
- **Data formats:** INT4 operand pairs → INT16 accumulate; block-floating-point
  requantization at tile boundaries (`gcb_tile_requantize.sv`).
- **Performance targets:** sized against a 4096×4096×4096 INT4 matmul and a
  LLaMA-class 70B FFN trace (`05_photonic_memory_dataflow.md`,
  `06_70B_transformer_workload_trace.md`) — 9 GB/s GDDR7 bandwidth, 4.5 MB
  engine-local SRAM target; these are **derived sizing targets**, not
  measured silicon performance.
- **Dependencies:** upstream operand supply (DMA/memory tier, outside this
  document's scope); downstream consumers include Part 4 and Part 11's
  workload.
- **Config/mode controls:** `K_MAX = 16` unification parameter
  (`03_dual_mode_integration.md`); opcode dispatch selects `OP_GEMM` /
  `OP_SOFTMAX` / `OP_SCALE_DIAG` (`08_instruction_set_architecture.md`).
- **Standalone testability — silicon:** N/A, no chip. RTL-level standalone
  testing is already the repository's own per-module Makefile targets listed
  above — each module has its own dedicated cocotb testbench runnable in
  isolation from the rest of the engine.
- **Standalone testability — electronics:** none required pre-silicon.
  Equipment: Verilator + cocotb (Python) only. No special test structures
  needed beyond the existing per-module tb_top wrappers.

### Part 4 — DWDM optical transport datapath (EPIC `TKT-019`)

**Part number / designation:** 11 modules in `gcb-wdm-transceiver/rtl/`:
`gcb_wavelength_router.sv`, `gcb_bitplane_tx_mapper.sv`,
`gcb_dwdm_tx_packager.sv`, `gcb_dwdm_payload_mux.sv`, `gcb_dwdm_deskew.sv`,
`gcb_dwdm_deskew_cdc.sv`, `gcb_dwdm_async_skew_fifo.sv`,
`gcb_dwdm_payload_demux.sv`, `gcb_rx_digital_recombiner.sv`,
`gcb_dwdm_axis_wrapper.sv`, `gcb_dwdm_ctrl_axi.sv`,
`gcb_dwdm_transceiver_top.sv`, `gcb_dwdm_dualmode_top.sv`, `gcb_color_mux.sv`.
**Completion status:** **RTL, simulated — the most heavily adversarially
tested block in the program.** This is the subject of `14-Optical-Transport-Doctrine.md`
and `15_hardware_inventory_and_testability.md` in full depth; summarized
status: CRC32/length-mismatch integrity mitigation **PROVEN — DIGITAL
SIMULATION, TESTED CONDITIONS** (`TKT-019.10`); control-plane anti-aliasing
(session-nonce-tagged abort) **PROVEN** under adversarial reset-boundary
construction (`TKT-019.16`–`.18`); a hardened, cross-coupled reset
synchronizer closing a CONFIRMED data-plane reset-aliasing hazard **PROVEN**
(`TKT-019.20`–`.21`); **one OPEN DEFECT remains, not patched**: epoch-tag
aliasing after a full `mod-2^EPOCH_W` wrap is accepted as current data
(`TKT-019.11`, re-confirmed by direct reproduction in the reconstructed
`test_wdm_deskew_cdc.py` this session). Lint: 36/36 tops clean.
**Available now:** N_LAMBDA-parameterized (2–64) wavelength routing, bit-plane
INT4→antipodal mapping, epoch-isolated multi-lane deskew with a bounded
(`ALIGN_TIMEOUT`) failure path (`stuck`/`txn_void`, named culprit — the
explicit improvement over the single-clock predecessor's unbounded wait),
dual-mode (A/B) payload muxing, AXI-Stream wrapper, control-plane abort with
generation+session tagging. **Missing:** the data-plane sibling of the
reset-aliasing fix is closed only at the FIFO/CDC level this session, not
yet synthesized into a finalized wire-format decision between per-word
session tagging (Candidate A) vs. the now-proven reset-time drain hardening
(Candidate C) — `TKT-019.19`'s own comparison remains the open disposition
item; the epoch-rollover defect above is explicitly unfixed.
- **Role:** carries INT4 tensor operands across simulated DWDM lanes with
  bounded-latency deskew and integrity-checked reassembly — the transport
  layer between the compute tier (Part 3) and the optical/QAM receiver
  (Part 5/8).
- **Interfaces:** per-lane independent write clocks + one shared
  reconstruction-domain read clock (the CDC boundary this whole epic
  centers on); AXI-Stream egress (`gcb_dwdm_axis_wrapper.sv`); AXI control
  (`gcb_dwdm_ctrl_axi.sv`).
- **Data formats:** `color_word_t` packed struct (`packed_a`, `packed_b`,
  `wavelen_id`, `is_tile_final`, `valid`; 136 bits at the 4-lane bring-up
  geometry); epoch tag, `EPOCH_W=4` (mod-16) at bring-up.
- **Performance/geometry:** bring-up `MAX_SKEW_CYCLES=16`,
  `ALIGN_TIMEOUT=32`; Mode A (271 B) / Mode B (1024 B) payload geometries.
  These are **bring-up parameters**, explicitly flagged in-repo as
  placeholders pending a measured PIC receiver spec, not validated physical
  figures.
- **Dependencies:** Part 3 (operand source), Part 8/9 (the photonic layer
  this datapath stands in for digitally — **no actual optical hardware is
  driven by this RTL**; "wavelength," "lane," and "skew" here are digital
  simulation constructs modeling an assumed photonic CDC scenario).
- **Config/mode controls:** `channel_enable` (per-lane quasi-static mask),
  Mode A/B select, `EPOCH_W`/`MAX_SKEW_CYCLES`/`ALIGN_TIMEOUT` as
  elaboration-time parameters.
- **Standalone testability — silicon:** N/A, no chip. Standalone RTL testing
  is this repository's own normal mode of operation — every sub-block
  (`gcb_dwdm_async_skew_fifo.sv` alone, `gcb_dwdm_deskew_cdc.sv` alone,
  `gcb_dwdm_payload_mux.sv` alone) has its own dedicated cocotb Makefile
  (`Makefile.wdm_deskew_cdc`, `Makefile.wdm_payload_mux`,
  `Makefile.wdm_link_integration`, `Makefile.wdm_lambda_sweep`) runnable in
  complete isolation, with purpose-built adversarial test suites (see
  `15_hardware_inventory_and_testability.md` for the full testability
  matrix).
- **Standalone testability — electronics:** none required; this is a pure
  digital simulation of a CDC/transport problem, not a physical transceiver.
  Equipment: Verilator 5.032 + cocotb 1.9.2 (the pinned toolchain,
  `10_open_source_eda_toolchain.md`) only.

### Part 5 — Photonic QAM V2.0 digital receiver prototype

**Part number / designation:** `gcb_bitplane_tx_mapper.sv`,
`gcb_wavelength_router.sv`, `gcb_qam_datapath_top.sv`,
`gcb_qam_axis_wrapper.sv`, `gcb_rx_digital_recombiner.sv` —
`gcb-photonic-qam-v2/rtl/`. **This is the ORIGINAL of the modules forked
into Part 4** (`gcb_bitplane_tx_mapper.sv`, `gcb_wavelength_router.sv`,
`gcb_rx_digital_recombiner.sv`, `gcb_qam_datapath_top.sv`) — confirmed via
`gcb-photonic-qam-v2/README.md`'s own provenance note: **treat the two
repositories' copies as independent forks, not a synced mirror**; a fix in
one is not automatically present in the other. `gcb_qam_axis_wrapper.sv` has
no counterpart in Part 4 at all.
**Completion status:** **RTL + per-module testbenches + a numerical model**
(`model/photonic_qam_sim.py`, with findings recorded in `model/RESULTS.md`).
Explicitly, per its own README: **"No claim of physical/optical feasibility
is made by the RTL or the numerical model alone."**
**Available now:** complex-field/impairment arithmetic validated numerically
ahead of RTL commitment (Invariant #4 of `intent.md`); per-module
Verilator testbenches (`sim/lint.sh`, `sim/run_tb.sh`) plus a DPI optical-mesh
behavioral model (`sim/optical_mesh_dpi.cpp`). **Missing:** any optical
hardware validation; reconciliation of this repo's own fix history against
Part 4's diverged fork (not attempted by either repo, per the provenance
note).
- **Role:** independent coherent QAM constellations per DWDM color, so the
  passive photonic matrix performs `E_out = H · E_in` directly on the
  complex optical field — the V2.0 alternative to V1.0's purely electrical
  INT4 broadcast (Part 3/4).
- **Interfaces:** AXI-Stream (`gcb_qam_axis_wrapper.sv`); DPI-C boundary to
  the optical-mesh behavioral model for simulation only.
- **Data formats:** complex-field QAM symbols; bit-plane-mapped INT4 source
  operands (shared convention with Part 4's `gcb_bitplane_tx_mapper.sv`,
  pre-fork).
- **Performance:** numerically modeled impairments only — see
  `model/RESULTS.md` for what was actually measured vs. assumed; no RTL
  timing/PPA figures collected in this survey.
- **Dependencies:** conceptually upstream of Part 8/9 (the physical photonic
  layer it is written to eventually drive); no actual dependency exists yet
  since neither the PIC (Part 8) nor the laser bank (Part 9) has a model
  mature enough to close the loop.
- **Config/mode controls:** none beyond per-testbench parameterization.
- **Standalone testability — silicon:** N/A, no chip.
- **Standalone testability — electronics:** none required; Verilator +
  the Python numerical model (`model/photonic_qam_sim.py`) is the complete
  present-day test surface, runnable with no lab equipment.

### Part 6 — Digital Pilot FPGA controller

**Part number / designation:** `greencoyote_top.sv`,
`greencoyote_axi_lite_wrapper.sv`, `greencoyote_pilot_regs.sv`,
`greencoyote_photonic_sequencer.sv` — `gcb-rtl/rtl/`.
**Completion status:** **RTL, simulated; targeted at a physical FPGA shell
(Xilinx Alveo U55C) but not bench-verified on one.**
`greencoyote_axi_lite_wrapper.sv`'s own header states compatibility with
"the Alveo U55C Vitis shell AXI-Lite control port" as a design target, not a
confirmed bring-up. CI-gated Icarus Verilog testbench
(`sim/greencoyote_tb.sv`, workflow `pilot-tb.yml`) covers "register block +
reduction FSM + DAC/ADC roundtrip." A separate Vivado out-of-context timing
check exists as a distinct downstream step (per the workflow's own header
comment) — **this is the one part of the program with evidence of having
been run through a commercial synthesis/timing tool**, though no indication
in this survey that it has been loaded onto physical FPGA fabric.
**Available now:** MMIO register block (0x00–0xA8), AXI4-Lite front door,
8-channel optical-reduction sequencer state machine
(`IDLE→NORMALIZE→FIRE→CAPTURE→PASS_CHECK→LOAD_PASS2→CAPTURE2→DONE`) with a
9-stage (`BFP_LAT`) block-floating-point normalization pipeline and 2-pass
cascaded reduction for 14-GPU-class workloads. **Missing:** confirmed
physical FPGA bring-up; resolution of `registers.yaml`'s own tracked
DEFECT-002–004 (RTL-hygiene items distinct from DEFECT-001, which **is**
resolved — address width widened 6→8 bits).
- **Role:** the deterministic controller orchestrating DAC fire → optical
  propagation → ADC capture → ratiometric reconstruction — the "Digital
  Pilot" block of `00_system_context.md`.
- **Interfaces:** AXI4-Lite (host MMIO); internal fire-strobe/capture timing
  to Parts 12/13 (bench PD/TIA/ADC and DAC); crossbar routing registers
  (0x18/0x1C) to the optical mesh (Part 8/9, conceptually).
- **Data formats:** precision-mode-selectable packing — INT4 / FP4 / FP8 /
  BF16 (`PRECISION_MODE.MODE_SEL`).
- **Performance:** not independently benchmarked; timing figures exist only
  in the Vivado OOC report set (`build/reports/timing_route*.rpt` — present
  on disk, not characterized in this document; treat as a synthesis-tool
  output, not a silicon measurement).
- **Dependencies:** Part 2 (upstream data via the streaming contract), Part
  7 (inbound DMA), Parts 12/13 (physical bench I/O).
- **Config/mode controls:** `PRECISION_MODE` (0x00), `GLOBAL_CAL` (0x04),
  per-channel `CH_GAIN_TRIM` (0x08/0x0C), reduction control/status (0x10),
  interrupt control (0x14), crossbar routing (0x18/0x1C).
- **Standalone testability — silicon:** N/A, no ASIC. For the FPGA target
  specifically: standard Xilinx bitstream bring-up on an Alveo U55C would be
  required to test this "chip" in the sense the brief means for an FPGA —
  not yet performed per this survey.
- **Standalone testability — electronics:** **mixed digital + the bench
  analog loopback it's designed to drive.** Equipment for a real bring-up:
  an Alveo U55C card + host PCIe slot, a logic analyzer or ILA (Vivado's own
  integrated logic analyzer) for on-FPGA signal capture, and Parts 12/13's
  own bench hardware (SAR ADC eval board + parallel DAC) to close the loop
  end-to-end. Pre-bring-up, the complete test surface is
  `sim/run_pilot_tb.sh` (Icarus) — no lab equipment needed.

### Part 7 — Streaming Tensor DMA

**Part number / designation:** `greencoyote_streaming_dma.sv`,
`greencoyote_dma_walker.sv`, `greencoyote_dma_axi_master.sv`,
`greencoyote_cs_lane_fifo.sv` — `gcb-rtl/rtl/`.
**Completion status:** **RTL, simulated.** `tb_dma_integration.sv`
(`sim/run_dma_tb.sh`), CI-gated. Geometry explicitly marked **LOCKED** against
`gcb-spec/docs/optical_geometry_spec.md` v1.0.0.
**Available now:** 32-byte descriptor walker → 4 KiB-aligned AXI4 INCR
bursts; two 512-bit AXI4 read ports (activation + weight) with 300 MHz
fabric → 2 GHz optical clock-domain crossing; activation ping-pong (2×16 KiB)
and weight-stationary distributed banking (64×8 KiB); a dedicated
dual-clock Gray-pointer async FIFO (`greencoyote_cs_lane_fifo.sv`) absorbing
per-unit completion skew between a Vortex TCU block (write side) and the
pilot photonic sequencer (read side) with **no assumed clock relationship**
between the two domains. **Missing:** physical bring-up (same caveat as
Part 6, which this block feeds).
- **Role:** inbound operand feed — walks tensor descriptors from host memory
  into the photonic sequencer's (Part 6) per-channel weight/activation
  buffers, credit-handshaked.
- **Interfaces:** AXI4 (descriptor + burst read); `DMA_*` MMIO block
  (`registers.yaml` 0xC4–0xE4, map_version 0.6.0); credit handshake to
  `greencoyote_photonic_sequencer.sv`.
- **Data formats:** raw tensor bytes per the 32-byte descriptor layout
  (`streaming_dma_architecture.md` §2.2: base address, strides, etc.).
- **Performance targets:** `N=64` parallel optical output channels,
  `L=16` contraction lanes/fire, `K_total=8192` MACs/channel/window
  (`512` fires × `16`), 128-bit/2.0 GHz per-channel read port, sized to a
  32 GB/s sustained feed draining the weight footprint in 256 ns
  (`optical_geometry_spec.md` §2.2) — **sizing targets derived from a
  locked geometry spec, not measured silicon bandwidth.**
- **Dependencies:** host memory (upstream, outside this document's scope);
  Part 6 (downstream consumer).
- **Config/mode controls:** `DMA_*` register block; geometry is
  elaboration-time-locked, not runtime-reconfigurable (per the "LOCKED"
  designation).
- **Standalone testability — silicon:** N/A, no ASIC.
- **Standalone testability — electronics:** none required pre-silicon;
  `sim/run_dma_tb.sh` (Icarus) is the complete present-day surface. A future
  physical bring-up would need the same Alveo U55C + host PCIe + ILA
  equipment as Part 6, since this block is not separately packaged.

### Part 8 — Photonic Integrated Circuit (PIC): MZI mesh + photodiodes

**Part number / designation:** none — `gcb-pic-core/` ("Component 4" per its
own README), directories `pic/`, `models/`, `sim/` described as planned;
**the repository currently contains documentation only, no `gdsfactory`
script, no GDS, no extracted model file exists on disk.**
**Completion status:** **CONCEPT ONLY.** The README states the near-term
goal as "a `gdsfactory` script that generates the physical layout for a
single K=16 balanced-homodyne multiplier tile" and extracting "actual"
insertion-loss/phase-noise profiles — explicitly **not yet done**.
**Available now:** an architectural description (coherent-interference
balanced-homodyne multiply: $A,B$ mixed in directional couplers, square-law
photodiodes extract $|A+B|^2-|A-B|^2=4\,\mathrm{Re}(AB^*)$) and a toolchain
selection (`gdsfactory`, FDTD/EME solvers, SAX/photontorch for S-parameter
circuit models). **Missing:** everything else — layout, extracted loss
figures, any simulated or measured optical performance number.
- **Role:** the physical execution unit — performs the matrix multiply in
  the analog optical domain via interference, per `gcb-wiki`'s own Intent
  Invariant #6.
- **Interfaces (planned, not built):** electrical Tx in (static 1s/0s
  driving ring/MZI modulators, from Part 5/9's wavelength router), optical
  in/out (the mesh itself), analog photocurrent out (to Part 10).
- **Data formats:** N/A — no model exists to define one yet beyond the
  architectural equation above.
- **Performance targets:** none measured; `optical_geometry_spec.md`'s
  `N=64`/`L=16`/`K_total=8192` figures (Part 7) are the digital-side sizing
  this PIC would need to satisfy, not a PIC-side specification.
- **Dependencies:** Part 9 (light source), Part 5 (electrical drive signal).
- **Config/mode controls:** none — no control surface exists for a part
  that doesn't yet have a layout.
- **Standalone testability — silicon:** **not applicable yet — there is no
  chip.** When a layout exists, the stand-alone photonic test plan per the
  repo's own stated next step would be: FDTD/EME solver characterization
  (software-only, no physical equipment) to extract S-parameters, THEN
  (if ever fabricated) a physical test would need a tunable laser source,
  a polarization controller, fiber-to-chip grating couplers or edge
  coupling, an optical spectrum analyzer and/or calibrated photodetector
  power meter, and a probe station or packaged test fixture with optical
  I/O — none of this exists today; stated here as the standard instrument
  set this class of device would require, not as a plan this program has
  committed resources to yet.
- **Standalone testability — electronics:** N/A at this stage; once
  photodiodes are integrated, a bench power meter / oscilloscope on the
  photocurrent taps would be the minimum electronic-side equipment,
  identical in kind to what Part 10's behavioral-model stage already
  anticipates.

### Part 9 — DWDM laser/modulator bank

**Part number / designation:** none — referenced only as "Analog Lasers and
Mesh" in `00_system_context.md`, owned nominally by `gcb-spec/` (bench
parameters) and "Phase II integrated cell." **No repository contains a
model, a component list, or a part number for this block.**
**Completion status:** **CONCEPT ONLY.** This is the least-specified part
in the entire inventory — even less mature than Part 8, which at least has
a toolchain and a planned layout script.
**Available now:** a one-line role description ("Modulated O-band sources
into an 8×8 unitary mesh; physical superposition performs the sum").
**Missing:** wavelength count, channel spacing, laser type (DFB/VCSEL/comb),
modulator type/bandwidth, any power budget — none of this is recorded
anywhere in the surveyed repositories.

**Maintainer flag, 2026-09-12 (`TKT-033`):** beyond being Missing, this
Part's whole DWDM/"8×8 unitary mesh" framing has **no corroboration in
`gcb-spec`** (checked directly, not assumed) — `gcb-spec/task3_physical_bom.md`
and `gcb-spec/bench_emulation_parameters.md` (the actual authoritative
Phase I spec) both describe a **single** O-band (1310 nm) CW laser
source with linear VOA intensity modulation, and a power-summing
fused-fiber/MMI combiner — not wavelength-division multiplexing at any
channel count. `gcb-pic-core`'s own "K=16 balanced-homodyne multiplier
tile" near-term goal cites *this wiki document* (via `goal.md` §2) as its
source, not `gcb-spec` directly — meaning the WDM framing this Part
describes may have no grounding beyond this wiki page itself. Flagged
for a human maintainer's review, not corrected unilaterally here: either
reconcile this Part's text with `gcb-spec`'s actual single-wavelength
model, or — if an 8×8 WDM mesh is a real, intentionally-separate Phase II
concept — add the `gcb-spec` citation that should have grounded it from
the start.
- **Role:** light source + wavelength-division modulation feeding Part 8's
  mesh.
- **Interfaces / data formats / performance targets / dependencies /
  config controls:** **none specified anywhere in the repository set.**
  This is recorded as a genuine gap, not filled in with an estimate, per
  this program's own discipline against fabricating figures that were
  never derived.
- **Standalone testability — silicon:** N/A — no design exists to test.
  For the record, the generic instrument set this class of component would
  eventually need: an optical spectrum analyzer, a calibrated power meter,
  a high-speed photoreceiver + BERT or eye-diagram analyzer (for modulator
  bandwidth/extinction ratio), and a tunable reference laser for
  wavelength-locking verification.
- **Standalone testability — electronics:** N/A for the same reason; the
  modulator driver electronics would eventually need a high-speed pattern
  generator and an oscilloscope with sufficient bandwidth for the target
  symbol rate — no target symbol rate has been set.

### Part 10 — On-die mixed-signal Rx front-end (integrator + comparator)

**Part number / designation:** `switched_charge_model.py` —
`gcb-analog-rx/` ("Component 5" per its own README) — **and** a second,
more mature, superseding line of work: `gcb-spec/models/readout/ss_readout_mc.py`
+ `ss_readout_mc_V2.py` (top-level scratch copy), governed by
**ADR-005 (Accepted, 2026-09-07): Single-Slope CIS readout supersedes and
retires the Charge-Balancing ΔΣ / switched-charge branch.**
**This is a real architectural supersession the inventory must reflect
honestly: `gcb-analog-rx`'s own README (describing a switched-charge
integrator) documents the RETIRED branch.** The accepted, current design is
single-slope: passive discharge-mode integration of photocurrent onto
`C_int` (2 pF MOM + reset switch, no per-channel active analog in the
accumulate path) against a shared ramp, read out by Part 11's TDC.
**Completion status:** **SPICE-CHARACTERIZED (academic PDK, ASAP7 7 nm) —
CONDITIONAL GO** (`gcb-papers/data/readout/spice/SPICE_RESULTS_V3.md` §9).
All four go/no-go gates pass on the current BSIM4-surrogate noise number;
held at CONDITIONAL rather than GO pending one named open item (below).
**Available now (quantitative, SPICE-measured):**

| Metric | Result | Gate | Source |
|---|---|---|---|
| Ramp slope (9 PVT corners) | 4.18–4.22 mV/ns (±1.1%) | — | `SPICE_RESULTS_V2.md` |
| Ramp INL | 0.04–0.11% of FS raw | — | `SPICE_RESULTS_V2.md` |
| Comparator noise (thermal + resid. 1/f), SPICE `.noise` BSIM4 | **53 µV** | ≤ 55 µV | `SPICE_RESULTS_V3.md` §7/§9 |
| 3σ offset voltage | **3.2 mV** | ≤ 5 mV | `SPICE_RESULTS_V3.md` §9 |
| Energy (20 ns gated decision) | **0.51 fJ/MAC** comparator + 0.039 fJ/MAC digital back-end ≈ **0.55 fJ/MAC total** | ≤ 0.6 fJ/MAC | `SPICE_RESULTS_V3.md` §9, `RTL_REPORT.md` §4 |
| Worst-corner readout p05 SNDR at 53 µV | **56.72 dB** | ≥ 56 dB | `SPICE_RESULTS_V3.md` §9 |

**Missing / open item:** the 53 µV figure rests on a BSIM4 surrogate for the
ASAP7 BSIM-CMG device (±16% model error, band 44.5–61.5 µV straddling the
55 µV gate — ngspice's `.noise` analysis does not run natively against the
OSDI BSIM-CMG model). **Standing item to move CONDITIONAL → GO:** a
transient-noise histogram on a commercial simulator (Spectre or AFS) with a
native BSIM-CMG model. A fallback design (gm–C integrating preamp,
decoupling gain from the 0.8 V load headroom) is already on file if the
commercial run lands above 55 µV (`SPICE_RESULTS_V3.md` §11).
- **Role:** converts per-tap optical power (via Part 8's photodiodes) into
  a ramp-crossing time, eliminating any routed analog voltage off the
  receiver cell (`02_receiver_architecture.md`'s architectural invariant).
- **Interfaces:** analog in — photocurrent from Part 8's balanced
  photodiodes; digital out — a `fire[ch]` comparator strobe to Part 11's
  shared TDC.
- **Data formats:** N/A at this block (analog domain); its OUTPUT is a
  single digital edge event, not a word — the word is formed by Part 11.
- **Performance:** see table above. Two preamp stages are *assumed* (not
  yet drawn) in the current SPICE deck — a tapeout-gating qualification,
  not GO-blocking.
- **Dependencies:** Part 8 (photocurrent source), Part 11 (TDC consumer).
- **Config/mode controls:** statically power-gated on the
  calibration-known crossing window (not dynamically clocked per decision).
- **Standalone testability — silicon:** **not applicable yet — no layout,
  only a SPICE deck.** When a test chip exists, the standard instrument set:
  a probe station, a precision current source or calibrated LED/laser
  stimulus to emulate photocurrent, a picosecond-resolution sampling
  oscilloscope or time-interval analyzer to verify the ramp-crossing
  timing independently of the on-die TDC, and environmental chamber access
  to re-run the 9-PVT-corner sweep physically (today only SPICE-swept).
- **Standalone testability — electronics:** the SPICE deck itself (ngspice
  + the `.lib`/model files referenced in `gcb-spec/docs/spice_setup.md` and
  `models/readout/spice/xyce_build_notes.md`) is the complete present-day
  test surface — runnable on a workstation, no physical equipment. The one
  explicitly missing piece is commercial-simulator (Spectre/AFS) access for
  the CONDITIONAL→GO closure run.

### Part 11 — Shared TDC + calibration digital back-end

**Part number / designation:** `greencoyote_ss_tdc.sv`,
`greencoyote_ss_calib.sv` — `gcb-rtl/rtl/`.
**Completion status:** **RTL, simulated, bit-exact-verified against a Python
golden model — standalone only, not integrated into `greencoyote_top.sv`**
(see the correction below). `RTL_REPORT.md` §1: **10,000/10,000** conversions
bit-exact between `sim/golden_ss_readout.py` and Icarus Verilog
(`gcb-rtl/sim/tb_ss_calib.sv`). This is, by a wide margin, the most
rigorously cross-checked digital block in the survey — at the module level;
the system-level integration claim this entry previously made was wrong.
**Available now:** one shared 12-bit Gray counter at 6 GHz (nominal), 4-phase
(0/90/180/270°) capture → 24 GS/s effective / 2 fine bits; per-channel
`{coarse, phase, fired}` capture latch across 64 channels; a 3-point
quadratic calibration evaluator (`x̂ = C2·u² + C1·u + C0`, Horner, fixed-point,
Q4.28 coefficients) in `greencoyote_ss_calib.sv`. **Missing:** the 3-point
*fit* itself (producing `C2,C1,C0` from three dummy-reference measurements)
is explicitly a firmware/host-side operation (`sim/golden_ss_readout.py ::
fx_fit_3pt`), not implemented in this RTL — this block only *evaluates* the
polynomial. A ripple-carry counter implementation is explicitly **known to
fail** SS/125°C timing (`DD-001`); the design decision on file requires
carry-select/carry-lookahead instead — confirmed present in the RTL, not an
open gap, but worth recording as a design constraint that was load-bearing.
- **Role:** converts Part 10's single comparator-strobe edge into a
  calibrated digital code — the complete digitization back-end for the
  Phase II (silicon-target) receiver path.
- **Correction, 2026-09-13 (checked directly, not assumed from this
  entry's own prior text): neither `greencoyote_ss_tdc` nor
  `greencoyote_ss_calib` is instantiated anywhere in `greencoyote_top.sv`
  — confirmed by direct grep across all of `gcb-rtl/rtl/*.sv`, not just
  `top`. Both exist only as standalone modules, proven solely by their
  own dedicated testbenches (`sim/run_ss_tb.sh`) — consistent with, not
  contradicting, this entry's own "Phase II (silicon-target)" framing
  (Phase I's currently-integrated bench path uses `greencoyote_adc_if`/
  `greencoyote_dac_if` instead, both of which genuinely are instantiated
  in `top`). The "arrive... from the `SS_CAL` coefficient BRAM in
  `greencoyote_pilot_regs.sv`" clause below was wrong as a present-tense
  claim: that BRAM does not exist in `greencoyote_pilot_regs.sv` (zero
  matches for any `SS_CAL`/`r_ss_*` signal there, or anywhere else in
  `gcb-rtl`) — `greencoyote_ss_calib.sv`'s `c2`/`c1`/`c0` ports are
  plain module inputs with no real driver anywhere today. Filed as
  `GCB-041` for disposition — not fixed here; this is RTL-integration
  work on the program's most rigorously-gated subsystem, not a
  documentation-only correction.**
- **Interfaces (as specified, not yet wired):** `fire[ch]` strobe in
  (from 64 instances of Part 10); indexed readout (`{rd_ch}` →
  `{rd_code[13:0]}`) intended for the pilot (Part 6); calibration
  coefficients intended to arrive per-channel from an `SS_CAL`
  coefficient BRAM that `registers.yaml` specifies (`SS_CAL_IDX`/
  `SS_CAL_DATA`/`SS_RAMP_TIMING`, 0xB4-0xBC) but that has no RTL
  implementation anywhere in this repository set.
- **Data formats:** raw code `CW=14`-bit unsigned `{coarse[13:2], phase[1:0]}`;
  calibration coefficients signed 32-bit Q4.28; accumulator signed 48-bit
  Q4.28 (bit-exact contract with the Python golden model).
- **Performance:** 6 GHz Gray-counter clock (CML island for the 4-phase
  clock generation/distribution specifically — **confirmed in
  `RTL_REPORT.md` §3c: a CML front end is required for the clock, NOT for
  the counter/capture/calibration logic, which stays static CMOS**); energy
  contribution folded into Part 10's 0.55 fJ/MAC total figure.
- **Dependencies:** Part 10 (strobe source); Part 6's
  `greencoyote_pilot_regs.sv` for coefficient storage is a specified, not
  yet implemented, dependency (`SS_READOUT` register block 0xB0–0xC0) —
  see the correction above.
- **Config/mode controls:** `SS_TDC_CTRL`, `SS_CAL_IDX`/`SS_CAL_DATA`
  (auto-increment coefficient store), `SS_RAMP_TIMING`, `SS_TDC_STATUS`.
- **Standalone testability — silicon:** N/A, no chip — same status as every
  other RTL-only block above.
- **Standalone testability — electronics:** the existing Icarus testbenches
  (`tb_ss_tdc.sv`, `tb_ss_calib.sv`, `tb_ss_energy.sv`, run via
  `sim/run_ss_tb.sh`) are the complete present-day surface — Verilog
  simulator only. A future physical test of the 6 GHz CML clock domain
  specifically would need a high-bandwidth oscilloscope (≥ 12 GHz, to
  resolve 4 phases of a 6 GHz clock) or a dedicated clock/jitter analyzer —
  not required today.

### Part 12 — Phase I bench receiver chain (COTS PD + TIA + SAR ADC)

**Part number / designation:** `greencoyote_adc_if.sv` (SPI SAR ADC master,
RTL) — `gcb-rtl/rtl/`. **Update, 2026-09-13 (checked directly against the
file on disk, not assumed): the photodiode, TIA, and SAR ADC now have
`[CANDIDATE — parametric fit]` part numbers.** `02_receiver_architecture.md`
cites `gcb-spec/task3_physical_bom.md` §3 as the source; that file was
re-added ~10 minutes after this gap was first recorded (2026-09-12, same
day) and never revisited here until now. Candidates on file: a
fiber-coupled InGaAs PIN photodiode (Thorlabs/Hamamatsu InGaAs PIN
product-line class); an `AD8015`-class TIA (13.3 kΩ nominal, 10–20 kΩ
adjustable, per `TKT-026`'s resolved loss-budget calc); a TI
`ADS786x`-class 12-bit SAR ADC (matched to `greencoyote_adc_if.sv`'s
command-word-free `CMD_WORD=16'h0000` default, per `TKT-027`'s
resolution). **Every one is `[CANDIDATE — parametric fit]` or
`[TBD — vendor survey not performed]`, per the BOM's own stated epistemic
tiers — none vendor-quoted, purchased, bench-populated, or measured.**
**Completion status:** the RTL interface is **RTL, simulated**
("bench loopback," per the file's own header — it is explicitly a test
harness, not a production interface). The COTS analog chain it drives is
still **CONCEPT ONLY** in this repository set (no procurement, no bench
build) — architecturally specified (`02_receiver_architecture.md`'s
Phase I datapath diagram) and now with candidate, not zero, vendor/parts.
**Available now:** an SPI master (mode 0, read-oriented) with a
settle→frame→done state machine and a conversion-fault watchdog, plus the
candidate PD/TIA/ADC BOM above.
**Missing:** vendor quotes, procurement, bench population, and measurement
against the candidates now on file — a real bill of materials exists;
nothing on it has been built or bought.
- **Role:** the "Guaranteed Bench" receiver path — proves the
  optical-summation and ratiometric-cancellation physics
  (`ADC_TapK/ADC_Tap0` cancels global insertion loss) before any Phase II
  silicon commitment, at a target ≈10.8-bit ENOB
  (`02_receiver_architecture.md`).
- **Interfaces:** SPI (mode 0) to the physical ADC; `conversion_start`
  strobe in from Part 6; `adc_data`/`adc_valid`/`conv_fault` out.
- **Data formats:** ADC codeword width per the physical part chosen —
  the candidate TI `ADS786x`-class part (see above) matches
  `greencoyote_adc_if.sv`'s existing `RESULT_BITS=12` of a `FRAME_BITS=16`
  frame, but no part is vendor-selected/purchased yet; architecturally a
  digital SPI word only (the
  invariant-compliance point of `02_receiver_architecture.md` — the analog
  TIA output, ~1.5 V full scale, stays on the eval board and never crosses
  the interconnect fabric).
- **Performance target:** ≈10.8-bit ENOB target; the clean ratiometric model
  shows ≈10.3-bit RMS; "D3 measures the delivered value" (a referenced,
  not-yet-located-in-repo measurement).
- **Dependencies:** Part 9/8 (optical taps, conceptually); Part 6
  (sequencing).
- **Config/mode controls:** `SETTLE_CYCLES`, `FRAME_BITS`, `CMD_WORD` as
  RTL parameters/constants.
- **Standalone testability — silicon:** N/A — this is a COTS part, not a
  GCB-fabricated die; "silicon" testability here means the vendor's own
  datasheet-specified characterization (not this program's responsibility
  once a part is actually selected).
- **Standalone testability — electronics:** **real equipment would be
  needed the moment a physical ADC/TIA/PD is chosen and populated**: a
  precision current source or calibrated optical/electrical stimulus into
  the TIA input, a digital multimeter and oscilloscope on the TIA output
  node (the one analog voltage this program's own invariant says must stay
  on-board), and a logic analyzer or SPI protocol analyzer on the ADC's SPI
  bus to cross-check `greencoyote_adc_if.sv`'s own framing against the
  physical part's datasheet timing. Pre-population, the complete test
  surface is the RTL-only SPI master tested against a simulated ADC model
  in `sim/greencoyote_tb.sv`.

### Part 13 — Bench DAC stimulus interface

**Part number / designation:** `greencoyote_dac_if.sv` — `gcb-rtl/rtl/`.
Referenced analogously to "DAC5672/AD9767-class" generic parallel-DAC timing
in the file's own header comment — **this is an illustrative class
reference, not a selected part number.**
**Completion status:** **RTL, simulated** ("bench loopback," explicitly a
test-stimulus block per its own header).
**Available now:** drives a single 14-bit parallel DAC bus; on each `fire`
strobe, advances an internal LFSR test-vector generator and
time-multiplexes `NUM_CH` channels of a trim-scaled 14-bit word onto
`{data, channel-select, write-strobe}`.
**Update, 2026-09-13 (checked directly against `gcb-spec/task3_physical_bom.md`,
which didn't exist when this entry was first written — see Part 12's own
updated entry and gap #1 above for the timeline): a `[CANDIDATE —
parametric fit]` DAC now exists.** `TKT-028` resolved this exact gap:
Analog Devices **AD9767** (dual 14-bit, parallel-CMOS-input DAC — the
same part this file's own header comment already used only as an
*illustrative timing analogy*, now elevated to an actual candidate
because its bus width and timing match what the RTL already assumes)
plus an `AD8605`-class op-amp driver stage (current-to-voltage + scaling,
since the AD9767 is current-output). Still `[CANDIDATE]`, not
vendor-quoted/purchased — and the exact driver gain/scaling resistor
values remain unset pending the VOA's own control-voltage range, itself
also `[TBD]`. **Missing:** vendor quote/procurement against this
candidate (no longer a missing part number, per se).
- **Role:** deliberately isolates the optical path from the sequencer's
  real computed data for bench test — known pseudo-random vectors go out
  the DAC, through the (assumed) optical path, and back through Part 12's
  ADC; the optical transfer function is what gets measured, not the
  sequencer's own correctness.
- **Interfaces:** parallel DAC bus (`data`, `channel-select`,
  `write-strobe`); `fire` strobe in from Part 6.
- **Data formats:** 14-bit trim-scaled words, internally LFSR-generated.
- **Performance:** not characterized (bench stimulus generator, not a
  production datapath element).
- **Dependencies:** Part 6 (fire timing); feeds the optical path
  conceptually, with Part 12 as the eventual return leg.
- **Config/mode controls:** `NUM_CH` parameter; LFSR seed (implementation
  detail, not exposed as a register in this survey).
- **Standalone testability — silicon:** N/A — COTS part once selected, same
  caveat as Part 12.
- **Standalone testability — electronics:** an oscilloscope or logic
  analyzer on the parallel DAC bus to verify channel-select/write-strobe
  timing against whichever physical DAC is eventually populated; pre-
  population, `sim/greencoyote_tb.sv`'s own DAC/ADC roundtrip test is the
  complete surface.

### Part 14 — Host driver + MMIO control plane

**Part number / designation:** `gcb-host/` — three real, separate pieces,
not one: `include/greencoyote_pilot.hpp` (795-line C++ driver, class
`GreenCoyotePilot`, targets Alveo U55C via Xilinx Runtime (XRT) MMIO, with
an explicit `/dev/mem` mmap fallback for bare-metal/debug access);
`proxy/gcb_proxy.py` (313-line Python MMIO proxy/simulator, generated
`regmap.py` `map_version 0.6.0` — composes/decodes register words only
through the generated dataclasses, "so the proxy can never drift from
`registers.yaml`"; implements the v0.6.0 streaming-tensor-DMA descriptor
ring + doorbell + `REDUCTION_CTRL` surface); `tools/hf_manifest_gen.py`
(725-line HuggingFace model-manifest generator, reads a HF
`config.json`/`--local` path and emits a GCB hardware-resource manifest —
a separate, standalone tool, not part of the MMIO driver stack at all, with
its own `tests/test_hf_manifest_gen.py`).
**Update, 2026-09-13 (deepened; checked directly, not README-only):** the
prior entry here called `proxy/gcb_proxy.py` a "**FastAPI MMIO proxy**" —
stale. `gcb-host`'s own README already corrected this (`TKT-032`,
2026-09-12 23:21, `79dbba1`) to "Python MMIO register simulator," ~13
hours **after** this document's own 10:32 creation first recorded the
(then-accurate) FastAPI description — this entry was simply never
revisited. Direct read of `gcb_proxy.py` confirms zero FastAPI code: it is
a self-checking, pure-Python register simulator, not an HTTP proxy of any
kind.
**Completion status:** present and real — C++ driver header complete
(4 top-level classes/functions), Python proxy/simulator complete against
the v0.6.0 register map, manifest generator has its own test suite. Not
independently built/run this pass (no XRT/Alveo hardware or Python
environment exercised here) — code read directly, not executed.
**Available now:** the full v0.6.0 MMIO surface on both the C++ (driver)
and Python (simulator) sides; a standalone HF-model-to-hardware-manifest
tool, unrelated to the MMIO path.
**Missing:** independent execution/test confirmation this pass (read, not
run); the physical host↔FPGA link is PCIe via XRT, implied by the driver's
own API, not independently confirmed against a physical bench here.
- **Role:** the host-side software that actually issues MMIO
  reads/writes against Part 6's register block over whatever physical link
  connects host and FPGA (PCIe via XRT, per the driver's own header;
  `/dev/mem` as the documented fallback path).
- **Standalone testability:** software — unit/integration tests against a
  simulated or real register-map target; no photonic or analog equipment
  involved. The manifest generator has its own standalone test suite,
  independent of the MMIO path.

### Part 15 — Compiler/scheduler + telemetry persistence

**Part number / designation:** `gcb-python-orchestrator/` — two roles:
(1) `compiler/partitioner.py` (`HybridPartitioner`, `torch.fx`-based),
`compiler/tiler.py` (`PhotonicTiler`), `compiler/packer.py` (`DMAPacker`),
`scheduler.py` (`TensorTiler`); (2) `deploy/cyclopter/` — the PBG telemetry
persistence layer (PostgreSQL + pgvector), explicitly control-plane state
that must never live in an RTL repo (`gcb-wiki/04`'s boundary invariant).
**Completion status:** present, with stated module responsibilities; not
independently re-verified at the code level this pass.
**Role:** lowers a PyTorch workload onto the photonic/Vortex hybrid engine
(tags nodes PHOTONIC vs. VORTEX, tiles `M×K→M×N` shapes onto Part 3's SRAM
controller loop bounds, packs DMA beats into INT4 byte streams, and splits
any contraction longer than the `K≤16` phase-noise-limited optical beat
width into host-accumulated chunks); separately, persists every ticket's
PBG telemetry outcome durably and queryably.
**Standalone testability:** pure software — `pytest`-class testing against
the compiler passes and a live or containerized PostgreSQL+pgvector
instance for the Cyclopter role; no hardware equipment.

### Part 16 — Monitoring dashboard + hardware-visualization pipeline

**Part number / designation:** `gcb-dashboard/` — two roles: (1) a React
fabric-monitoring dashboard (`src/GreenCoyoteDashboard.jsx`); (2) a headless
build pipeline (`build_visuals.py`, `Makefile`) rendering every
synthesizable top module from `gcb-rtl/rtl` and `gcb-photonic-qam-v2/rtl`
via `sv2v → yosys write_json → yosys2digitaljs → elkjs` into SVGs, plus
`homodyne_cell.gds` from `gcb-pic-core` when `GCB_ENABLE_PHOTONIC=1` (a flag
that, per Part 8's status above, currently has no real GDS to render).
**Completion status:** both roles "live" per the README; `make doctor` is
a loud, non-zero-on-failure preflight specifically added (TKT-020 finding
Y2) because "the demo substrate must not fail silently as success" — i.e.
this pipeline has its own documented history of a near-miss silent-failure
defect, now guarded against.
**Role:** operator-facing live telemetry (role 1) and automated
documentation/demo-asset generation from the actual RTL sources (role 2) —
not a control-path component, but required observability/demo
infrastructure for "a working system" in the broad sense the brief asks
about.
**Standalone testability:** software — `make doctor` / `make visuals`
against the sibling RTL repos; no lab equipment. The GDS-rendering path for
Part 8 is currently a no-op given Part 8 has no GDS to consume.

### Part 17 — Mechanical chassis, backplane, and carrier cards

**Part number / designation:** six PNG images in `gcb-spec/concepts/images/`:
`Blueprint-RiverHorse_Program_Mark.png`,
`GCB-MEM-1_CXL_DRAM_Expander_Card.png`, `GPU_Shard_Card_with_AOC.png`,
`GreenCoyote-Bay_MVU_4U_Chassis_Cutaway.png`, `MZM_Photonic_Mesh_Assembly.png`,
`Passive_Fabric_Backplane.png`, `Xilinx_Versal_SoC_Card.png`.
**Completion status:** **CONCEPT ONLY**, explicitly and emphatically so —
`concepts/README.md` (per `gcb-spec/README.md`'s own pointer) caveats these
as **"Concept art, not photographs or CAD."**
**Available now:** nothing beyond a visual impression of an intended form
factor (a 4U chassis, a CXL DRAM expander card, a GPU shard card with AOC,
a passive fabric backplane, a Versal SoC card, an MZM photonic mesh
assembly). **Missing:** literally all engineering content — no mechanical
drawing, no connector pinout, no power budget, no thermal analysis, no
backplane signal integrity spec, no bill of materials.
- **Role (intended, not engineered):** the physical carrier/interconnect
  tier that would eventually host Parts 1–13 as populated cards in a
  chassis over a passive backplane.
- **Interfaces / data formats / performance / dependencies / config
  controls:** **none exist** — there is nothing below the level of a
  rendered image to specify.
- **Standalone testability — silicon:** N/A.
- **Standalone testability — electronics:** N/A. When real mechanical/PCB
  design exists, the eventual minimum equipment would be standard PCB/SI
  bench gear (TDR for backplane signal integrity, a power analyzer for the
  chassis power budget, thermal imaging for the cutaway's implied airflow
  claims) — none of this has been designed yet, so none of it can be
  scoped more specifically than "standard practice for this class of
  hardware" today.

---

## Cross-cutting testability summary (the brief's own two-way split)

| | Photonic | Electronic | Mixed-signal | Equipment that exists TODAY |
|---|---|---|---|---|
| **Silicon / chiplets** (Parts 1, 3–5, 8–11) | Part 8/9 only, and only conceptually | Parts 1–7, 11 (all RTL) | Part 10 (SPICE only) | Verilator, Icarus Verilog, cocotb, ngspice/Xyce — **no physical instrument of any kind has been used on any silicon in this program** |
| **Remaining electronics** (boards/backplane/power/control, Parts 6, 12–17) | N/A | Part 6 targets a real Alveo U55C shell (untested); Parts 12/13 are bench-loopback RTL with no populated COTS part yet | N/A | Vivado (synthesis/OOC timing only, `gcb-rtl/build/`) is the only commercial EDA tool with evidence of having actually been run in this survey |

**The one item in this entire inventory that has been through anything
resembling a rigorous, quantitative, multi-corner engineering gate review is
Part 10/11's single-slope readout chain** (ADR-005, CONDITIONAL GO, 9 PVT
corners, bit-exact RTL/golden-model cross-check) — and even that is
explicitly held short of GO pending a commercial-simulator noise closure,
and has never touched a commercial PDK or a physical wafer.

---

## Known documentation gaps (recorded, not filled)

1. ~~`gcb-spec/task3_physical_bom.md` is cited by `02_receiver_architecture.md`
   §"Phase I — Guaranteed Bench" as the source for the COTS PD/TIA/SAR-ADC
   parts (Part 12) — **this file does not exist anywhere on disk.**~~
   **Resolved, 2026-09-13 (checked directly): the file was re-added
   ~10 minutes after this gap was first recorded (2026-09-12, same day) —
   see the updated Part 12 entry above for its `[CANDIDATE — parametric
   fit]` PD/TIA/ADC part numbers. This gap sat uncorrected for a full day
   until this check.
2. Part 9 (DWDM laser/modulator bank) has no model, no parameter, no part
   number anywhere in the repository set — the least-specified functional
   block in the program.
3. ~~Part 14 (`gcb-host`) was surveyed only at the README level this pass —
   deeper Section 2–4 detail would need a dedicated follow-up read of its
   actual source tree.~~ **Resolved, 2026-09-13** — see the updated Part 14
   entry above: direct read of `greencoyote_pilot.hpp`, `gcb_proxy.py`, and
   `hf_manifest_gen.py`, which also caught a stale "FastAPI MMIO proxy"
   claim this entry had been carrying since before `gcb-host`'s own README
   corrected it (`TKT-032`).
4. `gcb-dashboard`'s GDS-rendering path for Part 8 (`GCB_ENABLE_PHOTONIC=1`)
   currently has nothing to render, since Part 8 has no GDS — not a defect
   in the dashboard, just a downstream consequence of Part 8's own status.

---

## Related

- [`14-Optical-Transport-Doctrine.md`](14-Optical-Transport-Doctrine.md) —
  deep doctrine for Part 4 specifically (epoch isolation, CRC/integrity,
  watchdog recovery).
- [`15_hardware_inventory_and_testability.md`](15_hardware_inventory_and_testability.md) —
  the prior, narrower (TKT-019-scoped) inventory and testability pass; this
  document supersedes it in SCOPE (whole program vs. one epic) without
  retracting any of its own findings.
- [`00_system_context.md`](00_system_context.md) /
  [`02_receiver_architecture.md`](02_receiver_architecture.md) — the
  canonical five-block signal chain and the Phase I/Phase II receiver split
  this document's Parts 10–13 are built on.
