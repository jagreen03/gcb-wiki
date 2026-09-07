---
title: "GCB — Probable Silicon Product: 10,000-Foot Architecture View"
author: "Architecture Working Note"
date: "2026-09-07"
geometry: margin=0.7in
---

# GCB — Probable Silicon Product

## 10,000-Foot Architecture View

> **Purpose:** This is an architectural inference, not a frozen implementation specification. It deliberately makes educated guesses about what the present GCB work is likely to become at silicon scale.

## Executive view

If we step back to the **10,000-foot architecture level**, the materials point toward a recognizable silicon product.

I would **not** describe GCB as an "optical ADC chip." That is much too narrow.

My strongest guess is:

> **GCB Photonic Compute Tile — a heterogeneous silicon/chiplet accelerator that presents ordinary linear-algebra operations to software while performing the dominant multiply/reduction work optically.**

The key architectural idea is that the optical fabric is a **specialized execution engine**, not the entire computer.

```mermaid
flowchart TD
    HOST["Host CPU / GPU"] --> IO["PCIe / CXL"]
    IO --> TILE["GCB Photonic Compute Tile"]

    subgraph TILE["GCB TILE"]
        CTRL["RISC-V / Vortex<br/>Control + Conventional Compute"]
        MEM["SRAM / Buffers<br/>Weights + Working Set"]
        NUM["Q17.14 / BFP<br/>Numerical Interface"]
        PHOT["8 × 8 Photonic Mesh<br/>Optical Matrix Operation"]
        RX["PD / Charge Integration<br/>Mixed-Signal Receiver"]
        DIG["Digital Reconstruction<br/>Calibration / Vector Ops"]

        CTRL --> NUM
        MEM --> NUM
        NUM --> PHOT
        PHOT --> RX
        RX --> DIG
        DIG --> CTRL
    end

    DIG --> OUT["Activation / Result"]
    OUT --> NEXT["Next GCB Tile"]
```

The architecture therefore looks less like a magical photonic processor and more like a conventional accelerator wrapped around an unusual physical execution unit.

---

# 1. Two likely physical levels

I don't think the eventual implementation necessarily wants to be one giant monolithic die containing everything.

A more natural physical realization is likely to separate the digital compute/control domain from the photonic and mixed-signal domain.

## Level 1 — GCB digital compute die

```mermaid
flowchart LR
    subgraph DIGITAL["GCB DIGITAL DIE"]
        CPU["Vortex / RISC-V Cores"]
        SIMD["SIMD / Vector Machinery"]
        DISPATCH["Instruction Dispatcher"]
        FIXED["Q17.14 / BFP Arithmetic"]
        SRAM["Local SRAM"]
        DMA["DMA / Memory Controller"]
        CAL["Calibration"]
        RECON["Numerical Reconstruction"]
        FAB["PCIe / CXL / Fabric Interface"]

        CPU --> DISPATCH
        SIMD --> DISPATCH
        DISPATCH --> FIXED
        SRAM --> FIXED
        DMA --> SRAM
        FIXED --> CAL
        CAL --> RECON
        RECON --> FAB
    end
```

This side is where the architecture can remain relatively conventional: control, memory management, vector operations, calibration, reconstruction, nonlinear operations, and system interfaces.

## Level 2 — photonic / mixed-signal die

```mermaid
flowchart LR
    subgraph OPT["GCB PHOTONIC / MIXED-SIGNAL DIE"]
        LASER["Laser / Optical Input"]
        MOD["Modulators"]
        MESH["8 × 8 Optical Mesh"]
        PD["Photodiode Array"]
        INT["Charge Integrators"]
        CMP["Comparator / Quantizer"]
        RAMP["Ramp / Time Reference"]
        CAP["Digital Capture"]

        LASER --> MOD --> MESH --> PD --> INT --> CMP --> RAMP --> CAP
    end
```

The important architectural boundary is therefore:

**photons → mixed-signal receiver → digital numerical representation.**

That receiver is not merely an ADC peripheral. It is the interface between optical computation and the digital computer.

---

# 2. The receiver experiment is more important than "an ADC"

The current receiver work is really defining the interface where optical computation becomes a number.

Conceptually:

```mermaid
flowchart TD
    I["Photocurrent"] --> C["Charge on Integration Capacitor"]
    C --> COMP["Dynamic Comparator"]
    COMP --> R["Shared Ramp"]
    R --> T["Time / Count Representation"]
    T --> D["Digital Reconstruction"]
```

The current design assumptions make this a real mixed-signal macro rather than an abstract block:

- 2 pF integration capacitor
- 6 GHz clock
- 4-phase capture
- nominal 12-bit conversion
- 256 ns observation window
- approximately 0.74 µA RMS photocurrent
- approximately 56 dB SNDR target

The architectural implication is:

> **GCB is defining the silicon boundary where photons become numerical values.**

That may ultimately be one of the most important blocks in the entire project.

---

# 3. What first silicon might look like

For a realistic first product, I would make the initial device substantially smaller than the ultimate system.

I would expect something conceptually like:

```mermaid
flowchart LR
    subgraph GCB1["GCB-1 — Photonic Linear Algebra Tile"]
        subgraph DIG["Digital"]
            CTRL["RISC-V / Vortex<br/>Control"]
            SRAM["SRAM<br/>Weight Tiles"]
            PILOT["Digital Pilot"]
            VEC["Vector / Fixed-Point Logic"]
        end

        MOD["DAC / Modulator Interface"]

        subgraph OPT["Optical"]
            MESH["8 × 8 Optical Mesh"]
        end

        subgraph RX["Receiver"]
            PD["Photodiode Array"]
            CHG["Charge-Domain Rx"]
            CAP["Digital Capture"]
        end

        CTRL --> PILOT
        SRAM --> PILOT
        PILOT --> MOD
        MOD --> MESH
        MESH --> PD
        PD --> CHG
        CHG --> CAP
        CAP --> VEC
        VEC --> CTRL
    end

    GCB1 --> LINK["Optical / Inter-Tile Link"]
    LINK --> NEXT["Next GCB Tile"]
```

The crucial point is that the optical mesh is **not the whole accelerator**.

It is a specialized execution unit.

That is why the software abstraction can remain conventional.

---

# 4. The software view should be boring

This is probably the most important strategic observation.

The application should not need to know that the calculation happened optically.

A target programming model could remain as ordinary as:

```python
C = A @ B
```

while the execution path becomes:

```mermaid
flowchart TD
    APP["NumPy / C++ Application"]
    API["BLAS-like API"]
    RT["GCB Runtime"]
    ISA["GCB Command / ISA"]
    GEMM["Photonic GEMM"]
    RECON["Digital Reconstruction"]
    RESULT["NumPy ndarray / C++ Result"]

    APP --> API --> RT --> ISA --> GEMM --> RECON --> RESULT
```

A GCB command such as `OP_GEMM` is therefore an implementation detail beneath a conventional linear-algebra interface.

The software ecosystem does not need to expose "photonic instructions" to the programmer.

**The exotic part is underneath the API.**

---

# 5. What GCB should probably be called

I would avoid these descriptions:

- photonic computer
- optical ADC
- optical GPU

Each emphasizes the wrong architectural boundary.

My preferred description is:

> **A heterogeneous photonic linear-algebra processor whose optical execution fabric performs high-dimensional multiply/reduction operations while conventional silicon handles control, nonlinear operations, memory management, and numerical reconstruction.**

That description captures the division of labor.

```mermaid
flowchart LR
    GCB["GCB"]
    P["Photonic Engine"]
    D["Digital Engine"]

    GCB --> P
    GCB --> D

    P --> PG["Static GEMMs<br/>QKV / O<br/>FFN / Matrix Products"]
    D --> DG["Dynamic Operations<br/>Attention<br/>Softmax<br/>RMSNorm<br/>Control"]
```

The architectural principle is therefore:

**photons do what physics is good at; digital logic does what programmability and data dependence require.**

---

# 6. The scaling story

The DIY → workstation → server → frontier progression becomes much clearer if the fundamental unit is a replicated tile rather than one enormous photonic die.

## DIY

```mermaid
flowchart TD
    TILE["GCB Tile"]
```

One tile is enough to demonstrate the basic optical linear-algebra execution path.

## Enthusiast / workstation

```mermaid
flowchart TB
    HOST["Host"]
    T0["GCB 0"]
    T1["GCB 1"]

    HOST --> T0
    T0 <--> T1
```

Multiple tiles begin to expose parallelism.

## Server

```mermaid
flowchart TB
    HOST["Host / CPU"]
    T0["GCB 0"]
    T1["GCB 1"]
    T2["GCB 2"]
    TN["GCB N"]

    HOST --> T0
    HOST --> T1
    HOST --> T2
    HOST --> TN
```

## Frontier

```mermaid
flowchart TB
    HOST["Host / Fabric"]

    subgraph FAB["GCB Optical Fabric"]
        A["Tile"]
        B["Tile"]
        C["Tile"]
        D["Tile"]
        E["Tile"]
        F["Tile"]
        A <--> B
        B <--> C
        A <--> D
        B <--> E
        C <--> F
        D <--> E
        E <--> F
    end

    HOST --> FAB
```

The important scaling insight is:

> **Do not make one GCB tile enormous. Make the tile cheap, composable, software-transparent, and extremely efficient at linear algebra.**

That creates a credible path from one experimental tile to a many-tile accelerator fabric.

---

# 7. What receiver PASS actually unlocks

If the receiver experiment passes, I would **not** say:

> "We have built a photonic GPU."

I would say:

> **We have removed one of the fundamental unknowns preventing a photonic linear-algebra processor from becoming a silicon architecture.**

The resulting architecture becomes:

```mermaid
flowchart TB
    SW["Software<br/>NumPy / C++"]
    API["BLAS / API"]
    RT["GCB Runtime"]
    ISA["GCB ISA"]

    subgraph EXEC["GCB Execution"]
        DIG["Digital Control<br/>Vortex / SRAM / Vector"]
        OPT["Optical Compute<br/>8 × 8 Mesh"]
        RX["Charge-Domain Rx<br/>Photodiodes / Quantization"]
    end

    OUT["Numerical Result"]

    SW --> API --> RT --> ISA
    ISA --> DIG
    ISA --> OPT
    OPT --> RX --> DIG
    DIG --> OUT
```

That is a **real computer architecture**, rather than simply a photonics experiment.

The deeper design flow is:

1. determine what numerical error the network tolerates;
2. determine what physical energy is required to achieve it;
3. compose those constraints into the system architecture.

---

# 8. What if the receiver fails?

A receiver failure does not necessarily kill GCB.

It could kill **this receiver implementation**.

That distinction matters.

```mermaid
flowchart TB
    GCB["GCB Architecture"]
    ARCH["Optical Reduction Architecture"]
    IMPL["Current Receiver Implementation"]
    PASS["PASS"]
    FAIL["FAIL"]
    ALT["Alternate Quantization Primitive"]

    GCB --> ARCH --> IMPL
    IMPL --> PASS
    IMPL --> FAIL --> ALT
```

The real project-killing question is higher in the hierarchy:

> **At the numerical precision actually required by the model, does physical optical reduction still consume less energy than digital reduction?**

That is the fundamental GCB kill condition.

A different receiver architecture can preserve the larger architectural thesis.

---

# 9. Strongest silicon prediction

If I had to name the probable eventual physical object today, without pretending the design is finalized, I would call it:

## GCB Photonic Compute Tile (PCT)

with three primary technological domains:

```mermaid
flowchart LR
    PCT["GCB Photonic</br>Compute Tile"]

    PCT --> CMOS["DIGITAL CMOS"]
    PCT --> MIX["MIXED SIGNAL"]
    PCT --> PHOT["PHOTONICS"]

    CMOS --> C1["Vortex / RISC-V"]
    CMOS --> C2["SRAM"]
    CMOS --> C3["Vector / Control"]

    MIX --> M1["Photodiodes / Rx"]
    MIX --> M2["Calibration"]
    MIX --> M3["Timing / Reconstruction"]

    PHOT --> P1["Lasers / Optical Input"]
    PHOT --> P2["Modulators"]
    PHOT --> P3["8 × 8 Optical Mesh"]
```

A fourth physical component may be external/package memory:

```mermaid
flowchart TB
    MEM["GDDR7 / Equivalent High-Bandwidth Memory"]
    PKG["GCB Package"]
    SRAM["Local SRAM Working Set"]
    OPT["Photonic Compute"]

    MEM --> PKG
    PKG --> SRAM
    SRAM --> OPT
```

The mature product therefore looks less like:

> **one magical photonic chip**

and more like:

> **a tightly integrated compute package containing a conventional digital accelerator, local SRAM, mixed-signal optical receivers, and a photonic matrix engine.**

---

# 10. Confidence assessment

| Prediction | Confidence |
|---|---|
| GCB becomes a photonic linear-algebra accelerator | **Very high** |
| Optical engine acts as a specialized GEMM/reduction unit | **Very high** |
| Vortex/RISC-V remains the digital control/general-compute side | **High** |
| Local SRAM is critical | **Very high** |
| Receiver is local to photonic computation | **Very high** |
| 8 × 8 optical mesh becomes a replicated compute primitive | **High** |
| First implementation is heterogeneous rather than pure monolithic CMOS | **High** |
| Multiple GCB tiles form the scaling mechanism | **Very high** |
| NumPy/C++ sees ordinary matrix operations | **High** |
| GCB eventually resembles a CUDA-like compute platform architecturally | **Medium-high** |
| One enormous die is the frontier implementation | **Low** |
| Chiplet/package-level scaling is the frontier implementation | **High** |

---

# Bottom line

The likely endgame is **not**:

> "make the GCB chip enormous."

It is:

> **Make the GCB tile cheap, composable, software-transparent, and extraordinarily efficient at linear algebra.**

If that works, the progression becomes remarkably clean:

```mermaid
flowchart LR
    DIY["One Tile"]
    WORK["Many Tiles"]
    FAB["Optical Fabric"]
    SW["Software Sees<br/>Linear-Algebra Accelerator"]

    DIY --> WORK --> FAB --> SW
```

That is the probable silicon story hiding underneath the current experiments.

---

## Important distinction: current analog status

The current analog receiver should be treated as **CONDITIONAL GO**, not unconditional GO, until the commercial transient-noise histogram closes the surrogate-model uncertainty.

The digital RTL work can proceed in parallel because it does not depend on resolving that final analog-model uncertainty.

That means the project has crossed an important boundary:

> **The question is no longer primarily "can the circuit concept work?" It is becoming "what exactly is the digital machine surrounding the photonic computation?"**

