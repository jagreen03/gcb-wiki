# 14 — Optical Transport Doctrine

**Level:** — (doctrine, EPIC `TKT-019` — GCB-034 optical WDM transport).

**This is a working architectural doctrine, not a ratification document.**
It exists to keep four different kinds of claim from blurring into one
another as EPIC `TKT-019` proceeds: what the RTL *logically supports*, what
has *actually been demonstrated* by a simulation run, what is *physically
feasible* (a claim this document is not in a position to make), and what is
*architecturally ratified* (frozen, no longer open to revision without a new
finding). As of this writing, `TKT-019.8`'s two architectural defects
(Findings A and B — see the Orange-Team Reality Check below) have both been
closed by `TKT-019.10`, **labelled `PROVEN — DIGITAL SIMULATION, TESTED
CONDITIONS`** — a specific, bounded claim, not a physical-feasibility,
silicon, BER, or universal-input claim of any kind. Nothing in this
document should be read as asserting more than that.

## 0. Epistemic labels used throughout this document

Every claim below is tagged with exactly one of:

| Label | Means |
|---|---|
| **PROVEN** | Demonstrated by a passing, adversarial-or-equivalent digital simulation, under conditions that were actually exercised — not extrapolated to conditions that weren't |
| **FAILED** | Demonstrated by a simulation to be wrong/broken, reproducibly |
| **UNPROVEN** | No simulation result exists either way; a logical capability exists in the RTL but has not been run against the relevant test |
| **OPEN DEFECT** | A specific, traced mechanism by which the current RTL does not satisfy an invariant this doctrine (or `TKT-019.6`) states — found, not yet fixed, not to be described as a benign constraint |
| **ESTIMATE / ASSUMPTION** | A number or claim derived from a model (link-budget arithmetic, a "validated-on-paper" parameter, a round provisioning choice) with no physical or even full-digital-simulation measurement behind it |

A label here is never upgraded because a document (including this one, or an
earlier AI-authored one) stated something confidently. If a later finding
contradicts a label, the label changes and the contradiction is recorded
(§6), not quietly overwritten.

Where a claim is specifically about an RTL defect's closure (§6), this
document writes the full form **`PROVEN — DIGITAL SIMULATION, TESTED
CONDITIONS`** rather than the bare word "PROVEN" — same meaning as the
table row above, spelled out at the point of use so the bound (simulation,
tested conditions only — never physical, never universal) cannot be missed
by a reader who skips straight to §6.

---
## 1. The current transport model

### 1.1 Mode A / Mode B — intended roles

GCB-034 (the ratified dual-regime transport contract, `gcb-workspaces/backlog/GCB-034-optical-transport-contract.md`)
defines two transport regimes for the GCB-034 RESULT payload, both carried
over the same `color_word_t` / DWDM physical transport:

- **Mode A** — a small logical payload (`q_tile` + `q_scale`, ≈271 B)
  serialises **temporally** on a single wavelength (`LANES_USED=1`).
- **Mode B** — a larger logical payload (`acc_tile`, 1024 B) spreads
  **spatially** across `MODE_B_LANES` wavelengths simultaneously, per
  GCB-037's link-budget finding (§3.2 below) that the two regimes do not
  scale the same way.

**Label: PROVEN, under digital simulation, for the logical framing and
round-trip.** `TKT-019.2`'s `gcb_dwdm_payload_mux`/`gcb_dwdm_payload_demux`
round-trip both regimes byte-exact in cocotb (`TESTS=3 PASS=3`), and
`TKT-019.4`'s integration suite exercises both at the GCB-034 Mode B ceiling
(`NUM_COLORS=MODE_B_LANES=60`). This is a **logical RTL / verification**
claim, not a physical one — see §1.2.

### 1.2 The four claims that must not be conflated

| Claim | What it would mean | Current status here |
|---|---|---|
| **Logical RTL support** | The Verilog exists and elaborates (lints clean, Yosys-blesses latch-free) | PROVEN for `gcb_dwdm_payload_mux`/`demux`, `gcb_dwdm_deskew`/`_cdc`, `gcb_wavelength_router`, at both cocotb bring-up and the GCB-034 Mode B ceiling geometry (`sim/lint.sh` 38/38; Yosys 0.68 bless, all module×geometry combinations, 0 problems/latch-free) |
| **Demonstrated verification behavior** | A cocotb (or equivalent) testbench actually ran the scenario and it passed | PROVEN for the specific scenarios run (§4, now including the real-wire idle-gap test and the 60-lane Ghost Payload re-run, closed by `TKT-019.10`; real clock skew under the watchdog-arming gate and multi-lane simultaneous stale-epoch, closed by `TKT-019.11`, §6.1). **CONFIRMED OPEN DEFECT under the specific scenario tested** for epoch rollover/wraparound — `TKT-019.11` ran it and it failed; see §6.1, not merely "unproven" any more |
| **Physical feasibility** | A real optical/electrical implementation would actually work at these parameters | **Not claimed anywhere in this epic.** Every physical number in §3 is ESTIMATE/ASSUMPTION. No silicon, no optical bench, no BER measurement exists for any part of this transport |
| **Architectural ratification** | The design is frozen; only a new falsification finding reopens it | **GCB-034 itself is ratified** (the dual-regime contract). **The integrity/mitigation layer (`TKT-019.6`/`.7`/`.8`/`.10`/`.11`) is still NOT architecturally ratified** — `TKT-019.8` found two defects in its first implementation attempt, `TKT-019.10` closed both, and `TKT-019.11` closed clock-skew/multi-lane-stale under tested conditions but *found a new one* (epoch rollover aliasing, §6.1, held for disposition) — a digital regression pass is not what this row means by "ratified," and ratification remains a separate, not-yet-taken step, now with one more open item than before |

A passing cocotb test is evidence for claim 2. It is never, by itself,
evidence for claim 3, and should not be read as strengthening claim 4 even
for a finding `TKT-019.10` closed — closing a defect under tested
conditions is not the same act as ratifying the layer it lives in.

---
## 2. Integrity and transaction invariants (`TKT-019.5` → `.8`)

`TKT-019.5`'s adversarial audit found that the pre-`TKT-019.8` transport had
**no transaction identity, no integrity check, and no independent recovery
timer** — a late, stale transaction's data could silently satisfy a later
transaction's completion ("Ghost Payload"), and five single-bit corruption
categories were either silently accepted or hung with a fault signal that
misattributed the cause. `TKT-019.6` specified six mechanisms (M1-M6) to
close this; `TKT-019.7` is the trade study selecting a concrete
implementation path for three of them. This doctrine preserves the
distinction between the *mechanisms* (separable, independently gradable) and
does not let a pass on one stand in for a pass on another:

| Mechanism | What it is for | Status here |
|---|---|---|
| **Epoch isolation** | Prevent a stale, late transaction's words from being interpreted as belonging to a later transaction (`TKT-019.6` M1/M2) | Implemented (per-word epoch tag + discard-on-mismatch pop, `TKT-019.7`'s selected path over a hard FIFO flush), with a `TKT-019.10` refinement: the CDC's bounded-wait watchdog only arms (`CDC_IDLE` → `CDC_ACTIVE`) on a real, epoch-matched word, never on `channel_enable` alone. **PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS**, including a purpose-built real-wire idle-gap test (`TKT-019.10`, §6) — the idle-gap condition that was **OPEN DEFECT** (Finding B) is now closed under tested conditions. `TKT-019.11` (§6.1) subsequently proved the same gate under real clock skew and a multi-lane simultaneous stale-epoch population, but found epoch rollover/wraparound breaks it — a new, narrower **OPEN DEFECT**, not yet resolved. |
| **Length consistency** | An independent, deterministic check that the accumulated byte count matches the declared `payload_len` before accepting completion (`TKT-019.6` M3) | Implemented (`TKT-019.10`): `gcb_dwdm_payload_demux` independently recomputes the expected padded word count from the decoded `{mode_b, payload_len}` and compares it to the actual accumulated word count, checked BEFORE CRC. **PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS** (§6) — the gap Finding A named is closed under tested conditions; M3 as `TKT-019.6` specified it now exists as an independent gate, not folded into CRC's coverage. |
| **Protected completion** | `is_tile_final` + length-count + CRC must **all** agree before `payload_valid` — no single signal is ever the sole arbiter (`TKT-019.6` M4) | Implemented (`TKT-019.10`): completion now requires `is_tile_final` (implicit in reaching the check at all) **and** the length-count match **and** CRC, checked in that priority order, each with its own distinctly-named fault signal (`length_mismatch`, `integrity_fail`). **PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS** (§6) — a genuine three-way gate now exists, matching M4 as specified. |
| **CRC / integrity** | Detect payload/framing corruption; catch `is_tile_final` corruption *indirectly* via byte-range mismatch, since CRC is never computed over that sideband bit directly | Implemented (CRC32, Sarwate byte-table form, reflected poly `0xEDB88320`). **PROVEN** to trap tested `TKT-019.5` corruption categories with a distinct `integrity_fail`, under tested conditions — 4 of 5 pre-`TKT-019.10`; post-`TKT-019.10`, 2 of those 4 are now caught FIRST by the new deterministic `length_mismatch` gate instead (CRC is only reached once length already agrees), so CRC's own `integrity_fail` count on this specific suite is 2 of 5, not a regression in CRC's coverage but a change in which mechanism is credited for catching an already-covered case. Its coverage of `is_tile_final` corruption *by itself* remains **indirect/probabilistic by construction, not deterministic** — a property of the algorithm, not a defect, and the reason `TKT-019.10` added the length gate ahead of it rather than relying on CRC alone |
| **Watchdog recovery** | Bound a suppressed-`is_tile_final` hang independently of the CDC's own `ALIGN_TIMEOUT`/`txn_void` (which `TKT-019.5` found misattributes that exact scenario) | Implemented (`gcb_dwdm_payload_demux`'s `REASSEMBLY_TIMEOUT`, distinctly named and fired). **PROVEN** under tested conditions. The CDC's own `txn_void`/`stuck` misattribution is unchanged **by design** (superseded, not corrected) |

**No mechanism above is described as proven merely because it was
implemented.** Each has an explicit evidentiary basis or an explicit gap.

---
## 3. Physical boundaries — estimates vs. measured results

Nothing in this section has been physically measured. Every number is
ESTIMATE/ASSUMPTION unless stated otherwise, and even the "unless stated
otherwise" cases are digital-simulation results, not physical ones.

### 3.1 Wavelength scaling — the 60/64-λ distinction (do not conflate)

Two different numbers, from two different processes, both appear in this
epic's artifacts and must not be read as the same claim:

- **≈60 λ** is a link-budget **ESTIMATE** (`GCB-037`): Mode B's accumulator-inbound
  case, at `P=4` partitioning, needs `≈60×` the single-wavelength Alt-A
  capacity to bring the per-λ rate back into a closeable regime (`≈4.74
  Gbps/λ` at `+2.5 dB` margin). It depends on assumed comb-source power
  (`0 dBm`), an assumed `+4` to `+10 dBm` per-λ source need if unmet, and the
  KP4 FEC coding gain (`≈6.05 dB`) being available — **none of these are
  measured**. "60 λ on a 50 GHz grid ≈ 3 THz fits C-band (≈4.4 THz), *just*"
  is itself a further estimate layered on the above.
- **64** is an **RTL provisioning/test-ceiling choice** — `gcb_wavelength_router`'s
  `N_LAMBDA` and the transport modules' `NUM_COLORS` parameters were
  synthesized/lint/bless-checked at `N_LAMBDA=64`/`NUM_COLORS=60` as
  round, convenient test points that cover and slightly exceed the ≈60
  estimate above. **64 is not a second, independent physical derivation
  — it is a digital-verification geometry chosen to be comfortably above
  the ≈60 estimate.**

Label: **ESTIMATE/ASSUMPTION** (the ≈60 λ requirement) and **PROVEN, digital
only** (the RTL elaborates/lints/blesses cleanly at `N_LAMBDA` up to 64 and
`NUM_COLORS` up to 60 — a claim about RTL elaboration, not about whether 60
real wavelengths would close a real link).

### 3.2 Deskew / CDC architecture

`gcb_dwdm_deskew_cdc` (`TKT-019.3`) characterised the deskew requirement
against the GCB-034 Dual-Regime Contract:

- Chromatic-dispersion skew at short reach **≈21 ps — ESTIMATE, negligible**.
- The dominant term — inter-lane CDR/electrical skew — is **ESTIMATE,
  explicitly unvalidated**: "est. tens of ns," which is why
  `MAX_SKEW_CYCLES=128` is documented in that ticket's own text as **a
  placeholder**, not a measured or derived bound.
- The async-FIFO skew window itself (`gcb_dwdm_async_skew_fifo` `DEPTH=128`)
  is described in this repo's own bless record as **"validated-on-paper,"**
  i.e. arithmetically sized against the placeholder skew estimate above, not
  physically validated.
- The CDC barrier mechanism itself (gray-code pointer crossing,
  bounded-wait `stuck`/`txn_void`) is **PROVEN, digital only**: cocotb
  exercises it across genuinely independent per-lane clocks
  (`TESTS=2 PASS=2`), and Yosys bless confirms 0 problems/latch-free at
  `NUM_COLORS=4` and `=60`.

### 3.3 Buffering, serialization, payload framing

- Per-lane FIFO depth, the in-band 3-byte header (mode bit + length), and
  the CRC32 trailer are **PROVEN, digital only** (round-trip byte-exact in
  cocotb; Yosys bless clean at both geometries, after the Sarwate
  byte-table rewrite needed to keep elaboration tractable — see `TKT-019.8`
  Execution Log, and `sim/yosys068_bless/SUMMARY.md` for the full
  elaboration-scaling writeup).
- Receiver assumptions (what a real optical receiver's CDR/timing-recovery
  behavior actually looks like, what its own error distribution is) are
  **not modelled at all** in this epic — `TKT-019.4` drew this exact
  epistemic boundary explicitly: "a digital contract test, not evidence
  about optical BER, link budget, or FEC."

### 3.4 Transport bandwidth

`GCB-035`'s line-rate derivation (Alt A ≈2.4 Gbps vs. Alt B ≈17.9·P Gbps,
before framing/FEC overhead) and `GCB-037`'s KP4 FEC coding-gain figures
(`≈6.05 dB`, mandatory for closure in both modes per that ticket) are
**ESTIMATE/ASSUMPTION** — arithmetic derivations from a link-budget model,
not measurements. `GCB-036` found INT4 fails the 25 dB budget at the
modelled operating point, provisionally pushing D2 to INT8 — also
ESTIMATE, a modelled consequence, not a measured one.

### 3.5 Mitigation physical-cost estimates (`TKT-019.9`)

`TKT-019.9` compared Yosys 0.68 cell counts between the pre-`TKT-019.8`
baseline and the mitigated RTL, at both the cocotb bring-up geometry and
the `NUM_COLORS=60` ceiling. **Label: PROVEN, digital-elaboration-proxy
only** — a synthesizable-cell-count comparison is a real, reproducible
digital measurement, but it is explicitly **not** a physical PPA
(placed-and-routed area, timing, or power) result; no synthesis, floor
planning, or physical library was involved. Findings, preserved here
verbatim in substance (see `TKT-019.9` for the full table):

- **CRC32 is the overwhelming area driver**: `gcb_dwdm_payload_mux` +34,568
  cells (5.14×) at bring-up / +45,320 (4.26×) at the ceiling;
  `gcb_dwdm_payload_demux` +10,375 cells (4.07× / 3.00×) — the same
  absolute delta at both geometries, since the cost scales with
  `MAX_PAYLOAD_BYTES` (the CRC loop bound), not lane count. Mechanism:
  the CRC is computed combinationally, fully unrolled, in one cycle — `N`
  byte-update circuits built once, not `N` cycles through one reused
  circuit.
- **Epoch isolation is cheap**: `gcb_dwdm_deskew_cdc` +50 cells (+26.6%)
  at bring-up / +666 (+23.4%) at the ceiling, linear in `NUM_COLORS`
  (~11-13 cells/lane), pure combinational compare-and-discard logic plus a
  register-width-only storage cost — and secondary to the pre-existing
  60-lane skew-FIFO buffering itself, which is 94.9% of the *baseline*
  CDC's cell count on its own, unrelated to any mitigation. `TKT-019.10`'s
  Candidate 2 (the `CDC_IDLE`/`CDC_ACTIVE` watchdog-arming gate) was
  implemented after this cost study and has not itself been re-costed —
  it adds a two-state enum and one OR-reduction term, expected to be
  negligible relative to the FIFO buffering baseline, but that expectation
  is **not** a `TKT-019.9`-grade measurement and should not be read as one.
- **Latency**: epoch tagging and the watchdog cost nothing on the clean
  path; CRC32 costs 0-1 extra EMIT cycle (the 4-byte trailer). **Optical
  bandwidth**: the epoch tag never leaves the CDC (zero cost); CRC32 costs
  a fixed +4 bytes/transaction in-band (≈0.39% of a 1024 B Mode B payload,
  ≈1.48% of a ≈271 B Mode A payload).

---
## 4. What has actually been run (PROVEN, under stated conditions)

| Scenario | Result | Conditions actually exercised |
|---|---|---|
| Mode A / Mode B byte-exact round trip | PROVEN | `TKT-019.2` cocotb, `TESTS=3 PASS=3` |
| Top-level link integration (mux → channel → CDC-deskew → demux), 5 stress vectors | PROVEN (vectors as scoped) / **FAILED** (V5: every corruption category silent, pre-`TKT-019.8`) | `TKT-019.4`, `NUM_COLORS=MODE_B_LANES=60`; explicitly digital-only, no router/tx_packager/sync-deskew in the chain |
| Ghost Payload adversarial sequence (txn N → `txn_void` → late N data → N+1, same lane set) | **FAILED** pre-`TKT-019.8` (confirmed contamination, `TKT-019.5`); **PROVEN** post-`TKT-019.8` under close-together-transaction conditions (no idle gap); **PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS** post-`TKT-019.10` at `NUM_COLORS=60`, direct exact-equality reconstruction, zero contamination | `TKT-019.5` (failure); `TKT-019.8` Execution Log row 7 (limited conditions); `TKT-019.10` Task 4B (full re-run) |
| 5 `TKT-019.5` corruption categories, post-`TKT-019.8` | PROVEN, 4/5 via `integrity_fail`; PROVEN, 1/5 via `reassembly_timeout` | `TKT-019.8` Execution Log row 8 |
| Same 5 corruption categories, post-`TKT-019.10` | PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS: 2/5 now via the new deterministic `length_mismatch` (previously caught only indirectly by CRC), 2/5 still via `integrity_fail`, 1/5 still via `reassembly_timeout` — each individually traced, not merely "`payload_valid` suppressed" | `TKT-019.10` Task 4C |
| Real-wire idle gap (`> ALIGN_TIMEOUT` cycles, `channel_enable` continuously asserted, nothing arriving, no spurious `txn_void`, `expected_epoch` stable, N+1 still byte-exact) | **PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS** — the exact condition this doctrine's own §5 listed as UNPROVEN until now, exercised via a purpose-built real-time zero-abstraction passthrough specifically because the normal test harness is known to mask this bug class | `TKT-019.10` Task 4A, `NUM_COLORS=60` |
| Yosys 0.68 elaboration + latch check, all touched modules | PROVEN, 0 problems/latch-free | both cocotb bring-up and `NUM_COLORS=60` geometries, all three touched modules |
| Regression protection: already-locked `TKT-019.2`/`TKT-019.3` standalone suites, re-run after both `TKT-019.10` RTL changes | PROVEN unaffected — `TESTS=3 PASS=3` and `TESTS=2 PASS=2` respectively (also caught, then confirmed fixed, a real Candidate-1-induced regression to `FAIL=3` mid-session — see §6) | `TKT-019.10` Task 4D |

---
## 5. UNPROVEN — scoped, not yet run

Explicitly not claimed either way, pending further work. Items from this
list resolved by `TKT-019.10` (§4: the idle-gap re-run and the 60-lane
Ghost Payload re-run) or by `TKT-019.11` (§6.1: real clock skew under the
watchdog-arming gate, a multi-lane simultaneous stale-epoch population,
and a physical re-cost of Candidate 2's RTL — all three closed under
tested conditions) are removed here, not silently left looking open. Epoch
rollover/wraparound moved from this list entirely — `TKT-019.11` ran it
and it is no longer merely unproven, it is a **CONFIRMED OPEN DEFECT**,
see §6.1. What remains genuinely unproven:

- The full `TKT-019.8`/`TKT-019.10`/`.11` adversarial boundary sweep
  beyond what was actually run: stale data immediately-before/during/
  after N+1 (as opposed to the specific sequences actually tested),
  CRC-trailer-itself corruption, watchdog ±1-cycle boundary, clean
  back-to-back transactions after a recovery.
- Anything about real optical receivers, physical BER, or FEC necessity —
  not merely unproven but explicitly out of this epic's evidentiary reach
  (§1.2, §3.3).

---
## 6. Orange-Team Reality Check — `TKT-019.8` Findings A and B, closed by `TKT-019.10`

Found during `TKT-019.8`'s mandated pre-implementation architecture
re-check (tracing epoch origin → FIFO transport → comparison → discard →
CRC generation/verification → completion acceptance → watchdog recovery),
**after** an initial implementation pass had already produced passing
regression results under limited conditions. Neither was patched on
discovery; both were reported and held for disposition, per explicit
instruction not to invent a fix silently. **`TKT-019.10` subsequently
closed both**, each labelled **`PROVEN — DIGITAL SIMULATION, TESTED
CONDITIONS`** below — this is a specific, bounded claim (§0): a passing
adversarial digital regression under the conditions actually exercised,
never a physical, silicon, or universal-input claim. The original defect
descriptions are preserved below as the historical record of what was
found; each is followed by how `TKT-019.10` closed it.

### Finding A — the completion path did not implement the full M3/M4 invariant

**Original classification: OPEN ARCHITECTURAL DEFECT / UNRESOLVED FAILURE
BOUNDARY.** `gcb_dwdm_payload_demux`'s `finalize_pending` was driven by
`is_tile_final` alone — there was no independent, deterministic
word-count-versus-declared-`payload_len` gate. Completion acceptance rested
on exactly one additional check (CRC), not the three-way `is_tile_final` +
length-count + CRC agreement `TKT-019.6`'s M4 specified. CRC caught an
early/false final only *indirectly* (it recomputes over a byte range the
real accumulation has not filled, so it mismatches with overwhelming
probability) — a strong probabilistic argument, not the deterministic
check M3 specified.

**Resolution (`TKT-019.10`) — classification now `PROVEN — DIGITAL
SIMULATION, TESTED CONDITIONS`.** `gcb_dwdm_payload_demux` independently
recomputes the expected total padded word count from the decoded
`{mode_b, payload_len}` — the identical formula `gcb_dwdm_payload_mux`
already uses for its own `words_padded` — and compares it against the
actual accumulated word count, checked BEFORE CRC is even consulted. A
mismatch fires a new, distinctly-named `length_mismatch` fault, never
folded into `integrity_fail`. This is the deterministic, CRC-independent
check M3 specified; completion now genuinely requires all three signals to
agree, matching M4. Regression: two of `TKT-019.5`'s five corruption
categories (header mode-bit, early `is_tile_final`) now report
`length_mismatch` instead of the old, merely-probabilistic
`integrity_fail` catch — a change in mechanism, individually traced, not
a re-assertion of the same old pass.

### Finding B — a new failure mode discovered during mitigation implementation

**Original classification: OPEN ARCHITECTURAL DEFECT / NEW FAILURE MODE
DISCOVERED DURING MITIGATION IMPLEMENTATION.** `gcb_dwdm_payload_mux.lane_enable_q`
never deasserted between transactions — it held the previous transaction's
lane mask until the *next* `start`. Per this module's own design intent,
`lane_enable` wires directly into the CDC's `channel_enable` in real
(non-testbench) integration. `gcb_dwdm_deskew_cdc`'s bounded wait
(`waiting = (|channel_enable) & ~aligned_valid`) could not distinguish
"awaiting in-flight data" from "idle between transactions, by design." An
ordinary idle interval longer than `ALIGN_TIMEOUT` was therefore
interpreted as an active, stalled transaction, firing a **spurious
`txn_void`** that (epoch-advance being coupled to `txn_void`) could
desynchronize `expected_epoch` from `tx_epoch` by an unbounded amount and
permanently strand every subsequent legitimate transaction.

**First fix attempt (Candidate 1) tried and reverted.** `TKT-019.10`
first tried fixing this at the sender — deassert `lane_enable_q` shortly
after `done`. A purpose-built real-wire test (built specifically because
the abstracted test harness is what let Finding B go unnoticed in the
first place) found this raced `gcb_dwdm_async_skew_fifo`'s own
write-to-read synchronizer latency: `channel_enable` could drop before the
barrier ever saw the final word as available, silently stranding an
entirely ordinary, uncorrupted transaction with no recovery path at all -
and it broke the already-locked `TKT-019.2` regression outright
(`TESTS=3 PASS=3 → FAIL=3`). Candidate 1 was verified cleanly reverted
(the already-locked regression confirmed back to `PASS=3`) before any
further fix was attempted - no assumption that a next candidate would work
substituted for that proof.

**Resolution (`TKT-019.10`, Candidate 2) — classification now `PROVEN —
DIGITAL SIMULATION, TESTED CONDITIONS`.** Fixed at the receiver instead,
without requiring `channel_enable` to ever change: `gcb_dwdm_deskew_cdc`
gained an internal `CDC_IDLE`/`CDC_ACTIVE` watchdog-arming state. The
bounded-wait timer only arms (`CDC_IDLE` → `CDC_ACTIVE`) once a REAL,
**`expected_epoch`-matched** word has actually arrived on a participating
lane - never merely because `channel_enable` is asserted. A stale- or
future-epoch word can never arm it (already excluded by the pre-existing
epoch-match requirement in `lane_ready`) and never touches the watchdog -
it is popped and discarded by the unchanged `epoch_discard` path instead.
**`channel_enable` keeps its originally-intended, quasi-static,
CSR-like character throughout** (per this module's own long-standing
header note) - transaction activation now depends on `expected_epoch`
matching a real word, not on `channel_enable` framing a transaction
boundary. Regression, on the real (non-abstracted) mux-to-CDC wire:
`channel_enable` held continuously asserted for `ALIGN_TIMEOUT+40` idle
cycles with nothing arriving produced no spurious `txn_void` and no
`expected_epoch` drift; the exact `TKT-019.5` Ghost Payload sequence,
re-run at `NUM_COLORS=60`, reconstructed N+1 byte-for-byte with zero
contamination from N.

**Provenance: both findings originate in `TKT-019.8`** (pre-implementation
architecture re-check, 2026-09-11), not in any earlier ticket; both were
closed in `TKT-019.10` (2026-09-11, same day, later session). `TKT-019.5`'s
original Ghost Payload finding is a different, separately-provenanced
failure (mitigated in `TKT-019.8`, re-proven under the idle-gap condition
in `TKT-019.10`); this doctrine does not merge their provenance.

### 6.1 `TKT-019.11` — physical-boundary falsification: three closures, one new defect

A falsification attempt against three of §5's previously-UNPROVEN items
(Scopes 1/2/4), plus a digital cell-count comparison (Scope 4) — **not**
a re-opening of `TKT-019.10`'s Findings A/B, which remain closed,
unaffected.

- **Scope 1 (real clock skew under the `CDC_IDLE`/`CDC_ACTIVE` gate) —
  `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS`.** Held under
  randomized phase, a deterministic frequency offset, skew at and past
  the FIFO's own `DEPTH`, and worst-case arrival ordering — conditions
  `TKT-019.10` itself had not exercised.
- **Scope 2 (multi-lane simultaneous stale/future-epoch population) —
  `PROVEN — DIGITAL SIMULATION, TESTED CONDITIONS`**, for the specific
  mixed population constructed (two two-deep stale backlogs + one
  future-epoch word + a forced void). Not an exhaustive sweep of every
  possible population shape.
- **Scope 4 (physical re-cost of Candidate 2) — measured, not estimated.**
  +10 cells at both tested geometries (bring-up and the GCB-034 Mode B
  ceiling) — cheap, by the same standard `TKT-019.9` applied to epoch
  isolation and the watchdog, and far cheaper than CRC32's 4-5× cost.
  Digital cell-count only, no synthesis, no timing closure, no physical
  PPA number (§1.2).
- **Scope 3 (epoch rollover/wraparound) — `CONFIRMED OPEN DEFECT`, NOT
  proven closed, NOT silently patched.** Under the specific aliasing
  construction tested (16 full wraps of `EPOCH_W`, no generation
  counter), "matching epoch" loses the meaning Candidate 2's own
  invariant relies on. This is **not a Candidate 2 implementation bug** —
  Candidate 2's stated invariant held exactly as specified; the failure
  is one level up, in what a finite-width epoch counter *can* mean after
  enough wraps with nothing to distinguish generation N's epoch 3 from
  generation N+1's epoch 3. Held for disposition, per this epic's
  standing discipline against silently patching a newly-found defect.
  **Recommended (not ratified) next action, per `TKT-019.11`'s own
  comparison:** either pair the epoch tag with an explicit generation
  counter, or bound the claim to "rollover-free operating windows" and
  make that bound an explicit, checked contract rather than an implicit
  assumption — the Architect's call, not this doctrine's.

**Provenance: this Scope-3 finding originates in `TKT-019.11`**
(2026-09-13), distinct from, and not merging the provenance of,
`TKT-019.8`'s Findings A/B above or `TKT-019.5`'s original Ghost Payload
finding.

---
## 7. Contradictions and open questions this doctrine surfaces but does not resolve

- `TKT-019.6`'s M3/M4 language reads as a firm specification ("no single bit
  is ever the sole arbiter again"); `TKT-019.7`'s trade study selected CRC32
  as *one* of the integrity mechanisms without an explicit sign-off that CRC
  indirection was an accepted substitute for M3's deterministic count check.
  Finding A was the consequence of that gap never being closed explicitly.
  **Resolved by implementation, not by retroactive interpretation**:
  `TKT-019.10` added the missing deterministic length-count gate M3
  specified, rather than deciding after the fact that CRC indirection had
  been an acceptable substitute all along - the question of whether the
  original gap was a silent scope-narrowing or an implicit acceptance is
  now moot for the RTL's behaviour, though still unanswered as a question
  about how it happened.
- The ≈60 λ (link-budget estimate) vs. 64 (RTL test ceiling) distinction
  in §3.1 is, as far as this document can tell, not stated explicitly
  anywhere else in the epic's own artifacts — the two numbers are used
  close together in several places without a note that they come from
  different processes. Flagged, not corrected elsewhere by this doctrine.
- This document and `GCB-039`'s README audit both independently surfaced
  that `gcb-wiki/README.md`'s own sibling-repo index table predated six
  now-active repos (`gcb-wdm-transceiver`, `gcb-photonic-qam-v2`,
  `gcb-analog-rx`, `gcb-pic-core`, `gcb-python-orchestrator`,
  `gcb-workspaces`). **Fixed (2026-09-13, `README.md@bfceff7`)** — a
  completeness omission, not an open question; descriptions drawn from
  each repo's own README.

---
## 8. What this document is not

Not a ratification of the optical epic. `TKT-019.10` closed `TKT-019.8`'s
two named defects, and `TKT-019.11` closed three more previously-unproven
scenarios (§6.1, Scopes 1/2/4) — each labelled `PROVEN — DIGITAL
SIMULATION, TESTED CONDITIONS` — that is a specific, bounded
digital-regression claim, **not** architectural ratification of the
integrity/mitigation layer (§1.2), not a silicon-feasibility, optical-BER,
FEC-necessity, or physical-receiver claim of any kind, and not a claim
that every condition listed in §5 as still unproven has been addressed.
`TKT-019.11` also *added* a new open item rather than only closing old
ones — epoch rollover aliasing (§6.1, Scope 3) is a **confirmed open
defect**, held for disposition, not a closure. Every physical number in
§3 remains explicitly labelled ESTIMATE/ASSUMPTION because that is what
it is, unaffected by anything `TKT-019.10`/`.11` did. The next legitimate
update to this document is a new finding, not a confidence adjustment.
