# Appendix: Research Operations — Roles, Harvesting, and Ticket Promotion

> **Not the source of truth.** This page describes *process*, not
> architecture — it does not change anything in `gcb-spec`. It
> extends two things this program already has, rather than inventing
> new ones: the role-isolation pattern in
> [`gcb-spec/ai-agents/`](https://github.com/jagreen03/gcb-spec/blob/main/ai-agents/README.md)
> (three personas, each with a strict "must not touch" boundary), and
> the Orange-Team "Physical Reality First" discipline
> ([`TKT-000`](https://github.com/jagreen03/gcb-workspaces/blob/main/backlog/TKT-000-orange-team-epoch-guidance.md)).
> This page exists so that work on the isolated problem repos
> (`gcb-lumen`, `gcb-lambda`, `gcb-kelvin`, and whichever come after
> them) can be spread across more than one AI, more than one person,
> in more than one place, without losing the discipline that keeps
> this program's findings trustworthy.

## Why this exists

One person, and one AI session, can only be in one place at a time.
The three problem repos already show the shape of a real research
program: distinct sub-questions, each isolated enough that a stranger
— human or AI — can pick one up cold. What's been missing is the part
a real research organization has and an ad-hoc chat session doesn't:
**named roles with real boundaries, and a repeatable way to turn a
finished piece of research into either more research or a real
ticket**, instead of a finding just sitting in a `FINDINGS-*.md` file
until someone happens to reread it.

## The four roles

| Role | Who can hold it | Owns | Must not do |
|---|---|---|---|
| **Principal Investigator (PI)** | The Architect — a specific accountable person, not delegable | Setting/adjusting the top-level GCB intent (`gcb-wiki/intent.md`); ratifying a decision; closing a ticket; approving a new isolated problem repo | Being assumed to have reviewed something that was never actually sent to them |
| **Research Scientist** | Any AI session (any vendor), or any human collaborator, assigned to exactly **one** isolated problem repo | Running that repo's one open question under its own Orange-Team discipline; writing a dated `FINDINGS-YYYY-MM-DD.md`; tagging every number `[M]`/`[D]`/`[A]` | Touching a sibling problem repo; promoting their own finding straight to a ratified decision or a closed ticket — that always needs Triage + PI review first; asserting `GO`/certainty beyond what the evidence in hand supports |
| **External Reviewer** | Any AI session or person **other than** whoever produced the finding being reviewed | Checking a `FINDINGS-*.md`'s claims against the real repo before it's trusted enough to act on: verifying citations exist, flagging unsourced numbers, flagging anything that looks like it couldn't have come from the context actually given (see `gcb-lumen/FINDINGS-2026-09-13.md`'s own file-name-provenance flag for a worked example) | Silently accepting an unverified claim without labeling it as such; resolving something that is genuinely the PI's call by fiat instead of flagging it |
| **Triage Coordinator** | Whoever is running the harvest pass (this session, another AI, or a person) | Periodically reading every problem repo's latest findings and `MEASUREMENT`/`RECONCILIATION STATE`; classifying each as **needs more research**, **ticket-worthy**, or **resolved**; assigning a priority (below); drafting the next research prompt or the next ticket | Closing a ticket, ratifying a decision, or deciding a real architecture question itself — Triage recommends, the PI decides, same as every other ticket in this program |

**Assigning a role to an AI session that isn't this one**: send it the
target repo's `ai-agents/ORANGE_TEAM.md` (Research Scientist) or
`EXTERNAL_AI_BRIEFING.md` (Research Scientist, no-repo-access version)
as its system prompt / first message, the same way this program's own
three-persona triad is assigned. For **External Reviewer**, send the
`FINDINGS-*.md` file to be checked plus this instruction: *"You are an
External Reviewer. Check every factual claim in the attached findings
against [repo link, or attach the relevant real files]. State which
claims you could verify, which you couldn't, and flag anything the
author could not plausibly have known from what they were given."*
For a **human** collaborator in any of these roles, the same
documents work as a briefing — credentials and location don't change
what the role owns, only who's answerable for the work.

## Priority scale for triage

Distinct from this program's `PBG` telemetry (which grades *completed,
graded* work on Spec/Quality/Emergence) — this scale is for *open,
ungraded* questions, ranking urgency, not quality:

| Priority | Meaning | Example |
|---|---|---|
| **P0 — Actively blocking** | A currently-active decision cannot close without this | `gcb-kelvin`'s Spectre question — directly blocks `CONDITIONAL GO → GO` |
| **P1 — Blocks a near-term decision** | Nothing is stuck *today*, but a real, expected-soon decision needs this | `gcb-lumen`'s fan-in call — waits on the loss number, which nothing is actively demanding yet |
| **P2 — Foundational, not urgent** | Matters for eventual correctness; no decision is currently waiting on it | `gcb-lambda`'s Phase-II scaling scope |
| **P3 — Exploratory** | Worth tracking; nothing depends on it yet | A process question, a tooling curiosity, a "worth a look someday" |

## The harvest → triage → promotion workflow

1. **Harvest.** For each problem repo, read its newest `FINDINGS-*.md`
   and its `ai-agents/ORANGE_TEAM.md` state section. (Triggered either
   by the Architect bringing a finding back — as happened with
   `gcb-lumen` — or by a periodic pass, e.g. folded into the standing
   `/loop`.)
2. **Classify each finding:**
   - **Needs more research** — the core question is still open. Write
     the *next* prompt for a new Research Scientist pass, incorporating
     what's now known so it doesn't repeat solved ground (see
     `gcb-lumen`'s updated `ORANGE_TEAM.md` for a worked example: the
     SAX framework is now real, so the next prompt only needs to ask
     for the real loss number, not re-litigate the toolchain choice).
   - **Ticket-worthy** — something concrete enough to act on exists
     (a real decision to make, a real defect to fix, a real process
     gap to record). Draft a real `GCB-NNN` ticket in
     `gcb-workspaces/backlog/`, in this program's existing format,
     explicitly citing the source repo and finding file. File it
     `status: open`, no PBG grade if it's a finding for disposition
     rather than closed work — same convention as `GCB-041`.
   - **Resolved** — the finding fully answers the repo's core
     question. Recommend the repo's own status update (its README's
     "Status as of this snapshot" line, and the matching row in
     `gcb-wiki/appendices/orange-team-collaborator.md`) to the PI.
3. **Assign priority** (P0–P3 above) to whatever gets drafted.
4. **Log the pass** in
   [`gcb-workspaces/reports/research_triage_log.md`](https://github.com/jagreen03/gcb-workspaces/blob/main/reports/research_triage_log.md)
   — append-only, one entry per pass, same pattern as
   `spike_loop_summary.md`.
5. **PI review.** Nothing drafted by Triage is final. A drafted ticket
   sits `open` until the PI reviews it, exactly like every other
   ticket in this program's backlog.

## How new prompts get added to the wiki

`gcb-wiki/appendices/orange-team-collaborator.md` is meant to grow,
not stay fixed at three problems. When a new real, currently-blocking
unknown is identified (through triage, or directly by the Architect)
and judged substantial enough for its own isolated repo:

1. A new `gcb-<name>` repo is created, following the exact same
   pattern as `gcb-lumen`/`gcb-lambda`/`gcb-kelvin` (`README.md`,
   `intent.md`, `ai-agents/ORANGE_TEAM.md`, `EXTERNAL_AI_BRIEFING.md`)
   — short, scientific-term-style name, well under the length of this
   program's longest repo names.
2. A new section gets **added** to
   `orange-team-collaborator.md` (never replacing an existing one) —
   same shape: a summary paragraph, a `<details>` dropdown with a
   condensed, self-contained prompt, a link to the fuller briefing.
3. `gcb-wiki/intent.md` §0's blocking-questions list gets a new entry
   if the new problem is itself part of the photonic-correctness
   intent (as `gcb-lumen`/`gcb-lambda`/`gcb-kelvin` are) — a different
   intent gets its own governing statement rather than being folded in
   here.

## Worked example — the first real harvest pass

See
[`gcb-workspaces/reports/research_triage_log.md`](https://github.com/jagreen03/gcb-workspaces/blob/main/reports/research_triage_log.md)'s
first entry: `gcb-lumen`'s 2026-09-13 finding (an external AI's SAX
suggestion, checked and partly executed) harvested, classified, and
triaged the same day this page was written — not a hypothetical, a
real first run of this exact process.
