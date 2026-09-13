# Architectural Intent: The Electro-Optic Triad

## 0. Governing intent: make the photonic design correct, not merely specified

Every other section of this document describes how the design is
**partitioned**. This section states what "done" means for Repository 3
(`gcb-pic-core`) specifically, because it is the one of the three domains
with the least physical evidence behind it today — checked directly, not
assumed, in
[`gcb-wiki/appendices/silicon-and-package-detail.md`](appendices/silicon-and-package-detail.md):
no layout, no GDS, no extracted loss figure exists yet for the photonic
core, and the laser/modulator bank feeding it has **zero** real spec
(wavelength count, linewidth, modulator bandwidth, power budget — none of
it recorded anywhere in this program's real artifacts).

**The intent is not "the photonic architecture is well-specified."** It
already is, at the level a mathematical/architectural description can be.
The intent is: **the photonic design is correct when it has survived the
same Orange-Team "Physical Reality First" discipline already applied to
the digital path** ([`gcb-workspaces/backlog/TKT-000`](https://github.com/jagreen03/gcb-workspaces/blob/main/backlog/TKT-000-orange-team-epoch-guidance.md)) —
measured first, interpreted, only then changed — not asserted correct
because the math checks out in simulation.

**The real, currently blocking questions** (not invented for this
section — each traces to an `Open` item in
[`gcb-wiki/DECISION_LEDGER.md`](DECISION_LEDGER.md) or a `CONCEPT ONLY`
entry in `16_hardware_parts_systems_specification.md`):

1. What is the real insertion-loss / combiner-loss regime of the actual
   MMI power-summing tree (`gcb-pic-core/mmi_power_tree.py`)? The toolchain
   to extract it (`gdsfactory` + `femwell`) is confirmed working; the
   extraction itself has not been attempted against this specific geometry.
2. 4:1 vs. 8:1 first-cell fan-in (`DECISION_LEDGER.md`:
   `optical.cell.fanin`) — blocked on (1).
3. The laser/modulator bank (`16_hardware_parts_systems_specification.md`
   Part 9) has no wavelength count, channel spacing, laser type, modulator
   type/bandwidth, or power budget recorded anywhere — the least-specified
   real component in the entire inventory.
4. The analog Rx front-end's `CONDITIONAL GO → GO` gate
   (`DECISION_LEDGER.md`: `readout.comparator.noise.spectre-histogram`)
   needs a commercial transient-noise histogram this toolchain set does
   not have access to — tightly coupled to photonic correctness, since
   this is the circuit the photonic signal is measured by.

This list is meant to be revisited periodically, not answered once and
filed away — each entry should be re-checked against the real repos the
same way this section was built, and corrected the moment reality moves
past it.

## 1. The Domain Separation Doctrine

To transition the GCB Photonic QAM Accelerator from a mathematical architecture into a physically realizable ASIC, the system is strictly partitioned into three independent repositories. This separation enforces the boundaries between fundamentally different physical domains, toolchains, and design methodologies.

### Repository 1: `gcb-photonic-qam-v2` (Digital Datapath)

* **Scope:** Components 1 (AXI), 2 (Tx Mapper), 3 (Wavelength Router), and 6 (Rx Recombiner).
* **Domain:** Discrete-time digital logic.
* **Toolchain:** SystemVerilog, Verilator, standard-cell synthesis (Yosys/OpenROAD).
* **Role:** The digital brain. It prepares the unweighted bit-planes and algebraically reconstructs the final INT16 answers — the encode/decode math is specified in [`gcb-wiki/13_bitplane_tx_mapper.md`](13_bitplane_tx_mapper.md).

### Repository 2: `gcb-analog-rx` (Mixed-Signal Baseband)

* **Scope:** Component 5 (Rx Quantizer / Switched-Charge Integrator).
* **Domain:** Continuous-time electrical analog / mixed-signal.
* **Toolchain:** SPICE, Verilog-A behavioral models, full-custom transistor layout.
* **Role:** The foundation of the electrical stack. It translates continuous analog micro-amps (photocurrents) into discrete digital voltages without amplifying thermal noise.

### Repository 3: `gcb-pic-core` (Photonic Integrated Circuit)

* **Scope:** Component 4 (Photonic Core / MZI Mesh / Photodiodes).
* **Domain:** Optical physics and waveguide geometry.
* **Toolchain:** `gdsfactory` (Python), optical FDTD solvers, optical S-parameter extraction.
* **Role:** The physical execution unit. It computes the balanced-homodyne matrix multiplication using the coherent interference of light.

## 2. Interface Invariants (The Hand-Offs)

The boundaries between these repositories represent the actual physical interfaces on the silicon die:

* **Digital to Photonic (Tx):** The digital router outputs static 1s and 0s. The photonic layout dictates how those electrical bits drive the optical ring modulators.
* **Photonic to Analog (Rx):** The photonic core outputs continuous photocurrent from the square-law photodiodes.
* **Analog to Digital (ADC):** The analog quantizer integrates that photocurrent and passes the quantized digital cross-products ($L_{ij}$) back to the digital recombiner.
