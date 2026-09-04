# Architectural Intent: The Electro-Optic Triad

## 1. The Domain Separation Doctrine

To transition the GCB Photonic QAM Accelerator from a mathematical architecture into a physically realizable ASIC, the system is strictly partitioned into three independent repositories. This separation enforces the boundaries between fundamentally different physical domains, toolchains, and design methodologies.

### Repository 1: `gcb-photonic-qam-v2` (Digital Datapath)

* **Scope:** Components 1 (AXI), 2 (Tx Mapper), 3 (Wavelength Router), and 6 (Rx Recombiner).
* **Domain:** Discrete-time digital logic.
* **Toolchain:** SystemVerilog, Verilator, standard-cell synthesis (Yosys/OpenROAD).
* **Role:** The digital brain. It prepares the unweighted bit-planes and algebraically reconstructs the final INT16 answers.

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
