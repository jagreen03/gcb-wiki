# The Photonics Professor's Path Through GreenCoyote-Bay

> **Who this is for:** someone who thinks in waveguide modes, insertion
> loss, and phase noise, and wants to know exactly what physical claims
> this program is and isn't making.
>
> **Not the source of truth.** `gcb-spec` is. This page restates, with
> citations, what the checked-in physical models and simulations
> actually say — no physical measurement on real silicon exists
> anywhere in this program; every number below is simulated, modeled,
> or geometrically laid out, and is labeled as such.

## Two genuinely different optical mechanisms — don't merge them

This program contains **two architecturally distinct tracks**, each
with its own optical physics, confirmed by reading each repository's
own self-description rather than assumed from naming:

| | **Track A — "GCB/ODIN\_Bridge"** | **Track B — "GCB Photonic QAM Accelerator"** |
|---|---|---|
| Mechanism | Single-wavelength **power-summing** (incoherent intensity addition) | **Balanced-homodyne** coherent complex multiply, $4\mathrm{Re}(AB^*)$ |
| Wavelength plan | **One** O-band CW source, 1310 nm | Multiple DWDM "colors" per `gcb_dwdm_pkg.sv`, $K_{\max}=16$ per color |
| Governing model | `gcb-rtl/sim/mmi_tree_model.py`, `gcb-spec/bench_emulation_parameters.md` | `gcb-pic-core`'s component library (below) |
| Physical maturity | **Real Vivado P&R evidence** (see `saga-04-electrical-eng.md`) | RTL + layout only, no physical validation |

Conflating these two is a documented, previously-made error in this
program's own history (`TKT-033`) — the fix was checking `gcb-spec`
directly rather than trusting a secondary wiki narrative. Treat the
table above, not prose elsewhere, as the disambiguator.

## The waveguide mode itself — solved, not assumed

[`gcb-pic-core/mode_solve_strip.py`](../../gcb-pic-core/mode_solve_strip.py)
runs a real finite-element mode solve (via `femwell`) on a
**500 nm × 220 nm silicon strip waveguide**, SOI stack, at
$\lambda = 1.31\,\mu\text{m}$ (O-band, matching
`gcb-spec/bench_emulation_parameters.md`'s own wavelength commitment).
Result, reproduced byte-identically across two independent processes
before being trusted:

$$n_{\text{eff}} = 2.684623 \quad (\text{real part, fundamental quasi-TE mode})$$

The imaginary part returned is pure numerical noise (no complex
refractive index was supplied as input) — the script itself prints this
caveat and does not let a diagnostic loss number masquerade as a
measured propagation-loss figure. **This is the one number in the
entire photonics stack that was independently, numerically solved for
rather than assumed or copied from a datasheet.**

## MMI power-summing trees vs. dispersive MZI lattices — both real layouts, neither measured

[`gcb-pic-core/mmi_power_tree.py`](../../gcb-pic-core/mmi_power_tree.py)
lays out a binary MMI combiner tree at two sizes, both grounded in real
documents, not arbitrary:

- `N_INPUTS_SPEC = 8` — the Phase-I discrete bench cell count, from
  `gcb-rtl/sim/mmi_tree_model.py`'s own `CellParams.n_inputs`.
- `N_INPUTS_PHASE2 = 16` — the Phase-II integrated-array target
  ($L_{\text{CONTRACT}}$), **locked** in
  `gcb-spec/docs/optical_geometry_spec.md` v1.0.0.

[`gcb-pic-core/wdm_combiner_tree.py`](../../gcb-pic-core/wdm_combiner_tree.py)
and [`k16_tile.py`](../../gcb-pic-core/k16_tile.py) build the dispersive,
DWDM-lane-aware combiner geometry for Track B's $K_{\max}=16$ lanes —
kept in the repository as real, working layout generation, but
**explicitly flagged as not currently the targeted mechanism** once the
Track A/B distinction above was clarified; see the file headers for the
exact disposition history.

## The homodyne multiply cell — optical all the way to the photodiode pair

[`gcb-pic-core/qam_reduction_cell.py`](../../gcb-pic-core/qam_reduction_cell.py)
is the component that actually implements $4\mathrm{Re}(AB^*)$ per
[`saga-02-math-prof.md`](saga-02-math-prof.md)'s derivation:
`multiply_tap()` (the MZI-coupler half of
[`layout_homodyne.py`](../../gcb-pic-core/layout_homodyne.py)'s
`balanced_homodyne_cell()`, with **no photodiodes at this stage** — SUM
and DIFF stay optical) replicated across $n \in \{2,4,8,16\}$ lanes,
feeding two `power_tree()` instances (reusing the MMI power-tree
technique above), which in turn feed **one shared photodiode pair** at
the very end. Insertion loss and phase noise across this whole chain
are modeled, not yet bench-measured.

## Epistemic status, stated plainly

Every claim above is one of: (a) a real numerical mode-solve result,
independently reproduced; (b) a real, checked-in photonic layout
generator, geometrically valid but not fabricated; (c) a real digital/
RTL simulation model used for co-simulation, not a physical
measurement. **No photonic die, no optical bench measurement, no
fabricated waveguide exists anywhere in this program's evidence base.**
Phase I's *electronic* baseline (`saga-04-electrical-eng.md`) is
materially more physically mature than anything optical described here
— that asymmetry is real and should not be smoothed over in any
presentation built from this page.
