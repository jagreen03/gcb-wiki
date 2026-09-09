# Open-Source EDA & Verification Toolchain

**Level:** — (doctrine / engineering infrastructure, not GCB hardware).

GreenCoyote-Bay's RTL-to-GDSII flow is **entirely open source**. This note fixes
the tool at each stage, the reason it is the chosen tool for an AI-fiber-math
accelerator specifically, and the version floor. Proprietary simulators and
synthesis tools may be used for spot-checking, but the trunk flow — the one CI
runs and the one a contributor must be able to reproduce on a laptop — uses only
the stack below.

Single source HDL: **SystemVerilog (IEEE 1800-2012)**. Everything upstream of it
is a generator; nothing sits between the generator and the SystemVerilog (see
sec. 3).

---

## 1. Simulation & Verification

| Tool | Role | Version floor | Invoked by |
|---|---|---|---|
| **Verilator** | cycle-accurate compiled simulation; lint | 5.032 | `gcb-wdm-transceiver/sim/lint.sh`, `sim/run_tb.sh` |
| **Cocotb** | Python-driven coroutine testbenches | 1.9 | `gcb-python-orchestrator` (planned) |

### Verilator

The datapath under test is a 256-core INT4 systolic matmul feeding a photonic
reduction fabric. A behavioural (event-driven) simulator spends its cycles on
scheduler overhead; a **compiled** simulator spends them on the arithmetic. For
the workloads GCB verifies — full `M x N x K` GEMM passes, 70B-FFN traces
(`06_70B_transformer_workload_trace.md`), thousand-beat DMA prefetch windows —
Verilator's C++ output is the only open tool fast enough to run them to
completion in CI rather than on a sampled sub-window.

Rules:

* `--binary --timing` for self-checking testbenches; `--lint-only -Wall` as a
  gate on every top (see `sim/lint.sh`). Warnings are errors except the
  documented `-Wno-` set in the sim scripts.
* Every testbench prints `ALL CHECKS PASS` on success; CI greps for it.
* Drive DUT inputs at `#1` after the clock edge (Verilator's initial-block
  coroutines execute nonblocking assignments as blocking) — this is the house
  pattern in every `tb/*.sv`.

### Cocotb

The GCB control plane is Python (`gcb-python-orchestrator`: `scheduler.py`,
`compiler/`, `DMAPacker`). Re-implementing that tiling/packing logic a second
time in SystemVerilog just to build stimulus is duplication that drifts.
**Cocotb** lets the *same* Python driver that will run against silicon drive the
SystemVerilog DUT directly over Verilator's VPI, so the operand packer, the
descriptor builder, and the golden model are written once.

Rules:

* Cocotb tests run against the Verilator build (`SIM=verilator`).
* A Cocotb test and a native-SV testbench may both exist for a block; the
  native-SV one stays the CI gate for pure-RTL invariants (timing, handshake,
  reset), Cocotb covers end-to-end behaviour that needs the real Python model.
* No RTL is added solely to make a block Cocotb-drivable; the DUT interface is
  the same one silicon sees.

---

## 2. Synthesis & Layout

| Tool | Role | Version floor | Notes |
|---|---|---|---|
| **Yosys** | RTL synthesis, formal, netlist | 0.52 | with the **Surelog / UHDM** front-end plugin |
| **Surelog / UHDM** | SystemVerilog-2017 elaboration into Yosys | current | replaces the `sv2v` pre-pass for the synthesis flow |
| **OpenROAD** | RTL-to-GDSII physical implementation | current (OpenROAD-flow-scripts) | 5 nm-class PDK |

### Yosys + Surelog / UHDM

Yosys's built-in SystemVerilog front end does not parse the constructs GCB RTL
relies on (packages, parameterised interfaces, `unique case`, typed ports).
Earlier work routed around this with `sv2v` (a lossy SV-to-Verilog-2005
translation) — acceptable for *schematic rendering*
(`gcb-dashboard/build_visuals.py`), **not** for synthesis, where the elaborated
design must match the simulated one.

The synthesis flow therefore uses **Surelog** (a full SV-2017 parser) producing
**UHDM**, read into Yosys via its UHDM front-end plugin. This elaborates the
real SystemVerilog — no intermediate language, no translation step to audit.
`sv2v` remains only in the visualization path.

### OpenROAD

Physical implementation targets a **5 nm-class** open PDK through OpenROAD
(floorplan, place, CTS, route, GDSII), driven by OpenROAD-flow-scripts. The
gate-equivalent budgets recorded in the backlog trade studies (e.g.
`TKT-004`'s address-translation area estimates) are stated at this node so they
compare directly against OpenROAD reports.

---

## 3. Hardware Generation — banned and required

### Banned: intermediate HDL generators

Do **not** introduce **Chisel**, **Amaranth (nMigen)**, SpinalHDL, PyRTL,
Migen, or any other "describe hardware in language X, emit Verilog" layer.

Reason: it puts a second HDL, its own compiler, and its own semantics between
the engineer and the SystemVerilog that is actually taped out. The simulated
artifact, the synthesised artifact, and the thing a reviewer reads all diverge
through a translator nobody on the team owns. GCB's RTL is small enough to
write directly and important enough to read directly.

### Required: Python + Jinja2 templating

Parameterisation and repetition are handled by **`Jinja2` templating driven by
the orchestrator**, emitting **pure SystemVerilog**. The generator language is
Python; the generated language is SystemVerilog; nothing sits between them.

* Precedent: `gcb-spec/regen.py` already generates five consumers
  (SV package, C++ header, Python, TypeScript, Markdown) from the single
  `registers.yaml` source. New generated RTL follows the same shape — a data
  file plus a template, run by the orchestrator, output committed and readable.
* Generated files carry a "DO NOT EDIT — generated by `<script>` from
  `<source>`" banner and are committed (not built on the fly), so a checkout
  without Python still builds.
* Templates emit standard SV parameters, `generate` blocks, and macros — no
  constructs that only the template makes sense of.

---

## 4. Non-negotiables

1. **Open-source trunk.** CI and the reproducible laptop flow use only the tools
   above. A proprietary tool may cross-check a result; it may not be a required
   step.
2. **SystemVerilog is the single source HDL.** One language, hand-written or
   Jinja2-generated, simulated and synthesised as-is.
3. **No HDL-generator DSL.** Python generates *text*; that text is SystemVerilog.
4. **Simulated == synthesised.** Verilator and Yosys/Surelog elaborate the same
   SystemVerilog; the visualization-only `sv2v` path is not in the synthesis
   flow.
5. **The Python model is written once.** Cocotb reuses the orchestrator's own
   packer / scheduler / golden model rather than a SV re-implementation.
