# gcb-wiki

System-level documentation hub for **GreenCoyote-Bay** (GCB / ODIN_Bridge) — a
cascaded optical all-reduce photonic inference fabric. Also the root of the
Obsidian vault used to author these notes.

This repo holds the **architecture map** and cross-cutting narrative. The
authoritative artifacts live in the sibling repos:

| Repo | Owns |
|------|------|
| `gcb-spec` | register map (`registers.yaml`), the streaming/interface contracts, bench parameters, ADRs |
| `gcb-rtl` | pilot RTL + testbenches, the optical numerical model, Vortex-integration staging RTL |
| `gcb-host` | C++ / Python host drivers |
| `gcb-grants` | SBIR Phase I / II / III proposal set |
| `gcb-papers` | academic manuscripts |
| `gcb-dashboard` | monitoring / visualization |
| `gcb-wdm-transceiver` | DWDM optical transport RTL — payload mux/demux, deskew/CDC, wavelength router (EPIC `TKT-019`) |
| `gcb-photonic-qam-v2` | GCB V2.0 Photonic QAM Matrix Accelerator RTL/sim — coherent QAM constellations per DWDM color; fork source for `gcb-wdm-transceiver`'s bitplane mapper / digital recombiner |
| `gcb-analog-rx` | Mixed-signal Rx quantizer / switched-charge integrator — the analog baseband floor of the GCB Photonic QAM Accelerator |
| `gcb-pic-core` | Photonic Integrated Circuit component library — MZI mesh, photodiodes, MMI power trees, homodyne cells |
| `gcb-python-orchestrator` | Host-side Python control plane — compiler/scheduler onto the Photonic/Vortex hybrid fabric, plus the Cyclopter Postgres/pgvector telemetry-persistence layer |
| `gcb-workspaces` | Cross-repo backlog and architecture-reconciliation tickets, plus the VS Code multi-root workspace definitions grouping the `gcb-*` repos |

**When a diagram here and a spec repo disagree, the spec repo wins.** Each
document notes where it simplifies for readability.

## Stakeholder-oriented narrative portal

[`lenses/`](lenses/) is the primary entry point: 4 consolidated,
role-based documents (silicon/physical-design, systems/board,
software/API, strategic/general-audience) — each a complete,
standalone read at three depth levels (Executive/System/Foundry).
[`sagas/`](sagas/) holds the 8 narrower, full-depth persona documents
the lenses consolidate and link out to. [`appendices/`](appendices/)
holds technical/manufacturing facts shared by more than one lens
(single source, cited from both, never duplicated). None of these
three is the source of truth — every claim in them is grounded in real,
re-verified facts from `gcb-spec` and the other sibling repos.
[`viewer/`](viewer/) is a small static TypeScript/HTML app that renders
all three as a browsable, Mermaid-diagram-rendering, depth-toggling
site, deployable to GitHub Pages. Start at
[`lenses/README.md`](lenses/README.md).

## Hierarchical architecture documents

Level 0 is the one-screen system context; each Level 1 document drills into one
boundary with a sequence diagram or state machine. This keeps the mental model
digestible and avoids a single spaghetti graph.

| # | Document | Level | Scope |
|---|----------|-------|-------|
| 00 | [`00_system_context.md`](00_system_context.md) | L0 | System context — the five blocks and the signals between them |
| 01 | [`01_streaming_sequence.md`](01_streaming_sequence.md) | L1 | Compute → optical streaming boundary, one reduction, end to end |
| 02 | [`02_receiver_architecture.md`](02_receiver_architecture.md) | L1 | Phase I vs Phase II receiver datapath; the no-routed-analog-voltage invariant |
| 03 | [`03_dual_mode_integration.md`](03_dual_mode_integration.md) | L1 | V1.0 electrical / V2.0 photonic dual-mode top-level; CSR mode select; K_MAX = 16 unification |
| 04 | [`04_ai_protocols_and_blue_wording.md`](04_ai_protocols_and_blue_wording.md) | — | Hard definitions: PGB Triad & Cyclopter (prompt-layer protocols), Blue Wording (data-format spec) — none are GCB hardware |
| 05 | [`05_photonic_memory_dataflow.md`](05_photonic_memory_dataflow.md) | L1 | Quantitative GDDR7 bandwidth (9 GB/s) and Engine-Local SRAM sizing (4.5 MB) for the 256-core Photonic Tensor Complex on a 4096x4096x4096 INT4 matmul |
| 06 | [`06_70B_transformer_workload_trace.md`](06_70B_transformer_workload_trace.md) | L1 | Hybrid Photonic/Vortex partitioning and a cycle-by-cycle GDDR7/SRAM trace of a LLaMA-class 70B FFN up-projection (7 GB/s, 9 MiB SRAM), validated against the existing `gcb_tensor_memory_engine` RTL parameters |
| 07 | [`07_inline_vector_softmax.md`](07_inline_vector_softmax.md) | L1 | Quantifies the GDDR7 round-trip Amdahl's Law tax on attention Softmax (4.295 GB / 2.68 s per 80 layers) and defines the inline Photonic-to-Vortex handoff — `qam_result` feeds a local staging SRAM and a hardware-TLU Softmax unit directly, keeping data stationary on-die |
| 08 | [`08_instruction_set_architecture.md`](08_instruction_set_architecture.md) | L1 | The programmable Execution Opcode Bus between `compiler/` and the Photonic/Vortex engines — `OP_GEMM`, `OP_SOFTMAX`, and `OP_SCALE_DIAG` (element-wise scale reframed as a diagonal-matrix GEMM to reuse the optical PE grid) — and how `HybridPartitioner`'s existing tagging maps onto it |
| 09 | [`09_pbg_telemetry_vector_space.md`](09_pbg_telemetry_vector_space.md) | — | Doctrine: the PBG telemetry taxonomy as a 3D bipolar vector space ($X$ Specification, $Y$ Quality, $Z$ Emergence), the $\lVert\vec{T}\rVert_2$ semantics, and the `pgvector(3)` schema + ticket-frontmatter contract for telemetry clustering |
| 10 | [`10_open_source_eda_toolchain.md`](10_open_source_eda_toolchain.md) | — | Doctrine: the open-source RTL-to-GDSII flow — Verilator + Cocotb for verification, Yosys + Surelog/UHDM into OpenROAD (5 nm) for synthesis and layout, and Python + Jinja2 templating (no Chisel/Amaranth) for hardware generation |
| 11 | [`11_gddr7_tensor_dma_architecture.md`](11_gddr7_tensor_dma_architecture.md) | L1 | The GDDR7 → Engine-Local SRAM operand loader (TKT-008): EA→byte-address derivation, A row-major / B transposed DRAM layout, BL32 burst coalescing with an 8-deep bank-group activate pipeline, the latency model proving the A prefetch clears the 8.192 µs ping-pong deadline 20×, strict-priority-A / page-preemptible-B arbitration, and the keep/adapt/discard call on `greencoyote_streaming_dma` |
| 12 | [`12_tensor_sram_allocation_strategy.md`](12_tensor_sram_allocation_strategy.md) | L1 | Engine-Local operand SRAM (TKT-012): the double-buffered A row-band / B column-tile partitioned into `2 × GRID_DIM` lane-banked `gcb_sram_sp1w1r` macros, the DMA-write / grid-read port split, and the closed-form proof that the resident-bank read path is never stalled by the 16 GB/s fill |
| 13 | [`13_bitplane_tx_mapper.md`](13_bitplane_tx_mapper.md) | L1 | Bit-plane Tx mapper (TKT-015): INT4 → 4 unweighted antipodal bit-planes, the per-colour I/Q lane assignment, and the algebraic INT16 reconstruction $Y=\sum_{ij}W_iW_j\,(L_{ij}+2M_a[i]+2M_b[j]-K)/4$ the digital receiver applies — positional weighting is digital only |
| 14 | [`14-Optical-Transport-Doctrine.md`](14-Optical-Transport-Doctrine.md) | — | **Working doctrine, not a ratification document.** EPIC `TKT-019`'s optical WDM transport (Mode A/B, epoch isolation, CRC/integrity, watchdog recovery): what is logically RTL-supported, what is experimentally demonstrated under tested conditions, and what is estimate/assumption. `TKT-019.8` Findings A and B — both `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS` closed by `TKT-019.10` — explicitly not a claim of physical feasibility, silicon/BER validation, or architectural ratification of the mitigation layer |
| 15 | [`15_hardware_inventory_and_testability.md`](15_hardware_inventory_and_testability.md) | — | **Working doctrine, a corrected revision.** Full GCB/ODIN_Bridge hardware inventory and testability reconstruction — master block inventory, completion matrix, data spec, DFT matrix, contradiction register, system-boundary statement, dependency graph. Corrects three errors found in a first-pass version (a premature `TKT-019.19` citation — now a real, drafted ticket; a stale "uninterruptible sender" claim predating `TKT-019.16`; an unverified repo-provenance claim relabelled `UNVERIFIED` rather than asserted) — §11 documents the corrections explicitly |
| 16 | [`16_hardware_parts_systems_specification.md`](16_hardware_parts_systems_specification.md) | — | **Whole-program inventory** (supersedes 15 in SCOPE only — 15's own findings stand). Surveys all 11 sibling repos + the vendored `vortex/` tree on disk and identifies 17 distinct hardware parts spanning the Vortex compute core, the Q17.14 shim, the INT4 tensor engine, the DWDM transport datapath (TKT-019), the photonic QAM V2.0 prototype, the digital pilot FPGA controller + streaming DMA, the PIC/laser bank (both CONCEPT ONLY), the single-slope mixed-signal readout chain (SPICE-characterized on ASAP7, CONDITIONAL GO per ADR-005 — the most rigorously gated part in the program), the Phase I COTS bench receiver/DAC, the host/orchestrator/dashboard control plane, and the mechanical chassis/backplane (explicitly AI concept art, zero engineering content). For each part: part number/designation, completion level, available-vs-missing functionality, full systems data spec (role, interfaces, formats, performance targets, dependencies, config), and standalone testability split photonic/electronic/mixed-signal and silicon-vs-remaining-electronics. Records 4 open documentation gaps rather than papering over them (a cited BOM file that does not exist; an unspecified laser/modulator bank; two shallower passes flagged for follow-up). Headline finding: no silicon has been fabricated anywhere in this program — every digital block is RTL-simulated only, every analog block is at most SPICE-characterized on an academic (non-commercial) PDK |

## Conventions

- Mermaid only; no parentheses or special characters in node aliases.
- Civil framing throughout (sustainable AI scaling, on-premises data
  sovereignty) — no defense or military language.
- Numbered filenames; Level 0 is `00_`, Level 1 documents are `0N_`.
