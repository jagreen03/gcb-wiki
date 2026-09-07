# FIG-005 — Readout architecture decision tree (ICO → Single-Slope)

> Text specification only. No image is produced in Phase A.

## Purpose

Trace how the receiver architecture converged: from oscillator/ΔΣ encodings
that were falsified, to the single-slope CIS readout that was accepted, with
the one-line kill reason on every rejected branch.

## Description

**Type / geometry.** Top-down decision tree. Root at top; rejected leaves in a
muted colour with a ✗ and their kill reason; the accepted path in a strong
colour ending in a ✓ box; one amber ◐ box for the open item.

**Nodes:**

```
                     [ digitise the optical group output < 0.02 pJ/MAC ]
                                        |
        +-------------------+-----------+------------------+
        |                   |                             |
  per-channel TIA      oscillator / phase            direct comparison
  + multi-bit ADC       accumulation                  vs a shared ramp
        |                   |                             |
   ✗ ADC energy      +------+------+                 single-slope CIS
     floor exceeds    |             |                      |
     0.02 pJ/MAC   tail-injection  charge-        +--------+---------+
                    ICO            balancing ΔΣ   |                  |
                     |             (0.5 fF node)  charge-up          discharge
              ✗ encodes charge     |             (rising ramp)      (falling ramp)
                in PVT-dependent  ✗ retired         |                  |
                f(I); lin↔PN       (ADR-005):    ✗ 0.72 V ramp top    ✓ ACCEPTED
                op-points          no free          from 0.8 V rail:     (ADR-005)
                contradict         oversampling;    < 80 mV, cannot      2.0 pF C_int,
                (no PVT margin)    every sub-block   cascode              cascode sink
                                  re-adds the cost                       + replica servo,
                                                                         chopped/AZ preamp
                                                                         30 µA, 12-bit
                                                                         6 GHz x4-phase,
                                                                         3-point cal
                                                                            |
                                                                     ◐ OPEN: Spectre
                                                                       transient-noise
                                                                       histogram lifts
                                                                       CONDITIONAL GO -> GO
```

**Secondary rejected leaves (list beside the tree, not in the flow):**
10-bit quantization — crest-factor failure · CDS — −1.7 dB · 300 MHz PD
chopper — cyclostationary mixer · DAC ramp ≤4-pt cal — scoring artifact ·
1 pF `C_int` — rail collision · 15 µA comparator tail — settling time ·
ripple-carry Gray counter — SS/125 °C timing · Xyce via conda — Trilinos
missing NOX/LOCA.

**Data.** Schematic — no data binding. Every node label is a row of
`DECISION_LEDGER.md`; the tree is that table drawn as a graph.

## Viewer Conclusions

- The single-slope readout was reached by elimination: the two "cleverer"
  encodings (ICO, ΔΣ) were each falsified on PVT/energy grounds first.
- The ΔΣ analysis was load-bearing — it produced the "no free oversampling"
  finding that redirected the effort (ADR-005 credits it).
- One item remains open on the accepted path (the commercial noise histogram);
  everything else on that path is Accepted.

## Invalid Conclusions

- Not a chronology — branch order is logical, not the order ideas were tried.
- "Rejected" ≠ "impossible": each kill reason is specific to GCB's 0.8 V rail,
  256 ns window, crest-6 signal, and 56 dB target.
- The tree shows decisions, not effort or cost of each branch.

## Sources

- `gcb-wiki/DECISION_LEDGER.md` (all rows)
- `gcb-spec/docs/adr/ADR-005-Single-Slope-Readout.md` ("What the evaluation
  found")
- `gcb-papers/data/readout/spice/SPICE_RESULTS_V{1,2,3}.md`
- `gcb-spec/registers.yaml` → `design_decisions:` DD-001

## Render Status

`SPEC`. Data revision: n/a (schematic; tracks `DECISION_LEDGER.md`).

## Disclaimer Text

"Architecture decision tree for the GCB receiver. Kill reasons are specific to
the GCB operating point (0.8 V, 256 ns, crest 6, 56 dB target). Mirrors
`DECISION_LEDGER.md`; the accepted path is CONDITIONAL GO pending a commercial
transient-noise histogram."
