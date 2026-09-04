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

## Conventions

- Mermaid only; no parentheses or special characters in node aliases.
- Civil framing throughout (sustainable AI scaling, on-premises data
  sovereignty) — no defense or military language.
- Numbered filenames; Level 0 is `00_`, Level 1 documents are `0N_`.
