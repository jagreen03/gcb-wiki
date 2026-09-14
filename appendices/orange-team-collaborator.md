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

**Outsourcing this to more than one AI or person?** See
[`research-operations.md`](research-operations.md) for named roles
(Research Scientist, External Reviewer, Triage Coordinator), a
priority scale, and the workflow for turning a finished piece of
research into either more research or a real ticket — plus how a new
problem gets its own section added here as new blockers surface.

**Prompt style, updated 2026-09-13 (later the same day):** the three
prompts below were rewritten to front-load a persona, an explicit
**failure ledger** (what's already been tried and ruled out, so a
frontier model doesn't waste its first response re-suggesting it), a
hard-constraints/isolated-variables block, and an explicit output
contract (format, not just content). This is a real difference in kind
from a plain conversational question — frontier-tier reasoning models
reliably skip past generic advice and go straight to the open,
unresolved sub-question when the solved parts are stated as givens
rather than left for the model to rediscover (and possibly get wrong,
contradicting work already done). The underlying facts in each prompt
below are re-verified against the real repo, not assumed from an
earlier pass — two of the three problems below advanced substantially
since this page's first version, and the prompts reflect that, not
yesterday's state.

## The three problems

| Repo | Problem | Status as of this snapshot |
|---|---|---|
| [`gcb-lumen`](https://github.com/jagreen03/gcb-lumen) | What does the real MMI power-summing combiner actually cost in insertion loss, and is the first cell 4:1 or 8:1? | **Substantially answered, 2026-09-13**: real, resolution-converged FDTD result (≈1.96 dB/junction) — not a bench measurement. What's left open now is a physics *decomposition* (why ≈2 dB, not 0.1 or 3 dB) and the actual 4:1-vs-8:1 link-budget call |
| [`gcb-lambda`](https://github.com/jagreen03/gcb-lambda) | The "laser/modulator bank" doc was wrong as written — two real Phase-I designs exist, with a real laser-count conflict between them; Phase-II has zero optical-source spec | **Phase-I reconciled, 2026-09-13**: real conflict found (not "two compatible designs" as first hypothesized), filed as `GCB-043` for disposition, not resolved unilaterally. **Phase-II scoped, same day**: a real question list (`PHASE2_SCOPING.md`) — Phase-I's modulator choice cannot carry forward as-is, and a real ≈20 dB splitting-loss floor is flagged for the distribution-network architecture |
| [`gcb-kelvin`](https://github.com/jagreen03/gcb-kelvin) | One comparator-noise number's uncertainty band straddles its own pass/fail gate — needs one commercial-tool run this program doesn't have | **No commercial access, confirmed.** A ≈2× `g_m` gap flagged 2026-09-13 turned out, 2026-09-14, to be a non-converged-solve artifact, resolved internally (not a real device finding — see `GCB-045`). The real remaining gap is narrower: the BSIM4-surrogate's `γ_eff≈1.4` vs. the real device's own analytic roll-up assuming `γ=1.0` |

---

## 1. `gcb-lumen` — combiner insertion loss and the fan-in decision

The headline number is now answered: a resolution-converged 2D
effective-index FDTD sweep (res 20→100, real geometry, real port
coordinates) gives ≈1.96 dB excess loss per 2:1 MMI junction,
extrapolating to ≈1.87 dB at the true asymptote — not bench-equivalent,
but real, measured, and not assumed. **What's still genuinely open**:
*why* the number lands near 2 dB rather than the literature's
optimistic 0.1 dB or the ideal 0 dB (mode mismatch? taper-induced
scattering? phase error across the junction? some combination?) — a
mechanistic decomposition nobody in this program has attempted — and
the actual 4:1-vs-8:1 architectural call, which is a link-budget
judgment this program hasn't made, not a missing number.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat (ChatGPT, Gemini, another Claude tab, anything)</summary>

<pre>
ROLE: Principal silicon-photonics architect. Work from the real,
already-measured data below — do not propose re-measuring it, and do
not suggest a tool already ruled out in the failure ledger.

GEOMETRY (fixed, not a design variable): binary tree of gdsfactory
stock mmi1x2() splitters used in reverse as 2:1 combiners. Single
wavelength ~1.31 um (O-band). Strip waveguide 0.5x0.22 um core on
Si/SiO2 (n_core=3.48, n_clad=1.44). Each MMI unit ~25.5x2.5 um,
width_taper=1.0 um, length_taper=10.0 um, length_mmi=5.5 um,
width_mmi=2.5 um, gap_mmi=0.25 um. Built at N=8 (3 stages) and N=16
(4 stages).

REAL MEASURED DATA (not a proxy, not literature): 2D effective-index
FDTD (meep via mp.EigenModeSource, n_eff=2.684623 from a real femwell
mode-solve, SiO2 clad n=1.44), swept at resolution 20/30/40/60/80/100
px/um. The sequence 2.87 -> 2.30 -> 2.07 -> 1.96 dB (res 40/60/80/100)
is monotonically converging with shrinking gap ratios (0.40, then
0.48) - read as resolution-converged for engineering use, not
mathematically exact; geometric extrapolation gives ~1.87 dB at the
true asymptote. This is per-junction excess loss (measured split
exactly 0.5000:0.5000 by power, so it's pure excess loss, not an
asymmetry artifact).

FAILURE LEDGER (already tried / ruled out - do not re-suggest):
- PyPI "meep" is a name collision (a CI task-runner), not the real
  FDTD tool - caught by unzipping the wheel, not by name alone. Real
  pymeep is conda-forge only; already installed and used for the data
  above.
- tidy3d (cloud FDTD) needs an external account - not authorized,
  not attempted.
- The naive reading of a 2:1 combiner's ideal output was WRONG on
  first attempt (used N instead of sqrt(N) amplitude for a coherent
  N-input combine) - caught and fixed before the data above was
  produced. Don't reintroduce that error when reasoning about the
  SAX-model rollup below.
- Resolutions 20/30 were non-monotonic (4.36, 9.06/10.94, 2.86/2.87
  dB) before the cause (taper under-resolution / Yee-grid staircasing
  on the diagonal taper, not a methodology bug) was identified and
  confirmed by re-running at higher resolution.

TASK 1 - Physics decomposition (the genuinely open question): given
the real geometry above and the real measured ~2 dB/junction result,
mechanistically decompose the excess loss into its likely physical
contributors - mode mismatch at the taper-to-MMI-body transition,
scattering at the diagonal taper edges (a known 2D-effective-index-
method sensitivity, since this approach cannot capture true 3D mode
confinement at the taper), phase error between the two combining
arms, and any 2D-vs-3D modeling-error contribution specifically from
using effective-index 2D FDTD instead of full 3D. Give your best
estimate of each contributor's share of the ~1.9-2 dB total, and state
your confidence in that split plainly - "can't decompose further
without X" is a valid and useful partial answer.

TASK 2 - Link-budget rollup: using sqrt(N) ideal-amplitude combining
(not N - see the ledger above) with N=8 (3 stages, ~1.96 dB/junction
measured) and N=16 (4 stages), compute the real cumulative tree
insertion-loss penalty feeding a balanced photodiode pair at ~112.5 uA
nominal photocurrent (this program's own readout bench operating
point). Show the stage-by-stage buildup, not just the final number.

TASK 3 - The 4:1-vs-8:1 decision: using Task 2's real numbers, make
the explicit link-budget case for each fan-in choice, accounting for
detector-noise-floor margin and this program's real >=56 dB SNDR
target (worst-corner p05, not nominal). State which choice you'd make
and why, in one sentence, then the full reasoning.

OUTPUT CONTRACT: a decomposition table for Task 1 (contributor | est.
share | confidence), a stage-by-stage numeric table for Task 2, and a
one-paragraph decision + full justification for Task 3. No qualitative
hand-waving - every claim either traces to the real geometry/data
above or is explicitly flagged as your own estimate.
</pre>

**For the complete version** (the real layout-generator code in full,
the real FDTD/SAX model code in full, every citation) — paste
[`gcb-lumen/EXTERNAL_AI_BRIEFING.md`](https://github.com/jagreen03/gcb-lumen/blob/main/EXTERNAL_AI_BRIEFING.md)
instead if you want the AI to have maximum context.
</details>

---

## 2. `gcb-lambda` — the laser/modulator bank, Phase-II scoped, one real conflict still open

The reconciliation is done: two real Phase-I bench laser designs exist
(4–8 independent per-leaf lasers vs. one shared laser + VOA), and they
genuinely **disagree on laser count** for the same Task-3 bench — not
two separate compatible experiments, as first hypothesized and then
corrected. That conflict is filed (`GCB-043`) for disposition, not
resolved unilaterally. Separately, Phase-II's real locked digital
envelope (`N=64`, `L=16`, `T_fire`=500 ps/2.0 GHz) has zero
optical-source spec, and a first scoping pass found that Phase-I's
modulator choice (a VOA) **cannot carry forward** — its own stated
low-rate rationale is contradicted by Phase-II's locked 2.0 GHz cadence
— plus a real ≈20 dB splitting-loss-floor concern for a single-source
distribution architecture at N·L=1024 sites. None of this is decided;
it's real, tagged, open-question material.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat</summary>

<pre>
ROLE: Senior systems-integration / optical-test architect. The
reconciliation question below is ALREADY RESOLVED - don't re-derive it,
stress-test the resolution and the open scoping work that follows it.

RESOLVED FINDING (not a question): two real Phase-I bench designs exist
for the same Task-3 bench and genuinely disagree on laser count -
Design A: 4-8 independent O-band (1310 nm) DFB/FP lasers, one per leaf
channel, each individually 8-bit-modulated, feeding a fused-fiber
power-summing tree. Design B: ONE shared O-band (1310 nm) CW DFB laser
through ONE linear VOA (chosen over a Mach-Zehnder modulator - that
choice is locked, do not question it), split via a 1x8 PM fiber
splitter into a reference tap and result-combination legs. This is a
real, filed architecture conflict (not a misunderstanding), open for
disposition, not decided here.

FAILURE LEDGER / already-settled, do not reopen:
- No wavelength-division multiplexing exists anywhere in this
  program's authoritative spec, confirmed by exhaustive grep, at any
  tier (Task-1 combiner model, Task-3 bench BOM). The architecture is
  single-wavelength, power-summing, throughout. Don't suggest WDM as a
  Phase-I or default Phase-II fix without new, explicit evidence.
- The VOA-over-MZ decision for Phase-I is locked (bandwidth only needed
  the bench's low drive rate) - don't re-litigate it for Phase-I.
- Phase-II's real locked digital envelope: N=64 channels, L=16
  contraction lanes/fire, T_fire=500 ps (2.0 GHz), 1040 total operand
  codes (16 activation + 1024 weight) driven onto "the modulator bus"
  every fire - this exact phrase is the locked spec's own black box;
  it does not say HOW those operands reach the bus.

ALREADY-FOUND, UNDECIDED SCOPING RESULTS (critique these, don't
rediscover them from scratch):
1. Phase-I's VOA cannot carry forward to Phase-II - a VOA's settling
   time (thermo-optic/MEMS class, us-ms) cannot plausibly meet a
   locked 2.0 GHz update rate. A GHz-class electro-optic modulator
   (MZI or ring) appears necessary instead.
2. Modulator/driver channel count jumps ~130x from Phase-I's largest
   config (N=8) to Phase-II's 1040 operand channels/fire.
3. Reusing this program's own real FDTD-measured per-junction loss
   figure (~1.96 dB, from a sibling problem repo's resolution-converged
   result) against a 1024-way passive splitting tree gives
   log2(1024)=10 stages * 1.96 dB ~= 19.6 dB of excess loss alone,
   before any other loss source - a real link-budget red flag for a
   single-global-source Phase-II architecture.
4. Phase-I's 1310 nm wavelength carries forward only as an assumption,
   not a stated Phase-II requirement.

TASK 1 - Stress-test findings 1-4 above. For each: is the reasoning
sound, is there a real mitigation not yet considered (e.g. regional/
local sources instead of one global source, to shorten the splitting
tree in finding 3), and is any of them actually NOT as serious a
concern as stated once a specific real mitigation is applied?

TASK 2 - Risk/mitigation matrix: for the genuinely unresolved questions
(modulator family, single- vs multi-source distribution architecture,
how 1040 operand codes actually reach "the modulator bus"), produce a
structured risk matrix - likelihood this becomes a real blocker,
severity if it does, and the most promising mitigation direction for
each, without picking a final architecture (that's this program's
Architect's decision, not yours to make unilaterally).

OUTPUT CONTRACT: a critique table for Task 1 (finding | sound? | real
mitigation | residual severity) and a structured risk matrix for Task 2.
Cite which real number (laser-count conflict, the four scoping
findings, or the locked digital envelope) any claim traces to.
</pre>

**For the complete version** (the real spec text quoted verbatim, the
real locked Phase-II sizing table, every citation) — paste
[`gcb-lambda/EXTERNAL_AI_BRIEFING.md`](https://github.com/jagreen03/gcb-lambda/blob/main/EXTERNAL_AI_BRIEFING.md)
instead for maximum context.
</details>

---

## 3. `gcb-kelvin` — the gm "discrepancy" resolved internally; γ is the real remaining gap

**Correction, 2026-09-14, one day after this section first shipped**:
the ≈2× `g_m` gap this page described as "the live blocker" turned out
not to be a real device/bias finding — re-running the actual extraction
deck at all six bias points found roughly **half of all attempts
deterministically converge to a non-physical operating point**
(`v(op)` in the millions of volts), and the original 779 µS figure had
never been checked against that before being trusted. Every
physically-plausible re-run landed back in the existing roll-up
script's own real range. **A genuinely useful example of `GCB-045`'s
own point, caught live**: this was resolved by re-running a deck and
adding one sanity check, not by the kind of deep device-physics
diagnosis the previous version of this prompt asked a frontier AI to
perform. Still true and unchanged: no commercial simulator is
reachable, and the toolchain's native `.noise` genuinely fails on the
real device. What's left, after the false alarm above, is narrower: the
BSIM4-surrogate path's own `γ_eff≈1.4` vs. the existing roll-up's
assumed `γ=1.0` — a real, still-open ≈13 µV-scale gap, not a missing
tool and not a data discrepancy.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat</summary>

<pre>
ROLE: Principal analog/device physicist, FinFET noise specialty. A
prior version of this exact question turned out to be a false alarm
(a non-converged SPICE solve mistaken for a real device discrepancy,
caught by re-running the deck with a physical-plausibility check) -
don't assume the data below needs the same kind of forensic diagnosis;
the remaining gap is real but smaller and better-characterized.

CIRCUIT (fixed): 2-stage chopped/auto-zeroed preamp + StrongARM latch.
Input pair: nfin=8, L=24n, ASAP7 (7nm-class FinFET PDK), BSIM-CMG/OSDI
model. Design point: I_tail=30 uA/stage, C_L=0.8 pF, F_chop=20 MHz,
T_gate=20 ns (gated decision window, resistively-loaded stage,
NBW=1/(4*R_L*C_L)~=11.7 MHz at this point). Target: total
input-referred noise &lt;= 55 uV (worst-corner, for a >=56 dB system
SNDR gate).

FAILURE LEDGER (confirmed dead ends - do not re-suggest):
- ngspice's native ".noise" returns exactly zero on the real BSIM-CMG/
  OSDI device, re-confirmed by re-running the actual deck twice, not
  assumed stale. ".op"/".ac" DO work on the same device, but roughly
  HALF of single-point .op solves at this OSDI model's bias range
  deterministically converge to a non-physical operating point
  (v(op) far outside 0-0.8V) - ALWAYS check v(op)'s physical
  plausibility before trusting any gm/gds extracted from this path;
  this is a confirmed, repeatable toolchain quirk, not an occasional
  fluke.
- trnoise transient-noise injection gave a ~50x spread across timestep
  settings on a known reference case - not a usable method.
- Building Xyce from source (to get a working commercial-grade .noise)
  is blocked: conda-forge Trilinos is missing NOX_ENABLE_LOCA and
  EpetraExt_BUILD_BTF; a from-source Trilinos build was judged out of
  scope, not abandoned by accident.
- No root/admin access; no Spectre or other commercial-simulator
  access at all.

THE REAL, REMAINING GAP (after the gm false alarm was resolved
internally): a pre-existing, already-built analytic noise roll-up
script (thermal: S_v=8kT*gamma/gm + 8kT/(gm^2*R_L), integrated over
NBW=1/(4*R_L*C_L); chopped residual 1/f with real fold-back; latch
contribution referred through G_tot=G1*G2; real, physically-plausible
SPICE-measured gm sweep of 167-395 uS across I_tail=15-60 uA) gets
45.8 uV total input-referred noise at its I_tail=30uA design point,
ASSUMING gamma (thermal excess-noise factor) = 1.0. Separately, the
BSIM4-surrogate ".noise" path (a different, well-supported built-in
model, used as a stand-in because the real device can't run ".noise"
at all) gives a real 53 uV total, with gamma_eff~=1.4 read back from
that surrogate fit - meaningfully higher than the gamma=1.0 the
analytic roll-up assumes, and the stated reason for the two totals'
~15% gap. ASAP7 ships no native flicker/mismatch model, so gamma is an
assumed published-FinFET proxy in EITHER path, not measured in either.

TASK 1 - Is gamma_eff=1.4 (from a DIFFERENT, older BSIM4 model used as
a surrogate) a credible estimate of the REAL target device's actual
excess-noise factor, or is there a specific, named reason a BSIM4
gm-matched surrogate's gamma_eff would NOT transfer accurately to a
genuinely different (BSIM-CMG, 7nm-class FinFET) device - even though
other small-signal parameters (gm, gds) DO transfer directly via
.op/.ac on the real OSDI model?

TASK 2 - Given real gm/R_L now exist for the actual target device
(the 167-395 uS sweep) but gamma does not, is there any published-
literature-grounded way to pin gamma more specifically for THIS exact
device class (7nm FinFET, short-channel, near-threshold-ish bias) that
would be more defensible than simply adopting either gamma=1.0 or
gamma_eff=1.4 as a stand-in?

TASK 3 - Binary verdict: given everything above, does the gamma
uncertainty alone (independent of the gm question, which is resolved)
mean a commercial-tool correlation run remains mandatory before
tapeout sign-off on this noise gate, or is a literature-grounded gamma
estimate for this device class (if Task 2 finds one) sufficient?

House rule, unchanged: tag every number measured / derived / assumed
proxy. Don't claim a method narrows the uncertainty unless you state
exactly what different noise physics it captures that the existing
roll-up or surrogate doesn't.

OUTPUT CONTRACT: a reasoned paragraph for Task 1, a literature-grounded
gamma estimate (with citation/basis) or an honest "no defensible
estimate exists" for Task 2, and an explicit one-sentence Go/No-Go
verdict plus justification for Task 3.
</pre>

**For the complete version** (the real roll-up script in full, every
number, the full toolchain-limit writeup, every citation) — paste
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
