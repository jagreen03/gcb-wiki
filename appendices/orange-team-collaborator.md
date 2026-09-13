# Orange-Team Collaborator

> **Not the source of truth, and not a live feed.** This page is a
> snapshot, written 2026-09-13, of three real problems currently
> blocking this program's photonic design from being *correct*, not
> just specified — see
> [`intent.md`](https://github.com/jagreen03/gcb-wiki/blob/main/intent.md)
> §0 for the governing intent (a direct GitHub link, not an in-portal
> one, since `intent.md` is a root-level document outside this
> portal's own document set). Each problem has its own isolated
> repository with the complete, always-current detail — this page
> exists so you don't have to visit all three just to get oriented and
> grab a prompt. **If it's been a while, check the repo's own
> `EXTERNAL_AI_BRIEFING.md` for anything this page missed** — this
> wiki is deliberately kept simple and mostly static; it is not
> re-synced every time one of the three repos changes.

**Who this is for:** anyone who wants to pick up one of this program's
real open questions and explore it — with another AI chat, with a
colleague, or alone — without first reading the whole program.

## The three problems

| Repo | Problem | Status as of this snapshot |
|---|---|---|
| [`gcb-lumen`](https://github.com/jagreen03/gcb-lumen) | What does the real MMI power-summing combiner actually cost in insertion loss, and is the first cell 4:1 or 8:1? | Toolchain ready, extraction not yet attempted |
| [`gcb-lambda`](https://github.com/jagreen03/gcb-lambda) | The "laser/modulator bank" doc is wrong as written — two real Phase-I designs exist, unreconciled; Phase-II has zero spec | Reconciliation not yet attempted |
| [`gcb-kelvin`](https://github.com/jagreen03/gcb-kelvin) | One comparator-noise number's uncertainty band straddles its own pass/fail gate — needs one commercial-tool run this program doesn't have | Tool access not yet confirmed either way |

---

## 1. `gcb-lumen` — combiner insertion loss and the fan-in decision

A real `gdsfactory` layout for the power-summing MMI combiner tree
already exists and passes its own geometry checks, at both the 8-input
Phase-I bench size and the 16-input Phase-II target. Nobody has
extracted what it actually costs in insertion loss. The existing
numerical model's `~0.1 dB/stage` figure is cited from the literature,
not measured — and a real decision (4:1 vs. 8:1 first cell) is
explicitly waiting on a real number. The one mode-solve this program
has run (`femwell`, real FEM, no license) gives a real effective index
(`n_eff = 2.684623`) but — by its own code's admission — zero loss
information, since no material-loss term was ever supplied to it.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat (ChatGPT, Gemini, another Claude tab, anything)</summary>

<pre>
I need help with a photonics simulation problem. A gdsfactory layout
generator for an optical power-summing combiner tree already exists:
a binary tree of plain mmi1x2() splitters (gdsfactory's stock 1x2 MMI,
used backwards as a 2:1 combiner), single wavelength (~1.31 um O-band),
strip waveguide 0.5 um x 0.22 um core on Si/SiO2 (n_core=3.48,
n_clad=1.44). Built at two sizes: 8 inputs (3 combiner stages) and
16 inputs (4 stages). Each combiner unit is about 25.5 x 2.5 um.

What exists so far: a femwell (pure-Python FEM mode solver, no
license) mode-solve on a bare strip waveguide of the same cross-
section gives a real effective index, n_eff = 2.684623 (real part),
at 1.31 um - but this has ZERO material-loss term, so it produces no
loss information at all, only the mode index. The existing numerical
model this combiner is meant to satisfy just assumes ~0.1 dB/stage
excess loss from the literature (an "optimistic" estimate; it notes a
fully incoherent N:1 combiner could cost ~10*log10(N) dB more).

Tools already ruled out or limited: "meep" on PyPI is a name
collision with an unrelated tool, not the real FDTD simulator (only on
conda-forge under that name); tidy3d needs a cloud account we don't
have authorization to create. SAX and photontorch (circuit-level
S-parameter tools) are named as candidates but never actually used.

Question: what's the most practical OPEN-SOURCE path to a real
insertion-loss number for this specific combiner-tree geometry - a
femwell-class mode solver extended with a real loss mechanism, a
circuit-level S-parameter rollup (SAX/photontorch), a literature-
informed analytic estimate, or something else? And once a real number
exists, how would you frame the 4:1-vs-8:1 fan-in tradeoff from it,
given the ~0.1 dB/stage optimistic vs ~10*log10(N) dB pessimistic
bounds above?

House rule: measure first with default/unoptimized settings - a bad
number is a useful result, not a failure. State exactly what loss
mechanism any method you suggest actually captures (mode mismatch?
material absorption? something else?) and what it doesn't.
</pre>

**For the complete version** (the real layout-generator code in full,
the real mode-solve code in full, every citation) — paste
[`gcb-lumen/EXTERNAL_AI_BRIEFING.md`](https://github.com/jagreen03/gcb-lumen/blob/main/EXTERNAL_AI_BRIEFING.md)
instead if you want the AI to have maximum context.
</details>

---

## 2. `gcb-lambda` — the laser/modulator bank documentation is wrong

The program's own hardware inventory calls the laser/modulator bank
"the least-specified part in the entire inventory," with zero
recorded wavelength, laser type, or power budget. That's wrong as a
blanket claim: two real, if modest, Phase-I bench laser designs
already exist in two different spec files — one uses 4–8 separate
lasers (one per leaf) feeding a combiner-test bench, the other uses
one shared laser + an external attenuator feeding a readout-
calibration bench — and nobody has ever written down that these are
two different things, or reconciled them against the inventory's
blanket claim. Separately, the real Phase-II scaled target (64
channels) genuinely has zero optical-source spec anywhere.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat</summary>

<pre>
I'm trying to reconcile two descriptions of laser/optical-source
hardware for a photonic test bench, and then scope a real gap.

Design A (a combiner-tree test bench): 4 to 8 separate O-band
(~1310 nm) DFB or Fabry-Perot laser diodes, ONE PER LEAF CHANNEL, each
directly, individually intensity-modulated (8-bit/256-level) by its
own DAC channel, each temperature-stabilized. Feeds a fused-fiber
power-summing combiner tree. Purpose: test whether optically summing
N channels together works.

Design B (a readout-calibration bench): ONE shared O-band (1310 nm) CW
DFB laser, through ONE external linear variable optical attenuator
(VOA) for intensity modulation (chosen over a Mach-Zehnder modulator
specifically because the bench's drive rate is low and a VOA's
attenuation curve is more directly linear - that choice is already
locked, not up for debate), driven by a 14-bit parallel DAC + an
analog driver stage. Feeds a two-tap (reference tap / result tap)
ratiometric readout circuit. Purpose: test the detection/ENOB
mechanism, using ratio-based cancellation of common-mode loss.

These have never been reconciled against each other, or against a
higher-level doc that calls "the laser/modulator bank" one single,
totally unspecified thing.

Question 1: are Design A and Design B genuinely two different,
compatible pieces of test apparatus for two different experiments (my
working hypothesis), or is there a real conflict I'm missing? What's
the clearest way to document both without conflating them?

Question 2 (only after you've addressed Q1): neither design describes
a REAL scaled target of 64 parallel optical channels, each
power-summing 16 terms per firing event, single wavelength throughout
(no wavelength-division multiplexing - explicitly locked elsewhere in
the spec as "no channel mux"). Does scaling either Phase-I design up
to 64 channels stay architecturally the same (just "more of the same
lasers/attenuators"), or does 64 channels force a genuinely different
approach? What are the real tradeoffs at that scale (thermal
management for 64 co-located sources, power budget, calibration
complexity across that many channels)?

House rule: cite which design (A or B) any claim comes from. Don't
assume wavelength-division multiplexing or any other architecture not
directly implied by what's described above - "I don't know, here's
what would need deciding first" is a completely valid answer to Q2.
</pre>

**For the complete version** (the real spec text quoted verbatim, the
real locked digital sizing numbers, every citation) — paste
[`gcb-lambda/EXTERNAL_AI_BRIEFING.md`](https://github.com/jagreen03/gcb-lambda/blob/main/EXTERNAL_AI_BRIEFING.md)
instead for maximum context.
</details>

---

## 3. `gcb-kelvin` — one number, one missing tool, one binary outcome

An analog comparator's noise was measured at 53 µV against a ≤55 µV
pass gate, using a surrogate transistor model because the real target
device can't be simulated for noise with this program's open-source
toolchain (confirmed, not just untried: the real simulation genuinely
returns zero or wildly inconsistent results). That surrogate carries a
±16% uncertainty band that straddles the gate — the true answer could
already be a pass or a fail. The one thing that would resolve it is a
commercial circuit simulator this program doesn't have access to.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat</summary>

<pre>
I have an analog circuit noise-measurement problem where the
uncertainty in my answer straddles my pass/fail threshold, and the
standard fix (a better simulator) isn't available to me.

Setup: a comparator (2-stage chopped/auto-zeroed preamp, 30 uA/stage
tail current, 0.8 pF load, 20 MHz chop frequency, 20 ns decision
window) needs total input-referred noise &lt;= 55 uV to pass a system
spec. The real target transistor is a predictive 7nm-class FinFET
device model (BSIM-CMG) in an open-source SPICE tool (ngspice with a
custom OSDI build). That tool's own native noise analysis (".noise")
returns literally zero on this specific device - confirmed broken,
not a config error. Its transient-noise injection (trnoise) is also
unusable: a known reference case expecting ~64 uV returned wildly
different numbers (96 uV, 3.2 mV, 3.9 mV) at three different
simulation timesteps on the identical circuit - a ~50x spread.

What DOES work: the same tool's noise analysis against its own
different, older, well-supported BUILT-IN transistor model (BSIM4),
used as a gm-matched surrogate/stand-in for the real device. This
gives a real, working number: 53 uV total, with an estimated +/-16%
uncertainty band (44.5-61.5 uV) because it's a proxy device, not the
real one. That band straddles my 55 uV gate.

An alternative build of a different open-source tool (Xyce) failed for
an unrelated reason - a required dependency (Trilinos, specifically
the NOX_ENABLE_LOCA and EpetraExt_BUILD_BTF build options) isn't
available without admin/root access to build from source.

Question: is there ANY real way to narrow that +/-16% uncertainty
using open-source tools only (not a commercial simulator) - a
different noise-analysis method against the real device model, a
Monte-Carlo small-signal approach, a better surrogate gm-matching
procedure, or diagnosing whether the ~50x trnoise spread is actually a
fixable bug rather than a fundamental limit? Or is the honest answer
"no, this genuinely needs a commercial tool with a native model for
this device, stop trying to substitute for it"? That's a completely
acceptable answer if true - don't force a workaround that isn't real.

House rule: tag every number as measured, derived, or an assumed
proxy. Don't claim a method narrows the uncertainty unless you can
say exactly what different noise physics it captures that the
existing surrogate doesn't.
</pre>

**For the complete version** (every number, the full toolchain-limit
writeup, every citation) — paste
[`gcb-kelvin/EXTERNAL_AI_BRIEFING.md`](https://github.com/jagreen03/gcb-kelvin/blob/main/EXTERNAL_AI_BRIEFING.md)
instead for maximum context.
</details>

---

## Saving what you learn

Whatever an AI chat gives you back — a real answer, a partial lead, or
just "here's what's missing" — **it's only useful to this program if
it doesn't evaporate with the browser tab.** A few options, easiest
first:

1. **Save it as a plain text/Markdown file** on your own machine (even
   just `gcb-lumen-notes-2026-09-20.md`, dated, in a folder you'll
   find again). Good enough for a lead you're not sure is real yet.
2. **If it looks like a genuine finding**, add it to the matching
   repo directly — e.g. a new `FINDINGS.md` in `gcb-lumen`, committed
   and pushed, the same way every other finding in this program ends
   up as a real, checked-in file rather than a conversation that
   disappears. State plainly whether the AI's claim was checked against
   the real files/code in the repo or only reasoned about in the
   abstract — that distinction matters as much here as it does
   everywhere else in this program.
3. **If it changes the problem's scope or contradicts something this
   page states**, don't just add a note — come back here (or to
   `gcb-wiki/DECISION_LEDGER.md`) and correct the record, the same way
   this page itself corrected a wrong claim about the laser bank while
   it was being written.
