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
| [`gcb-kelvin`](https://github.com/jagreen03/gcb-kelvin) | One comparator-noise number's uncertainty band straddles its own pass/fail gate — needs one commercial-tool run this program doesn't have | **No commercial access, confirmed, 2026-09-13.** A genuinely new angle found and partly explored: the real target device's small-signal params (`g_m`/`g_ds`) *can* be extracted even though `.noise` can't run — revealing a real, unreconciled ≈2× discrepancy against an existing (previously-missed) analytic noise roll-up's own measured `g_m`. That discrepancy, not a new simulator, is now the live blocker |

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

## 3. `gcb-kelvin` — a real ~2× gm discrepancy, not a missing tool, is now the live blocker

Still true: no commercial simulator is reachable, and the open-source
toolchain's native noise analysis genuinely fails on the real device
(confirmed twice, not assumed stale). **New since the first version of
this page**: the real target device's small-signal parameters (`g_m`,
`g_ds`) *can* be extracted directly, even though `.noise` can't run —
and a real, already-built multi-stage analytic noise roll-up for this
exact circuit (thermal + chopped-1/f + latch, two real gain stages)
already exists in this program and had simply never been connected to
that extraction. Running both side by side surfaced a real,
unreconciled ≈2× gap between two independent measurements of
"the same" device (`nfin=8`, `L=24n`) — and that gap, not simulator
access, is now the thing actually blocking progress on this path.

<details class="depth-collapsible">
<summary>📋 Copy this prompt — paste into any AI chat</summary>

<pre>
ROLE: Principal analog/device physicist, FinFET noise specialty. The
question is NOT "how do I get a noise number without a commercial
simulator" - that path already produced two real numbers that disagree.
Diagnose the disagreement; don't propose a generic methodology.

CIRCUIT (fixed): 2-stage chopped/auto-zeroed preamp + StrongARM latch.
Input pair: nfin=8, L=24n, ASAP7 (7nm-class FinFET PDK), BSIM-CMG/OSDI
model. Design point: I_tail=30 uA/stage, C_L=0.8 pF, F_chop=20 MHz,
T_gate=20 ns (gated decision window). Target: total input-referred
noise &lt;= 55 uV (worst-corner, for a >=56 dB system SNDR gate).

FAILURE LEDGER (confirmed dead ends - do not re-suggest):
- ngspice's native ".noise" returns exactly zero on the real BSIM-CMG/
  OSDI device, re-confirmed by re-running the actual deck, not assumed
  stale. ".op"/".ac" DO work on the same device (gm/gds extraction is
  fine; only ".noise" itself is broken for this OSDI integration).
- trnoise transient-noise injection gave a ~50x spread across timestep
  settings on a known reference case - not a usable method.
- Building Xyce from source (to get a working commercial-grade .noise)
  is blocked: conda-forge Trilinos is missing NOX_ENABLE_LOCA and
  EpetraExt_BUILD_BTF; a from-source Trilinos build was judged out of
  scope, not abandoned by accident.
- No root/admin access; no Spectre or other commercial-simulator
  access at all.

THE REAL, UNRECONCILED DATA DISAGREEMENT (the actual task):
Measurement 1 - a pre-existing, already-built analytic noise roll-up
script (thermal: S_v=8kT*gamma/gm + 8kT/(gm^2*R_L), integrated over
NBW=1/(4*R_L*C_L); chopped residual 1/f with real fold-back; latch
contribution referred through G_tot=G1*G2) uses its own SPICE-MEASURED
gm sweep: gm = 167, 218, 266, 317, 359, 395 uS at I_tail = 15, 22, 30,
40, 50, 60 uA respectively (same nfin=8, L=24n device class). At its
30 uA design point (gm=266 uS, R_L=26667 ohm) it gets NBW=11.7 MHz and
a total input-referred noise of 45.8 uV at an assumed gamma=1.0.

Measurement 2 - a separate, direct ".op" extraction against the SAME
nfin=8, L=24n device (explicitly the "nmos_lvt" flavor; bias point not
tied to any of the six I_tail values above) gives gm = 779 uS - roughly
2x ABOVE even Measurement 1's highest-current (60 uA) point.

Separately, the BSIM4 surrogate path (a different, well-supported
built-in model used as a stand-in because the real device can't run
".noise" at all) gives a real 53 uV total noise with gamma_eff~=1.4
read back from that surrogate - notably higher than the gamma=1.0
assumed in Measurement 1's roll-up, which is the stated reason
Measurement 1's 45.8 uV total sits below the BSIM4 surrogate's 53 uV.

TASK 1 - Diagnose the gm discrepancy (779 uS vs 167-395 uS for "the
same" device/geometry). Rank candidate causes by plausibility: (a) a
device-flavor mismatch (LVT vs RVT/SLVT or unspecified in Measurement
1's own comment - LVT runs higher gm at a given bias, is that enough to
explain ~2x on its own?), (b) a bias-point/V_gs overdrive difference
(Measurement 2's bias wasn't tied to any of Measurement 1's six I_tail
points - estimate what V_gs or I_D would be needed to explain the gap
at constant device geometry), (c) an extraction-methodology artifact in
either measurement. State what additional single piece of information
(e.g., Measurement 2's actual I_D/V_gs, or Measurement 1's exact device
flavor) would most cheaply disambiguate between these.

TASK 2 - Assuming the gm discrepancy gets reconciled and Measurement
1's roll-up is re-run with a real BSIM-CMG-extracted gm/R_L instead of
its current proxy MEAS table: would that plausibly narrow the BSIM4
surrogate's +/-16% uncertainty band (44.5-61.5 uV) in a way a commercial
tool's correlation run would also trust, or does closing the gm gap
leave gamma (the FinFET excess-noise factor, still an assumed published
proxy - ASAP7 ships no native noise/mismatch model) as an equally large
unresolved uncertainty on its own?

TASK 3 - Binary verdict: is reconciling gm and re-running the existing
analytic roll-up (no new tool, no commercial simulator) sufficient to
responsibly sign off on tapeout readiness for this noise gate, or does
gamma's own unverified-proxy status mean a commercial-tool correlation
run remains mandatory regardless of how cleanly the gm gap resolves?
Give the verdict in one sentence, then the reasoning.

House rule, unchanged: tag every number measured / derived / assumed
proxy. Don't claim a method narrows the uncertainty unless you state
exactly what different noise physics it captures that the existing
roll-up or surrogate doesn't.

OUTPUT CONTRACT: a ranked candidate-cause table for Task 1 (cause |
plausibility | disambiguating evidence needed), a short reasoned
paragraph for Task 2, and an explicit one-sentence Go/No-Go verdict
plus justification for Task 3.
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
