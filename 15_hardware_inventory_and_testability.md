# 15 — GCB/ODIN_Bridge Hardware Inventory & Testability Reconstruction

**Working doctrine, not a ratification document** — same framing as `14`.
This is a coalesced hardware inventory and testability reconstruction for
the GreenCoyote-Bay (GCB) / ODIN_Bridge optical WDM transport
architecture. It is a **corrected revision** of a first-pass version
produced outside this session's own verified evidence trail; the
correction pass cross-checked every specific claim against this repo's
actual RTL, cocotb results, and the `TKT-019.x` ticket chain
(`gcb-workspaces/backlog/`) before restating it. Three classes of error
were found and fixed, listed in §11 — read that section before treating
any earlier copy of this document as authoritative.

**Epistemic labels, unchanged from `14`:** `PROVEN — DIGITAL SIMULATION,
TESTED CONDITIONS`, `FAILED`, `UNPROVEN`, `OPEN DEFECT`,
`ESTIMATE/ASSUMPTION`. Nothing in this document is a silicon, BER, or
physical-PPA claim unless explicitly marked otherwise.

---

## 1. Master Hardware Inventory

| Block | Category | Status | Evidence |
|---|---|---|---|
| `gcb_dwdm_payload_mux.sv` (TX datapath) | Digital IC block | **IMPLEMENTED** (RTL) / `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS` | `test_wdm_link_integration.py`, `test_wdm_payload_mux.py`; extended through `TKT-019.16`-`.18` with a generation+session-tagged sender abort (`abort_tx_valid`/`abort_tx_epoch`/`abort_tx_nonce`/`current_session_nonce`, `tx_quiescent`) |
| `gcb_dwdm_payload_demux.sv` (RX datapath) | Digital IC block | **IMPLEMENTED** (RTL) / `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS` | Same suite; length-consistency gate (`length_mismatch`, `TKT-019.10` Finding A) independent of CRC |
| `gcb_dwdm_deskew_cdc.sv` (CDC + deskew) | Digital IC block / contains memory (async skew FIFO) | **IMPLEMENTED** (RTL) / `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS` (within the tested conditions enumerated in `TKT-019.11`) | `test_wdm_deskew_cdc.py` standalone suite |
| `gcb_wavelength_router.sv` | Digital IC block | **IMPLEMENTED** (RTL), `TKT-019.1` | Elaborates at `N_LAMBDA=64` as pure permutation wiring, 0 logic cells (Yosys 0.68) |
| `gcb_bitplane_tx_mapper.sv` / `gcb_rx_digital_recombiner.sv` | Digital IC block | **IMPLEMENTED** (RTL), `13_bitplane_tx_mapper.md` | **Provenance correction (§11.3): "forked from `gcb-photonic-qam-v2`" is UNVERIFIED by this session** — no git history or ticket evidence inspected here confirms or denies it; treat as an open provenance question, not settled fact, until independently sourced |
| Optical PHY (lasers, modulators, photodetectors) | Photonic IC / electro-optical device | **ARCHITECTURALLY REQUIRED** / **UNKNOWN** | No optical implementation evidence exists anywhere in this epic — `TKT-019.4`'s own epistemic boundary |
| Host interconnect (CXL/PCIe) | CXL/PCIe component | **ARCHITECTURALLY REQUIRED** / **UNKNOWN** | The system requires a host to drive CSR-sourced inputs (`current_session_nonce`, `mode_b`, `payload_len`, `start`, …) — no interconnect RTL exists |

---

## 2. Completion and Status Matrix

| Component | Current Status | Demonstrated Functions | Unresolved / Missing Functions |
|---|---|---|---|
| **TX Payload Mux** | RTL IMPLEMENTED / DIGITALLY SIMULATED | Epoch tagging; Sarwate CRC32; a sender-side abort mechanism gated on a `[session_nonce, epoch]` match for the **control-plane backchannel only** (`TKT-019.16`-`.18`) | Physical transmission boundaries; a real backchannel medium (`TKT-019.15` §6, still open); physical synthesis scaling beyond Yosys cell counts |
| **RX Payload Demux** | RTL IMPLEMENTED / DIGITALLY SIMULATED | Length-consistency gate independent of CRC; `txn_void`/`integrity_fail`/`reassembly_timeout`/`length_mismatch` generation | **No backchannel transmitter RTL exists anywhere in this repo** to physically carry any of those four signals to the sender — confirmed by direct port-list inspection of both `gcb_dwdm_payload_mux` and `gcb_dwdm_payload_demux` (`TKT-019.13`/`.14`), re-confirmed unchanged by `.16`-`.18`, which model the backchannel purely in cocotb, not in RTL |
| **Deskew / CDC** | RTL IMPLEMENTED / DIGITALLY SIMULATED | Gray-code pointer crossing; independent per-lane clock deskew; `expected_epoch`-gated activation; `CDC_IDLE`/`CDC_ACTIVE` watchdog-arming (`TKT-019.10` Candidate 2) | **Data-plane reset aliasing remains fully open** — see §7/§9 and `TKT-019.19` below; `TKT-019.18`'s session-nonce fix protects the control-plane abort message only, not the per-word `head_epoch[c] == expected_epoch` comparison this module actually performs on the data it reconstructs |
| **Optical PHY** | CONCEPT / ARCHITECTURE | None | Insertion loss, SNR, ENOB, BER — all `UNKNOWN` |

---

## 3. Systems Data Specification

**Function & interfaces**

* Dual-regime transport mapping logical payloads to a physical DWDM link.
* **Mode A:** temporal serialization over 1 wavelength (tested up to 1024 B; the FSM-timing test suite uses 271 B for adequate cycle-count headroom).
* **Mode B:** spatial spread over multiple wavelengths (1024 B Mode B ceiling, `GCB-034`).

**Data formats & integrity**

* In-band 3-byte header (mode bit + length).
* 4-bit epoch tag (`EPOCH_W=4` at the tested geometries).
* 16-bit session nonce — **control-plane only** (`current_session_nonce`/`abort_tx_nonce`, `TKT-019.18`). It tags the sender-abort backchannel message; it is **not** part of the framed byte stream, the `color_word_t` wire format, or the per-word epoch comparison `gcb_dwdm_deskew_cdc` performs. Extending it (or an equivalent) to the data plane is `TKT-019.19`'s own open question, not yet answered — see §7.
* CRC32, Sarwate (1988) byte-table form, reflected poly `0xEDB88320`.
* Numeric formats: INT4/INT8 (INT4 found to fail the simulated 25 dB link budget, per the GCB-034-lineage link-budget work).

**Performance boundaries**

* Wavelength count: **60λ** (`ESTIMATE/ASSUMPTION`, GCB-034/GCB-037 link budget) vs. **64 lanes** (`PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS`, `TKT-019.1`'s own router test ceiling) — **kept deliberately distinct, per `14`'s own doctrine; this document does not merge them.**
* Channel spacing: 50 GHz grid (`ASSUMPTION`). **Maintainer flag,
  2026-09-12 (`TKT-033`): this figure has NO corroboration anywhere in
  `gcb-spec`** (checked directly — exhaustive grep for "channel spacing,"
  "DWDM," "50 GHz," "WDM" across `gcb-spec` turns up nothing matching this
  claim). `gcb-spec/bench_emulation_parameters.md` and
  `gcb-rtl/sim/mmi_tree_model.py` — the actual authoritative Phase I
  spec/model — describe a **single** O-band wavelength (1310 nm) and a
  power-summing combiner, not WDM. This line may describe a genuinely
  separate, not-yet-built inter-chip transport link distinct from the
  photonic MAC tile, or it may be stale/speculative text that predates
  the Phase I bench spec settling on single-wavelength power combining.
  Either way: **do not treat this figure as a design input for any
  physical layout work without re-deriving it from `gcb-spec` directly**
  — this program's own doctrine is `gcb-wiki` is a human-readable view
  *of* `gcb-spec`, not a parallel source of truth (see `TKT-033`'s own
  resolution in `gcb-workspaces/backlog` for the full finding).
  **Follow-up, 2026-09-12 (`TKT-035`):** the concept this line is
  reaching for is real — `gcb-papers/p2-rfi-interconnect` (the
  "Reduction Fabric Interface," a coherent-QAM/WDM interconnect
  replacing PCIe between compute units) specifies its own real channel
  plan: 8 channels, 200 GHz spacing in the C-band. That is a *different*
  specific figure than this line's 50 GHz — not a confirmation of this
  exact number — but it confirms channel spacing is a genuine,
  intentional transport-layer design parameter somewhere in this
  program, not a fabricated one. Whichever figure is authoritative (this
  line's 50 GHz, Paper 2's 200 GHz, both as different illustrative
  scaling points, or neither as final) is still undetermined — re-derive
  from `gcb-papers`/`gcb-spec` directly before using either.
* FIFO depth: `D = MAX_SKEW_CYCLES = 16` at the cocotb bring-up geometry (`IMPLEMENTED`, `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS` as a hard cap on queue depth, `TKT-019.11` §7.F).
* Physical cell cost: Sarwate CRC32 causes a **`+45,320`** cell delta at `NUM_COLORS=60` for the mux (`TKT-019.9`, Yosys 0.68 `stat` — a synthesized structural proxy, explicitly **not** a physical PPA number).

---

## 4. Stand-Alone Testability

* **Digital testability: IMPLEMENTED.** cocotb testbenches (`test_wdm_link_integration.py`, `test_wdm_deskew_cdc.py`, `test_wdm_payload_mux.py`) simulate independent per-lane clocks, skew up to and past `MAX_SKEW_CYCLES`, lane loss, five corruption categories, epoch rollover, reset-boundary aliasing, and `txn_void`/abort propagation — `TKT-019.2` through `.18`.
* **Silicon / chip testing: MISSING.** No JTAG, BIST, PRBS generators/checkers, or scan chains are defined anywhere in the RTL.
* **Photonic / mixed-signal testing: UNKNOWN.** No physical optical loopback or monitor tap has been architected.

---

## 5. Required Equipment Matrix

To move any of this from `DIGITALLY SIMULATED` toward `PHYSICALLY
VALIDATED` (a move this document does not make, only scopes):

* **FPGA evaluation platform** — host the digital RTL, emulate the CXL/PCIe control plane.
* **Tunable laser + optical spectrum analyzer** — validate the 50 GHz spacing assumption across a 60λ Mode B spread.
* **High-bandwidth oscilloscope / BERT** — measure the physical electrical skew actually feeding `gcb_dwdm_deskew_cdc`, against the "tens of ns" estimate `TKT-019.3` sourced, not measured.

---

## 6. DFT / Test-Structure Matrix

| Test structure | Status | Observability target |
|---|---|---|
| Digital assertions (cocotb) | **ALREADY IMPLEMENTED** | Epoch rollover (`TKT-019.11`), Ghost Abort rejection — both the within-session (`TKT-019.17`) and reset-boundary (`TKT-019.18`) forms — CDC timeout |
| PRBS checkers | **MISSING** | BER validation prior to FEC |
| Optical loopbacks | **UNKNOWN** | PHY transmitter-to-receiver integrity |
| Scan chains / BIST | **MISSING** | Silicon manufacturing defect coverage |

---

## 7. Contradiction Register

| Source A | Source B | Difference | Interpretation / Resolution |
|---|---|---|---|
| Architectural estimate | RTL implementation | 60 wavelengths vs. 64 logical lanes | **Deliberately unresolved, by doctrine** (`14`) — 60 is a physical link-budget estimate; 64 is an RTL test ceiling. Not the same claim; not merged. |
| `TKT-019.18` | `TKT-019.19` (drafted alongside this correction, see `gcb-workspaces/backlog/TKT-019.19-data-plane-reset-aliasing.md`) | `TKT-019.18` widens the **control-plane abort backchannel's** identity to `[session_nonce, epoch]` and proves it defeats reset-boundary Ghost Aborts. It does **not** touch the **data-plane** per-word comparison (`head_epoch[c] == expected_epoch` inside `gcb_dwdm_deskew_cdc`), which has no session-scoping of any kind. | **OPEN, now tracked as its own ticket rather than a loosely-cited contradiction.** A genuinely stale *data word* (not a control message) tagged epoch=0 from a prior session can still alias the first post-reset transaction's own epoch=0 — the exact mechanism `TKT-019.18` closed for control messages has a sibling vulnerability on the data path that nothing in `.16`-`.18` addresses. `TKT-019.19` scopes whether/how to close it — it does not assume a fix. |

---

## 8. Current System-Boundary Statement

**Inside the GCB/ODIN_Bridge digital system:** payload multiplexing,
CRC32 generation, asynchronous clock-domain crossing, gray-code deskew
buffering, payload demultiplexing, and transaction identity tagging
(`tx_epoch`, `expected_epoch`, and, for the control-plane abort path
only, `current_session_nonce`).

**Required external infrastructure:** the host controller (providing
`current_session_nonce` and every other CSR-sourced input); the physical
optical network (lasers, fibers, photodetectors); external CXL/PCIe
routing fabrics; and the PBG `pgvector` telemetry database, which lives
externally in `gcb-python-orchestrator/deploy/cyclopter/` (outside this
epic's own repos entirely).

---

## 9. Functional, Interface, and Testability Gaps

* **FUNCTIONAL GAP — identity authority.** There is no distributed
  identity-authority contract: sender and receiver evolve their own
  generation state independently, with no reconciliation mechanism.
  **Not a fresh finding** — `TKT-019.13`/`.14`/`.15` already
  characterized this exhaustively (five candidate authority models
  compared against propagation/duplication/loss/independent-reset
  behavior; none selected). Carried forward here, not re-derived.
* **INTERFACE GAP — backchannel medium.** The path carrying `txn_void`/
  `integrity_fail`/`reassembly_timeout`/`length_mismatch` (demux) and
  the abort request (mux) is modelled purely in cocotb; no physical
  medium (electrical sideband, reverse λ, TDM reverse frame, host-
  mediated) has been selected. Four candidates were compared and none
  chosen, `TKT-019.15` §6 — unchanged by `.16`-`.18`, which build and
  test the RTL-side *comparison logic* against a testbench-level stand-
  in for this medium, not the medium itself.
* **TESTABILITY GAP — no silicon observability.** `gcb_dwdm_async_skew_fifo`'s
  reset/flush behavior at the pointer level is `PROVEN — DIGITAL
  SIMULATION, TESTED CONDITIONS` for the simultaneous-reset case this
  epic's own testbenches always exercise (`TKT-019.13` §9.1); there is
  no scan access or silicon observability to validate it under
  independent, skewed per-lane reset timing, which remains an
  `ARCHITECTURAL ASSUMPTION`, not tested.
* **PHYSICAL GAP — `D ≤ I` is still not provably closed, for a
  corrected reason.** The original framing of this gap (a permanently
  *uninterruptible* sender pipeline) is **no longer accurate** and is
  corrected here (§11.2): `TKT-019.16` added `abort_tx_valid`/
  `tx_quiescent`, and the sender is demonstrably interruptible, under
  digital simulation, across every FSM-timing boundary tested. The
  residual gap is narrower but still real: **the abort's own delivery
  latency (`T_prop_fwd`, `TKT-019.15` §5) is unbounded, and no physical
  backchannel medium exists to bound it** — so even though the sender
  *can* be stopped, nothing currently guarantees it is stopped *in
  time* to keep the effective drain window within `I` (`TKT-019.12`/`.13`'s
  own `D ≤ I` derivation). The conclusion `TKT-019.15` §8 reached
  ("finite `N_reuse_max` not currently provable") still stands; the
  mechanism behind it has moved, from "no interrupt" to "an
  unbounded-latency interrupt."

---

## 10. Dependency Graph

```text
[Host / CSR Controller] (REQUIRED / UNKNOWN)
      │ (provides current_session_nonce, mode_b, payload_len, start, ...)
      ▼
[TX Mux / CRC32 Engine / tagged-abort receiver] (IMPLEMENTED / DIGITALLY SIMULATED)
      │
      ▼
[Electrical ↔ Optical Boundary] (REQUIRED / UNKNOWN)
      │
      ▼
[Photonic DWDM Transport — ~60λ estimate, 64-lane tested ceiling] (REQUIRED / UNKNOWN)
      │
      ▼
[Optical ↔ Electrical Boundary] (REQUIRED / UNKNOWN)
      │
      ▼
[Deskew CDC / Async FIFO] (IMPLEMENTED / DIGITALLY SIMULATED)
      │
      ▼
[RX Demux / Length Gate] (IMPLEMENTED / DIGITALLY SIMULATED)
      │ (generates txn_void / integrity_fail / reassembly_timeout / length_mismatch -
      │  no RTL backchannel transmitter exists to carry any of them back up)
      ▼
[Result / Host Reduction] (REQUIRED / UNKNOWN)
```

---

## 11. Corrections made to the first-pass version of this document

A prior version of this inventory was produced without cross-checking
against this repo's own verified evidence, and contained three errors
corrected here:

1. **A citation to "`TKT-019.19`" in the Contradiction Register
   referenced a ticket that did not yet exist.** It has been drafted
   properly alongside this correction:
   `gcb-workspaces/backlog/TKT-019.19-data-plane-reset-aliasing.md`.
2. **§9's "uninterruptible sender pipeline" claim was stale.** It
   predates `TKT-019.16` (which added the abort mechanism this claim
   says doesn't exist) by three tickets. Corrected to describe the
   actual current gap: an interrupt exists, but its delivery latency is
   unbounded — a materially different, narrower claim.
3. **The "forked from `gcb-photonic-qam-v2`" provenance claim for
   `gcb_bitplane_tx_mapper.sv`/`gcb_rx_digital_recombiner.sv` was stated
   as fact without a verifiable source in this session.** Relabelled
   `UNVERIFIED` in §1 rather than removed outright, since it may well be
   true — it simply was not checked before being asserted.

No other content from the first-pass version was found to be
inaccurate against this session's own verified sources; the CRC32 cell
count, `D=16`, and 60λ-vs-64-lane figures were independently confirmed
against `TKT-019.1`/`.9`/`.11`-`.13` and are unchanged.
