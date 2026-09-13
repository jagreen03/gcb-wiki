# GreenCoyote-Bay Lenses — the consolidated entry portal

> **Not the source of truth.** `gcb-spec` is. Lenses are a *fewer,
> broader* consolidation of [`../sagas/`](https://github.com/jagreen03/gcb-wiki/blob/main/sagas/README.md)'s 8
> narrower persona documents plus five newly-requested manufacturing/
> test perspectives — built because 13 standalone files was more
> clutter than the material needed, not because the underlying detail
> stopped mattering. **The 8 sagas are unchanged and still there** —
> each lens links out to its constituent sagas for full depth (Single
> Source of Truth: a fact lives in one saga or the shared
> [manufacturing appendix](../appendices/manufacturing-pdk.md), cited
> from whichever lens needs it, never re-derived).

## The 4 lenses

| Lens | Absorbs | Start here for |
|---|---|---|
| [`01-silicon-architect.md`](01-silicon-architect.md) | Electrical Engineer, Photonics Professor, Math Professor, Chip Manufacturer/Tiny Tapeout, Silicon Tester | RTL, photonics physics, the math, and the honest state of tapeout/silicon test (mostly: not started) |
| [`02-systems-board.md`](02-systems-board.md) | Mechanical Engineer, PCB Manufacturer, Board Assembler, Board/System Tester | Physical footprint numbers that exist, and the PCB/board/assembly/test work that doesn't yet |
| [`03-software-integrator.md`](03-software-integrator.md) | Corporate Contacts, Students & Researchers | The real host-software API stack and a runnable open-source toolchain path |
| [`04-strategic-partner.md`](04-strategic-partner.md) | The Neighbor, Business Investor | Plain-language framing, the two-track commercialization shape, and a licensing-status flag |

## Why lenses exist alongside sagas, not instead of them

Each lens is a **complete, standalone read** at three depth levels
(Executive / System / Foundry — use the viewer's depth toggle), not a
thin table of contents. But the full derivations, complete numeric
tables, and step-by-step tutorials live in the sagas and the appendix
— a lens cites and links rather than repeating them, so a fact edited
in one place stays correct everywhere it's referenced.

**If you're deciding where to start:** read the lens matching your
role first. Follow its links into a saga only when you want the full
derivation, the complete citation trail, or a runnable step-by-step
path.

## The manufacturing/test gap, stated once here too

Five of the newly-added personas (chip manufacture/tapeout, PCB
manufacture, board assembly, silicon test, board/system test) describe
work this program has not done. Checked directly, not assumed: no
tapeout, no package, no PCB, no board, no silicon test program exists
anywhere in this program's real artifacts today. Both `01-silicon-
architect.md` and `02-systems-board.md` say this explicitly rather than
inventing plausible-sounding manufacturing content — see the
[manufacturing appendix](../appendices/manufacturing-pdk.md) for the
full, checked gap list.

## Two more reference appendices, not lenses themselves

- [`silicon-and-package-detail.md`](../appendices/silicon-and-package-detail.md) —
  a chip-by-chip electronics-vs-photonics breakdown for when the
  silicon lens's summary isn't granular enough, plus the packaging
  discipline each domain would eventually need.
- [`student-tooling-installation.md`](../appendices/student-tooling-installation.md) —
  a base reference for installing the five mostly-independent
  toolchains this program actually uses, since doing it all at once is
  genuinely complex.
