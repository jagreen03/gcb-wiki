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

**When a diagram here and a spec repo disagree, the spec repo wins.** Each
document notes where it simplifies for readability.

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

## Conventions

- Mermaid only; no parentheses or special characters in node aliases.
- Civil framing throughout (sustainable AI scaling, on-premises data
  sovereignty) — no defense or military language.
- Numbered filenames; Level 0 is `00_`, Level 1 documents are `0N_`.
