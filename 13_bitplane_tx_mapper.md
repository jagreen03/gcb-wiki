# Bit-Plane Tx Mapper — INT4↔Optical Encoding & Algebraic INT16 Reconstruction

**Level:** L1 — the electrical-INT4 → unweighted-optical-coordinate boundary of
the QPSK-spread photonic MAC, and the digital receiver that inverts it.

This note is the doctrine for the encoding chain
`gcb_bitplane_tx_mapper` → `gcb_wavelength_router` → (optical mesh) →
`gcb_rx_digital_recombiner`, assembled in `gcb_qam_datapath_top`. Every equation,
lane, and width below is traceable to a line of RTL (§8). The RTL is
authoritative; this document reflects it.

Companion docs: `01_streaming_sequence.md` (the compute→optical boundary),
`02_receiver_architecture.md` (the digital receiver, no routed analog voltage),
`03_dual_mode_integration.md` (the V2.0 per-lane bit-plane drive scheme),
`05_photonic_memory_dataflow.md` (the bit-plane Tx buffer SRAM budget),
`07_inline_vector_softmax.md` (`qam_result` downstream). Source of truth:
`gcb-wdm-transceiver/rtl/gcb_bitplane_tx_mapper.sv`,
`gcb_wavelength_router.sv`, `gcb_qam_datapath_top.sv`,
`gcb_rx_digital_recombiner.sv`.

---

## 0. Fixed quantities

| Symbol | Value | Meaning | RTL |
|---|---|---|---|
| `INT4_W` | 4 | operand width (bits), two's-complement | `gcb_bitplane_tx_mapper.sv:49` |
| `N_PLANE` | 4 | bit-planes per operand = `INT4_W` | `gcb_bitplane_tx_mapper.sv:50` |
| `NUM_OPERANDS` / `K_MAX` | 64 (default) | elements in the flat operand vector; = dot-product length per beat | `gcb_bitplane_tx_mapper.sv:24`, `gcb_qam_datapath_top.sv:30`,`:77` |
| $W$ | $(1,\;2,\;4,\;-8)$ | positional bit weights of a two's-complement INT4; **digital only** | `gcb_bitplane_tx_mapper.sv:11`, `gcb_rx_digital_recombiner.sv:50–55` |
| colors | 2 | DWDM wavelengths per operand, QPSK I/Q | `gcb_wavelength_router.sv:8–11` |
| $L_{ij}$ | 16 values, $i,j\in\{0..3\}$ | unweighted optical cross-products, flattened $i\cdot4+j$ | `gcb_rx_digital_recombiner.sv:38`,`:73` |
| `LIJ_W` | `KW + 1` | signed width of $L_{ij}$ ($KW=\lceil\log_2(K_{MAX}{+}1)\rceil$) | `gcb_rx_digital_recombiner.sv:31–32` |
| `ACC_W` | 32 | wide signed working width in the recombiner | `gcb_rx_digital_recombiner.sv:47` |
| `result` | `signed [15:0]` | exact INT16 dot product; valid while $\lvert Y\rvert\le K_{MAX}\cdot 64$ | `gcb_rx_digital_recombiner.sv:44`,`:87` |

Notation: $a[k],b[k]$ are the INT4 operands at lane $k$; $a_i[k]\in\{0,1\}$ is
bit $i$ of $a[k]$ (bit 0 = LSB, bit 3 = sign). $K=$ `k_len`, the active
dot-product length ($K\le K_{MAX}$).

---

## 1. The invariant — no radix scaling in the optical field

A two's-complement INT4 operand is, exactly,

$$a[k]\;=\;\sum_{i=0}^{3} W_i\,a_i[k],\qquad W=(1,\,2,\,4,\,-8).$$

The Tx mapper transmits the **four raw bits of every operand as bare antipodal
coordinates $\pm1$** and applies **none** of the weights $W$. Positional
recombination — the multiplications by $1,2,4,-8$ and their outer products — is
deferred **entirely** to the digital receiver (`gcb_bitplane_tx_mapper.sv:8–11`).
Consequently the optical field only ever carries unweighted $\pm1$ values on
orthogonal I/Q axes, and no analog stage performs a weighted sum
(`02_receiver_architecture.md`; `gcb_wavelength_router.sv:12–15`).

---

## 2. Encode — INT4 → 4 raw bit-planes → antipodal $\pm1$

`gcb_bitplane_tx_mapper`. Element $e$ is `operand_flat[e*4 +: 4]`
(`:32`,`:57`). For each plane $p\in\{0,1,2,3\}$ and element $e$:

$$\text{drive}[p][e] \;=\; a_p[e]\qquad(\text{raw bit }p,\ \textbf{unweighted})
\tag{:59}$$

$$\text{coord}[p][e] \;=\; \alpha_p[e] \;=\; \begin{cases}+1 & a_p[e]=1\\[2pt]-1 & a_p[e]=0\end{cases}
\;=\; 2\,a_p[e]-1 \tag{:60}$$

`drive` is the modulator on/off bus; `coord` is the same value as a signed
$\pm1$ for the receiver / golden model (`:42`,`:46`). Plane index $p$ **is** the
operand bit position and carries no optical weight (`:37–41`). `REG_OUT`
(default 1) optionally registers the egress for timing closure (`:65–82`); the
datapath instantiates it combinationally (`gcb_qam_datapath_top.sv:77`,`:82`).

---

## 3. Route — 4 planes → 2 DWDM colors × I/Q

`gcb_wavelength_router` fans the four planes onto two physical wavelengths
("colors"), two planes per color on the orthogonal **I** and **Q** axes of a
QPSK constellation (`gcb_wavelength_router.sv:47–52`;
`gcb_qam_datapath_top.sv:46`):

| Lane (A side; B side identical) | plane $p$ | operand bit | digital weight $W_p$ | drives |
|---|---|---|---|---|
| `a_c0_i` — color 0, In-phase | 0 | bit 0 (LSB) | $+1$ | $\alpha_0[k]=2a_0[k]-1$ |
| `a_c0_q` — color 0, Quadrature | 1 | bit 1 | $+2$ | $\alpha_1[k]=2a_1[k]-1$ |
| `a_c1_i` — color 1, In-phase | 2 | bit 2 | $+4$ | $\alpha_2[k]=2a_2[k]-1$ |
| `a_c1_q` — color 1, Quadrature | 3 | bit 3 (sign) | $-8$ | $\alpha_3[k]=2a_3[k]-1$ |

I and Q are orthogonal in the optical field and do not mix, so each axis carries
exactly one bare $\pm1$ plane with no analog positional weighting
(`gcb_wavelength_router.sv:12–15`). The weights column is informational — it is
applied only in §6.

---

## 4. Partial dot products — lane gating & digital marginals

For $K<K_{MAX}$, `gcb_qam_datapath_top` builds a lane mask and forces the
inactive color drives to $0$ (no illumination), so they contribute nothing:

$$\text{lane\_active}[e] = [\,e < K\,]\tag{:67}$$
$$a\_c0\_i[e] = \text{lane\_active}[e]\;?\;\alpha_0[e]\;:\;0
\quad(\text{and likewise for c0q, c1i, c1q, and the B lanes})\tag{:104–111}$$

It also computes, digitally, the **Boolean marginals** over the active lanes
(`:117–120`):

$$M_a[p] \;=\; \sum_{k<K} a_p[k] \;=\; \operatorname{popcount}\big(\text{a\_drive}[p]\,\wedge\,\text{lane\_active}\big),
\qquad M_b[p] \;=\; \sum_{k<K} b_p[k].$$

---

## 5. The optical cross-products $L_{ij}$

The balanced-homodyne mesh (an analog top-level boundary, modelled) returns 16
**unweighted** correlations between antipodal plane $i$ of $A$ and antipodal
plane $j$ of $B$, summed over the active lanes
(`gcb_rx_digital_recombiner.sv:8–11`):

$$L_{ij} \;=\; \sum_{k<K}\big(2a_i[k]-1\big)\big(2b_j[k]-1\big)
\;=\; \sum_{k<K}\alpha_i[k]\,\beta_j[k],\qquad L_{ij}\in[-K,\,K].$$

---

## 6. Decode — algebraic INT16 reconstruction

`gcb_rx_digital_recombiner`. Two steps.

### 6.1 Recover the Boolean AND-sums $S_{ij}$

Define $S_{ij}=\sum_{k<K} a_i[k]\,b_j[k]\ge 0$ (lanes where bit $i$ of $A$ **and**
bit $j$ of $B$ are both 1). From $a_i,b_j\in\{0,1\}$:

$$(2a_i-1)(2b_j-1) \;=\; 4\,a_i b_j \;-\; 2a_i \;-\; 2b_j \;+\; 1.$$

Summing over $k<K$ gives $L_{ij} = 4S_{ij} - 2M_a[i] - 2M_b[j] + K$, hence

$$\boxed{\,S_{ij} \;=\; \dfrac{L_{ij} \;+\; 2\,M_a[i] \;+\; 2\,M_b[j] \;-\; K}{4}\,}
\tag{:16, :75–80}$$

The numerator is evaluated in **one 32-bit signed accumulator** so the unsigned
$M_a,M_b,K$ can never corrupt the sign of $L_{ij}$; for any consistent input set
it is a non-negative multiple of 4, so the $/4$ is the exact arithmetic shift
`>>> 2` (`:79–80`; the `SIMULATION` assert at `:79`,`:116` flags a negative or
non-multiple-of-4 numerator).

### 6.2 Apply the positional weights and sum

With $W=(1,2,4,-8)$ and the weight outer product $WW_{ij}=W_i W_j$
(`:50–55`):

$$WW \;=\;
\begin{pmatrix}
 1 & 2 & 4 & -8\\
 2 & 4 & 8 & -16\\
 4 & 8 & 16 & -32\\
 -8 & -16 & -32 & 64
\end{pmatrix}$$

$$\boxed{\,Y \;=\; \sum_{i=0}^{3}\sum_{j=0}^{3} W_i\,W_j\,S_{ij}\,}\tag{:17, :81}$$

and `result = 16'(Y)` (`:87`).

### 6.3 Why $Y$ is exact

$$\sum_{k<K} a[k]\,b[k]
= \sum_{k<K}\Big(\sum_i W_i a_i[k]\Big)\Big(\sum_j W_j b_j[k]\Big)
= \sum_i\sum_j W_i W_j \sum_{k<K} a_i[k]b_j[k]
= \sum_i\sum_j W_i W_j\,S_{ij}
= Y.$$

Substituting §6.1 gives the single closed form the datapath realises:

$$Y \;=\; \sum_{i=0}^{3}\sum_{j=0}^{3} W_i\,W_j\;
\frac{L_{ij} + 2M_a[i] + 2M_b[j] - K}{4}.$$

Exact for any legal INT4 tile: $\lvert Y\rvert \le K_{MAX}\cdot 64$ (for
$K_{MAX}=64$, $4096 < 32767$), so the 16-bit result never overflows (`:87`,
`:118`).

---

## 7. Worked example — encode → lanes → decode

$K=2$, $a=[\,3,\,-2\,]$, $b=[\,1,\,-4\,]$. Reference: $3\cdot1 + (-2)\cdot(-4) = 11$.

**INT4 bits** $(a_0,a_1,a_2,a_3)$, LSB first:

| operand | value | bits | check $\sum W_i b_i$ |
|---|---|---|---|
| $a[0]$ | $3$ | $(1,1,0,0)$ | $1+2 = 3$ |
| $a[1]$ | $-2$ | $(0,1,1,1)$ | $2+4-8 = -2$ |
| $b[0]$ | $1$ | $(1,0,0,0)$ | $1$ |
| $b[1]$ | $-4$ | $(0,0,1,1)$ | $4-8 = -4$ |

**Encode + route** — antipodal $\alpha_p[k]=2a_p[k]-1$ onto the lanes:

| $k$ | `c0_i` $\alpha_0$ | `c0_q` $\alpha_1$ | `c1_i` $\alpha_2$ | `c1_q` $\alpha_3$ |
|---|---|---|---|---|
| $A[0]$ | $+1$ | $+1$ | $-1$ | $-1$ |
| $A[1]$ | $-1$ | $+1$ | $+1$ | $+1$ |
| $B[0]$ | $+1$ | $-1$ | $-1$ | $-1$ |
| $B[1]$ | $-1$ | $-1$ | $+1$ | $+1$ |

**Digital marginals** $M_a[p]=\sum_k a_p[k]$, $M_b[p]=\sum_k b_p[k]$:

$$M_a = (1,\,2,\,1,\,1),\qquad M_b = (1,\,0,\,1,\,1).$$

**Optical cross-products** $L_{ij}=\sum_k \alpha_i[k]\beta_j[k]$:

$$L \;=\;
\begin{pmatrix}
 2 & 0 & -2 & -2\\
 0 & -2 & 0 & 0\\
 -2 & 0 & 2 & 2\\
 -2 & 0 & 2 & 2
\end{pmatrix}$$

**Recover** $S_{ij}=(L_{ij}+2M_a[i]+2M_b[j]-K)/4$, $K=2$, $2M_a=(2,4,2,2)$,
$2M_b=(2,0,2,2)$. E.g. $S_{00}=(2+2+2-2)/4=1$, $S_{13}=(0+4+2-2)/4=1$:

$$S \;=\;
\begin{pmatrix}
 1 & 0 & 0 & 0\\
 1 & 0 & 1 & 1\\
 0 & 0 & 1 & 1\\
 0 & 0 & 1 & 1
\end{pmatrix}$$

(Each entry equals the direct AND-popcount, e.g. $S_{22}=\sum_k a_2[k]b_2[k]=0\cdot0+1\cdot1=1$.)

**Weight and sum** $Y=\sum_{ij} WW_{ij}\,S_{ij}$, row by row of $WW\circ S$:

| $i$ | contributions $W_iW_j S_{ij}$ | row sum |
|---|---|---|
| 0 | $1\!\cdot\!1,\;0,\;0,\;0$ | $+1$ |
| 1 | $2\!\cdot\!1,\;0,\;8\!\cdot\!1,\;-16\!\cdot\!1$ | $-6$ |
| 2 | $0,\;0,\;16\!\cdot\!1,\;-32\!\cdot\!1$ | $-16$ |
| 3 | $0,\;0,\;-32\!\cdot\!1,\;64\!\cdot\!1$ | $+32$ |

$$Y = 1 - 6 - 16 + 32 = \mathbf{11}\;=\;3\cdot1 + (-2)\cdot(-4).\qquad\checkmark$$

---

## 8. RTL traceability

| # | Claim | RTL |
|---|---|---|
| 1 | Element $e$ = `operand_flat[e*4 +: 4]`, INT4 two's-complement | `gcb_bitplane_tx_mapper.sv:32`, `:57` |
| 2 | Plane $p$ = raw operand bit $p$, unweighted (`drive[p][e]=nib[p]`) | `gcb_bitplane_tx_mapper.sv:59` |
| 3 | Antipodal map $\alpha_p[e]=2a_p[e]-1$ (`nib[p] ? +1 : -1`) | `gcb_bitplane_tx_mapper.sv:60` |
| 4 | 4 planes per operand (`N_PLANE = 4`) | `gcb_bitplane_tx_mapper.sv:50` |
| 5 | No radix scaling in optics; weights $1,2,4,-8$ deferred to Rx | `gcb_bitplane_tx_mapper.sv:8–11` |
| 6 | color0 I=plane0 / Q=plane1; color1 I=plane2 / Q=plane3 | `gcb_wavelength_router.sv:48–51`; `gcb_qam_datapath_top.sv:46`,`:48–55` |
| 7 | I ⊥ Q, each a bare $\pm1$ plane, no analog weighting | `gcb_wavelength_router.sv:12–15` |
| 8 | Lane gate $\text{lane\_active}[e]=[e<K]$; inactive → `2'sd0` | `gcb_qam_datapath_top.sv:67`, `:104–111` |
| 9 | Digital marginals $M_a[p]=\sum_{k<K}a_p[k]$ (`$countones(drive & lane_active)`) | `gcb_qam_datapath_top.sv:118–119` |
| 10 | $L_{ij}=\sum_{k<K}(2a_i[k]-1)(2b_j[k]-1)$, 16 values flattened $i\cdot4+j$ | `gcb_rx_digital_recombiner.sv:8–11`, `:73` |
| 11 | $S_{ij}=(L_{ij}+2M_a[i]+2M_b[j]-K)/4$ | `gcb_rx_digital_recombiner.sv:16`, `:75–80` |
| 12 | numerator in one 32-bit signed acc; exact $/4$ = `>>> 2`; assert $\ge0$ ∧ $\bmod 4=0$ | `gcb_rx_digital_recombiner.sv:47`, `:79–80`, `:114–121` |
| 13 | $WW_{ij}=W_iW_j$, $W=\{1,2,4,-8\}$ | `gcb_rx_digital_recombiner.sv:50–55` |
| 14 | $Y=\sum_i\sum_j W_iW_j\,S_{ij}$ | `gcb_rx_digital_recombiner.sv:17`, `:81` |
| 15 | `result = 16'(Y)`, exact while $\lvert Y\rvert\le K_{MAX}\cdot64$ | `gcb_rx_digital_recombiner.sv:87`, `:118` |
| 16 | Chain assembly A/B ×2, mapper→router→(mesh)→recombiner | `gcb_qam_datapath_top.sv:70–127` |

---

## 9. Cross-references

* `03_dual_mode_integration.md` — the "V2.0" row ("per-lane $\pm1$/$0$ bit-plane
  drives — two colours × I/Q") is this encoding; §2–3 here are its full
  specification.
* `05_photonic_memory_dataflow.md` §7 — the on-die SRAM sizing the `operand_flat`
  Tx staging draws on; one operand needs $4$ planes × `NUM_OPERANDS` bits/beat.
* `goal.md` — the "bit-plane Tx buffers" line in the on-die SRAM budget table.
* `intent.md` — "prepares the unweighted bit-planes and algebraically
  reconstructs the final INT16 answers" is §1 + §6 here.
* `07_inline_vector_softmax.md` — consumes `result` (`qam_result`) downstream.
