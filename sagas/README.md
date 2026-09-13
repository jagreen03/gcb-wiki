# GreenCoyote-Bay Sagas — the persona-oriented narrative portal

> **This directory is a *narrative* layer, not the source of truth.**
> Every saga below is a retelling, at a specific audience's depth, of
> facts established in [`gcb-spec`](../../gcb-spec/) and verified
> against real code/tool output during this program's own sessions. If
> a saga and `gcb-spec` (or the real repository it cites) ever
> disagree, **`gcb-spec` wins** — file it as a bug in the saga, not a
> new fact about the program. See
> [`gcb-wiki`'s own standing note](../README.md) on why `gcb-wiki`
> itself is a derived view, not authoritative.

## Who each saga is for

| Saga | Audience | What it gives them |
|---|---|---|
| [`saga-01-neighbor.md`](saga-01-neighbor.md) | A neighbor, no technical background | Plain-language "what and why," the streaming-vs-storing mental model |
| [`saga-02-math-prof.md`](saga-02-math-prof.md) | Math professor | The $4\mathrm{Re}(AB^*)$ homodyne identity, the MZI transfer matrix $M(\lambda)=C_2 P(\Delta L,\lambda) C_1$, the two-different-16s trap |
| [`saga-03-photonics-prof.md`](saga-03-photonics-prof.md) | Photonics professor | The Track A/B mechanism split, the real $n_{\text{eff}}=2.684623$ mode-solve, MMI vs. dispersive combiner layouts |
| [`saga-04-electrical-eng.md`](saga-04-electrical-eng.md) | Electrical engineer | Real Vivado P&R numbers (WNS +0.261 ns), the 5-way register-map generation chain, ADR-005 vs. `gcb-analog-rx` |
| [`saga-05-mechanical-eng.md`](saga-05-mechanical-eng.md) | Mechanical engineer | Real die/macro footprints, the FakeRAM power-number caveat, open photonic-packaging questions |
| [`saga-06-investor.md`](saga-06-investor.md) | Business investor | The two-track commercialization shape, de-risking points, and an explicit licensing-status flag (do not assume Apache 2.0) |
| [`saga-07-corporate.md`](saga-07-corporate.md) | Corporate contacts | The real host-software API stack, a worked integration-risk example |
| [`saga-08-student.md`](saga-08-student.md) | Students & researchers | A runnable tool-by-tool tutorial path (Yosys, OpenROAD, Icarus, femwell, gdsfactory) |

## How these were written

Each saga's technical claims were checked against real files or real
tool output in the same session that wrote it — not transcribed from a
prior draft and trusted. Where a claim could not be verified (for
example, a specific licensing model), the saga says so explicitly
rather than asserting it. If you find a claim in any saga that doesn't
hold up against the real repository, that is a real documentation bug —
fix the saga, the same way the rest of this program's documentation
gets corrected when found stale.

## Viewing these in a browser

[`gcb-wiki/viewer/`](../viewer/) is a small, static TypeScript/HTML
client that renders this `sagas/` directory (Markdown + Mermaid) as a
navigable site, with a persona selector and a technical-depth toggle,
deployable to GitHub Pages. See that directory's own `README.md` for
build/deploy instructions. Reading the raw Markdown files directly (on
GitHub, in Obsidian, or any Mermaid-aware Markdown viewer) works too —
the viewer is a convenience, not a requirement.
