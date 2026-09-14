# PBG Telemetry Vector Space

**Level:** — (doctrine / project-management, not GCB hardware — see
[`04_ai_protocols_and_blue_wording.md`](04_ai_protocols_and_blue_wording.md) for
the boundary invariant: PBG is a prompt/PM protocol and is never scaffolded into
a hardware or host-orchestration repository).

This note formalises the six-colour **PBG telemetry taxonomy** — used
qualitatively in every backlog ticket's *AI Orchestration Priorities (PBG
Evaluation)* section and collapsed to a single `telemetry_color` label — into a
3D bipolar coordinate system in $\mathbb{R}^3$. The colours do not change
meaning; they become the six poles of three orthogonal axes, so a ticket's
outcome can be *scored* (e.g. "Green on specification but Yellow on engineering
quality") and the scores loaded into a `pgvector` store for clustering.

Authored for TKT-005. Consumed by the planned `parse_pbg_telemetry.py` scraper
(launch config in `architecture-doctrine.code-workspace`).

---

## 1. The three axes

Each axis is **bipolar** (a signed continuum, not a category) and **orthogonal**
to the other two (they measure independent properties of an outcome). Each pole
is bound to exactly one of the six existing PBG colours — no colour is renamed,
redefined, or added.

| Axis | Symbol | $+1$ pole | $-1$ pole | Question it answers |
|---|---|---|---|---|
| **Specification** | $X$ | **Green** | **Red** | Did the work land in-spec and "done right", or did it violate the contract / leave brittle debt? |
| **Quality** | $Y$ | **Blue** | **Yellow** | Was it sustainable engineering, or an athletic / expedient workaround that incurs drift? |
| **Emergence** | $Z$ | **Purple** | **Light-Gray** | Did it create strategic net-new capability, or is it low-signal / deferrable / accept-the-limitation? |

```
                    +Z  Purple
                     |
                     |        +Y  Blue
                     |       /
                     |      /
   Red  -X ----------+---------- +X  Green
                    /|
                   / |
          Yellow -Y  |
                     |
                    -Z  Light-Gray
```

### 1.1 The six spokes

A "spoke" is a $\pm$ unit basis vector — a *pure* single-colour outcome:

| Spoke | Vector $\vec{T}$ | Meaning |
|---|---|---|
| Green | $(+1,\,0,\,0)$ | delivered exactly to spec, nothing more to say |
| Red | $(-1,\,0,\,0)$ | spec/contract violated, or brittle debt introduced |
| Blue | $(0,\,+1,\,0)$ | reference-grade sustainable engineering |
| Yellow | $(0,\,-1,\,0)$ | expedient workaround, known future cost |
| Purple | $(0,\,0,\,+1)$ | strategic net-new platform capability |
| Light-Gray | $(0,\,0,\,-1)$ | deferrable / no capability delivered |

The axes being orthogonal is the whole point: an outcome can be simultaneously
Green ($+X$) and Yellow ($-Y$) — in-spec but hacked — which a single scalar
label cannot express. It **cannot** be simultaneously Green and Red: those are
the two ends of one axis, and the axis value is the *net* reading.

---

## 2. The telemetry vector

A ticket's outcome is the vector

$$\vec{T} = (x,\ y,\ z), \qquad x,y,z \in [-1.0,\ 1.0]$$

with $x$ the Specification score, $y$ the Quality score, $z$ the Emergence
score.

### 2.1 Magnitude

$$\left\lVert \vec{T} \right\rVert_2 \;=\; \sqrt{x^2 + y^2 + z^2}
\;\in\; \left[\,0,\ \sqrt{3}\,\right]$$

* $\lVert \vec{T} \rVert_2 = 0$ — the **origin**: `pending` / uncharacterised /
  not yet assessable. Every ticket starts here.
* $\lVert \vec{T} \rVert_2 = 1$ — a clean single-axis outcome, e.g. pure Green
  $(1,0,0)$.
* $\lVert \vec{T} \rVert_2 = \sqrt{2} \approx 1.414$ — a strong two-axis
  outcome, e.g. Green **and** Blue $(1,1,0)$.
* $\lVert \vec{T} \rVert_2 = \sqrt{3} \approx 1.732$ — the theoretical maximum,
  all three axes saturated.

### 2.2 Direction vs magnitude

* **Direction** $\hat{T} = \vec{T} / \lVert \vec{T} \rVert_2$ is the outcome's
  *flavour* — "Green-ish", "Green-with-a-Yellow-lean", "Purple". Two outcomes
  with the same direction are the same *kind* of result at different
  intensities.
* **Magnitude** $\lVert \vec{T} \rVert_2$ is the *decisiveness* — how strongly
  the outcome is characterised. A tentative, partly-done Green sits at
  $(0.5,0,0)$ (norm $0.5$); a crisp, fully-verified Green at $(1,0,0)$.

Clustering (Section 4) uses direction; ranking within a cluster uses magnitude.

---

## 3. Scoring rubric

Score each axis independently on the ordinal grid
$\{-1.0,\ -0.5,\ 0.0,\ +0.5,\ +1.0\}$. Intermediate values are permitted but
should be rare and justified in the ticket's **Vector Summary**.

### 3.1 $X$ — Specification (Green $\leftrightarrow$ Red)

| Score | Criterion |
|---|---|
| $+1.0$ | Delivered exactly to the ticket's "Green Target"; every acceptance criterion met; no deviations. |
| $+0.5$ | Meets spec with a **minor, documented, sanctioned** deviation (noted in the Execution Log). |
| $0.0$ | Spec conformance not yet assessable — pending, or the ticket is pure research. |
| $-0.5$ | Meets the letter but leaves a latent spec gap or an unreviewed shortcut a later ticket must close. |
| $-1.0$ | Violates the spec / an established contract, or introduces brittle debt that must be undone. |

### 3.2 $Y$ — Quality (Blue $\leftrightarrow$ Yellow)

| Score | Criterion |
|---|---|
| $+1.0$ | Sustainable and reference-grade — tests, clean interfaces, would not be revisited for quality reasons. |
| $+0.5$ | Solid engineering with rigour beyond the minimum (trade study, directed verification) but not a reference implementation. |
| $0.0$ | Quality-neutral or not assessable. |
| $-0.5$ | Works, but expedient — thin tests, `TODO`s, a shortcut with a known future cost. |
| $-1.0$ | Athletic workaround; unblocks now, is **known** to incur architectural drift or rework. |

### 3.3 $Z$ — Emergence (Purple $\leftrightarrow$ Light-Gray)

| Score | Criterion |
|---|---|
| $+1.0$ | Creates a strategic net-new **platform** capability others will build on. |
| $+0.5$ | Opens a bounded new capability or removes a hard architectural limit — a capability *step*, not a platform. |
| $0.0$ | Executes within existing capability; neither emergent nor bookkeeping. |
| $-0.5$ | Low-signal — mostly bookkeeping, churn, or marginal value. |
| $-1.0$ | Deferrable, or an explicit accept-the-limitation; delivers no capability. |

### 3.4 Derived label — `telemetry_color`

`telemetry_color` is kept for glanceability and backward compatibility. It is
**derived**, never authored independently:

```
if  ||T||_2 == 0                    ->  "pending"
else
    k = argmax_i |T_i|             (tie-break order: X, then Y, then Z)
    k = X:  T_x > 0 -> "green"      | T_x < 0 -> "red"
    k = Y:  T_y > 0 -> "blue"       | T_y < 0 -> "yellow"
    k = Z:  T_z > 0 -> "purple"     | T_z < 0 -> "light-gray"
```

The scraper recomputes this from the vector and flags any ticket whose written
`telemetry_color` disagrees.

---

## 4. Worked examples

All four are real (or realistic) backlog outcomes. Norms shown to 3 d.p.

| Ticket | $\vec{T} = (x, y, z)$ | $\lVert\vec{T}\rVert_2$ | Derived | Reasoning |
|---|---|---|---|---|
| **TKT-002** — opcode-dispatcher wiring | $(+1.0,\ 0.0,\ 0.0)$ | $1.000$ | green | Pure structural pass: mapped decoded signals 1:1 onto existing control ports, one handshake closed, nothing invented. In-spec ($+1$ X). No rigour beyond the minimum and no drift ($0$ Y). Executes within existing capability ($0$ Z). |
| **TKT-004** — address-translation trade study | $(+1.0,\ +0.5,\ 0.0)$ | $1.118$ | green | A decisive, in-spec recommendation ($+1$ X). Delivered with real rigour — quantified area, access-pattern characterisation, falsifiable revisit trigger ($+0.5$ Y). No code, no capability ($0$ Z). |
| **TKT-003** — BPR addressing | $(+1.0,\ +0.5,\ +0.5)$ | $1.225$ | green | Green Target met and verified, one minor sanctioned deviation (parallel vs time-shared adders) — net $+1$ X. Trade-study-driven, directed TBs, clean interfaces ($+0.5$ Y). Removes the hard 4 GiB ceiling — a bounded capability step, not a platform ($+0.5$ Z). |
| **Mixed (hypothetical)** — "shipped it, but hacked" | $(+0.5,\ -0.5,\ 0.0)$ | $0.707$ | green | Hits the spec's letter but via an expedient shortcut with a known future cost ($+0.5$ X, $-0.5$ Y). Same axis magnitudes, opposite signs: the label resolves to `green` on the tie-break (X before Y), but the vector records the Yellow lean the label discards. |

Round-trip check: for each row, recomputing $\lVert\vec{T}\rVert_2$ and the
derived label from $(x,y,z)$ reproduces the table — the encoding is
self-consistent.

---

## 5. `pgvector` schema

### 5.1 Table

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE pbg_telemetry (
    ticket_id       text PRIMARY KEY,           -- 'TKT-003'
    title           text        NOT NULL,
    status          text        NOT NULL,       -- 'open' | 'in-progress' | 'done'
    telemetry_vec   vector(3)   NOT NULL,       -- (spec X, quality Y, emergence Z), each in [-1, 1]
    telemetry_color text        NOT NULL,       -- derived dominant spoke, or 'pending'
    vec_norm        real GENERATED ALWAYS AS (   -- ||T||_2, in [0, sqrt(3)]
                        sqrt( telemetry_vec[1]*telemetry_vec[1]
                            + telemetry_vec[2]*telemetry_vec[2]
                            + telemetry_vec[3]*telemetry_vec[3] )
                    ) STORED,
    updated_at      timestamptz NOT NULL DEFAULT now()
);
```

(`vector[]` element access is 1-indexed. On pgvector $\ge$ 0.7 the generated
column may instead use `vector_norm(telemetry_vec)`.)

### 5.2 Indexes and distance metric

* **Primary — cosine** (`vector_cosine_ops`): clusters by *direction* /
  flavour, independent of decisiveness, which is what "group tickets by the
  character of their outcome" means. Cosine is undefined at the origin, so
  `pending` rows are excluded from this index.
* **Secondary — L2** (`vector_l2_ops`): for "flavour **and** intensity"
  queries — "find outcomes near a strong Green+Blue" — and it includes the
  origin, so it also answers "which tickets are still uncharacterised".

```sql
CREATE INDEX pbg_telemetry_cos ON pbg_telemetry
    USING hnsw (telemetry_vec vector_cosine_ops)
    WHERE telemetry_color <> 'pending';

CREATE INDEX pbg_telemetry_l2 ON pbg_telemetry
    USING hnsw (telemetry_vec vector_l2_ops);
```

**HNSW over IVFFlat:** the corpus is small (tens–low-hundreds of tickets) and
grows slowly; HNSW needs no training pass or `lists` tuning and gives
near-exact recall at this scale.

Example — the three nearest outcomes to a target flavour:

```sql
SELECT ticket_id, title, telemetry_color, vec_norm
FROM   pbg_telemetry
WHERE  telemetry_color <> 'pending'
ORDER  BY telemetry_vec <=> '[1,0.5,0.5]'      -- <=> is cosine distance
LIMIT  3;
```

### 5.3 Ticket frontmatter contract

The scraper reads two keys from each ticket's YAML frontmatter:

```yaml
telemetry_color: green        # existing; MUST equal the derived dominant spoke
telemetry:                    # new; absent or all-zero => 'pending'
  spec:      1.0              # X, float in [-1.0, 1.0]
  quality:   0.5              # Y
  emergence: 0.5              # Z
```

Rules:

1. Values are **floats on the rubric grid** $\{-1, -0.5, 0, 0.5, 1\}$;
   off-grid values in $[-1,1]$ are accepted but must be justified in the
   *Vector Summary*.
2. If the `telemetry:` block is missing, or `spec == quality == emergence == 0`,
   the ticket is `pending`; `telemetry_color` must read `pending`.
3. Otherwise the scraper computes the derived label (Section 3.4) and **fails**
   if it disagrees with the written `telemetry_color`.
4. The *Vector Summary* free-text line in the ticket's Telemetry section is the
   human justification for the three numbers — required whenever any component
   is non-zero.
5. One row is emitted per ticket:
   `(ticket_id, title, status, telemetry_vec, telemetry_color, updated_at)`;
   `vec_norm` is computed by the database.

Backfilling TKT-001…005 (and the ticket template) with `telemetry:` blocks, and
writing `parse_pbg_telemetry.py` itself, are separate follow-ons — this note
only fixes the contract.

---

## 6. Consistency notes

* **Dimensional analysis.** All three components are dimensionless scores in the
  same $[-1,1]$ range, so $\lVert\vec{T}\rVert_2$ is well-defined and its bound
  $\sqrt{3}$ follows directly from $\sqrt{1^2+1^2+1^2}$.
* **Orthogonality is a modelling choice, not a proof.** Specification, Quality
  and Emergence are treated as independent because a review can rate any one
  without constraining the others; the worked examples bear this out (TKT-002
  and TKT-003 share $X=+1$ but differ on $Y$ and $Z$).
* **The label loses information by design.** `telemetry_color` keeps only the
  dominant spoke; the vector is the source of truth and the only thing the
  `pgvector` store should be queried on.
* **This document defines the scoring mechanics, not the lifecycle rule
  for when a ticket earns a grade at all.** See
  `gcb-workspaces/backlog/GCB-044-ticket-lifecycle-and-filtering-doctrine.md`
  for that: a ticket earns a grade only on a real closed decision — a
  finding filed for disposition, or an audit never meant to be graded
  on the standard R³ vector, carries no grade instead, either via
  `telemetry_color: pending` with an absent `telemetry:` block
  (`GCB-041`, still `open`) or by omitting `telemetry_color` entirely
  with an explanatory comment (`TKT-019.5`, `status: done`) — both are
  real, valid patterns; a missing grade is a signal, not an oversight.
  That document also formalizes the append-only-correction discipline
  already used throughout this program's real tickets.
