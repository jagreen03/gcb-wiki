# Project Goals: Physical Realization Phase

## Primary Objective

Move the GCB architecture out of the "academic simulation" tier by actively tackling the analog and optical technical debt. We will build the physical and behavioral models for Components 4 and 5 in their respective repositories to prove they can physically support the digital datapath.

## Near-Term Goals

### 1. Stand Up the Analog Repository (`gcb-analog-rx`)

* **Initialize:** Create the repository for Component 5.
* **Behavioral Modeling:** Write a Verilog-A or Python/SPICE model of the switched-charge integrator.
* **Target:** Prove that the integrator can resolve the tiny analog current differences (the $4\text{Re}(AB^*)$ output of the balanced homodyne detectors) into stable digital bits at the target clock speed without the SNR collapsing.

### 2. Stand Up the Photonic Repository (`gcb-pic-core`)

* **Initialize:** Create the repository for Component 4.
* **Layout Scripting:** Use `gdsfactory` to programmatically generate the physical silicon layout for a single $K=16$ balanced-homodyne multiplier tile.
* **Target:** Extract the *actual* insertion loss and phase noise profiles from the physical waveguide layout, rather than relying on theoretical estimates.

### 3. Cross-Domain Validation (Closing the Loop)

* **Goal:** Feed the hard physical data (noise figures, capacitance, loss) extracted from the Analog and Photonic repositories back into the C++ DPI-C simulator in the Digital repository.
* **Success Criteria:** Prove the digital Rx Recombiner still flawlessly reconstructs the INT16 tensor when subjected to the actual physical noise floors of our custom layouts.
