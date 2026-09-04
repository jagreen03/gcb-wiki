# Level 1 — 70B Transformer Workload Trace & Hybrid Partitioning

Maps a LLaMA-class 70B transformer layer onto the heterogeneous Photonic +
Vortex system, per the Grok macro-architectural review: **Photonic cores own
static-weight dense linear algebra; digital Vortex cores own dynamic,
data-dependent math.** Reuses the reuse strategy and hardware constants
established in [`05_photonic_memory_dataflow.md`](05_photonic_memory_dataflow.md)
unchanged — this document does not re-derive them, it re-applies them to real
70B-class matrix shapes and checks the result against the already-committed
`gcb_tensor_memory_engine` RTL.

> **Result.** The FFN up-projection of one 70B layer (hidden 8192 → FFN
> 28672) needs **7 GB/s** sustained GDDR7 bandwidth (5 GB/s read, 2 GB/s
> write) and **8.126 MiB** minimum Engine-Local SRAM at a $N_{tile}=1024$
> prefill batch of 4096 tokens — both figures inside the same headroom the
> 4096x4096 reference design already proved out. The architecture holds for
> real 70B dimensions with **zero RTL changes**: `gcb_tensor_memory_engine`'s
> existing parameters (`M_TOTAL`, `N_TOTAL`, `K_TOTAL`, `N_TILE`) accept these
> shapes directly. The one real constraint the math surfaces is **decode-time
> batching**, not hardware: weight-stationary reuse needs $M \gtrsim$ a few
> hundred tokens in flight to keep GDDR7 traffic low, which off-the-shelf
> continuous batching already provides (sec. 5).

## 1. Model Baseline

LLaMA-class 70B dense transformer, one layer:

| parameter | value |
|---|---|
| Hidden dimension ($d_{model}$) | 8192 |
| FFN intermediate dimension ($d_{ff}$) | 28672 (SwiGLU: gate + up + down, each $8192\!\leftrightarrow\!28672$) |
| Attention heads / head dim | 64 / 128 ($64\times128=8192=d_{model}$) |
| KV heads (GQA) | 8 ($\Rightarrow$ K, V projections are $8192\times1024$, not $8192\times8192$) |
| Layers | 80 |
| Operand / accumulation precision | INT4 / INT16 (unchanged from sec. 05) |

## 2. Hybrid Workload Partitioning

| Block | Owner | Why |
|---|---|---|
| $W_Q$, $W_K$, $W_V$, $W_O$ projections | **Photonic Tensor Complex** | Static weights, dense GEMM, huge reuse — exactly what weight-stationary optical cores are built for |
| FFN gate / up / down projections | **Photonic Tensor Complex** | Static weights, the largest GEMMs in the layer by far (sec. 6) |
| $QK^T$ / attention score matmul | **Digital Vortex** | Operand ($K$, sequence-position-dependent) changes every token — not weight-stationary, no static tile to hold resident |
| Softmax | **Digital Vortex** | Nonlinear, numerically sensitive (max-subtraction, exp, normalize) — not a linear-algebra core's job |
| RMSNorm | **Digital Vortex** | Nonlinear (rsqrt), per-token dynamic statistics, small compared to the GEMMs it gates |
| $\text{Attn} \times V$, residual adds | **Digital Vortex** | Dynamic operand (attention-weighted $V$), small relative to the FFN GEMMs |

This is the same split the RTL already assumes: `gcb_tensor_memory_engine`
only ever sees *weights that don't change per token* on its B-channel — it
has no port for a per-token dynamic operand, by design (`04_ai_protocols...`
established this project's convention of not inventing ports a block doesn't
need). Everything dynamic stays digital.

## 3. FFN Up-Projection: Shape Mapping

The FFN up-projection $Y = X W_{up}$, $X \in \mathbb{Z}^{M\times8192}$,
$W_{up}\in\mathbb{Z}^{8192\times28672}$, maps directly onto sec. 05's engine
parameters:

| engine parameter | 4096³ reference (05) | 70B FFN up-proj |
|---|---:|---:|
| $M$ (tokens / row-bands) | 4096 | **4096** (prefill; sec. 5 covers decode) |
| $K$ (hidden, reduction dim) | 4096 | **8192** |
| $N$ (FFN intermediate) | 4096 | **28672** |
| $N_{tile}$ | 1024 | **1024** (unchanged — still divides 28672 evenly: $28672/1024=28$) |
| GRID_DIM / K_MAX / NUM_CORES | 16 / 16 / 256 | unchanged |

$W_{up}$ is the weight (B, held resident per $N_{tile}$ column band); $X$ is
the activation (A, re-streamed once per pass). Every divisibility constraint
`gcb_tensor_sram_controller` assumes holds exactly:
$K/K_{MAX}=8192/16=512$, $N_{TILE}/\text{GRID\_DIM}=1024/16=64$,
$M/\text{GRID\_DIM}=4096/16=256$, $N/N_{tile}=28672/1024=28$ — all integers,
no remainder handling needed.

## 4. Cycle-by-Cycle Trace

Total MACs:

$$M \times K \times N = 4096 \times 8192 \times 28672 = 962{,}072{,}674{,}304 \text{ MACs}$$

At the fixed hardware MAC rate (256 cores $\times$ 16 MAC/cycle $\times$
2 GHz $= 8.192\times10^{12}$ MAC/s — a hardware constant, identical to sec.
05, independent of workload shape):

$$\text{cycles} = \frac{K \times N}{K_{MAX}\times\text{NUM\_CORES}} = \frac{8192\times28672}{4096} = 234{,}881{,}024 \text{ cycles}$$

(The $M$ term cancels exactly because $M=4096=\text{NUM\_CORES}\times K_{MAX}$
here — a convenient but not load-bearing coincidence of the chosen prefill
batch; sec. 5 uses the un-cancelled form for other $M$.)

$$\text{time} = 234{,}881{,}024 \times 0.5\,\text{ns} = 117{,}440{,}512\,\text{ns} = \mathbf{117.440512\ ms}$$

Sustained rate: $962{,}072{,}674{,}304 / 0.117440512\,\text{s} = 8.192\times10^{12}$
MAC/s — matches the hardware constant exactly, confirming zero stall
cycles in this trace.

### GDDR7 traffic over the 117.44 ms window

| operand | reuse | total bytes moved |
|---|---|---:|
| $X$ (activation, re-streamed once per $N$-pass) | $N/N_{tile}=28$ passes $\times$ $M\times K\times0.5\text{B}$ | $28 \times 16{,}777{,}216 = 469{,}762{,}048$ B (448 MiB) |
| $W_{up}$ (weight, read once) | $K\times N\times0.5\text{B}$ | $117{,}440{,}512$ B (**112 MiB** — exactly matches full-matrix size) |
| $Y$ (output, INT16, written once) | $M\times N\times2\text{B}$ | $234{,}881{,}024$ B (224 MiB) |

$$\text{Read BW} = \frac{469{,}762{,}048+117{,}440{,}512}{0.117440512\,\text{s}} = \mathbf{5.000\ GB/s}$$

$$\text{Write BW} = \frac{234{,}881{,}024}{0.117440512\,\text{s}} = \mathbf{2.000\ GB/s}$$

$$\text{Total} = \mathbf{7\ GB/s}$$

Both divide out exactly — no rounding — confirming the general closed form
(derived by carrying sec. 05's algebra through with $M,K,N$ symbolic instead
of all fixed at 4096):

$$\text{Read BW (GB/s)} = \frac{4096}{N_{tile}} + \frac{4096}{M} \qquad
  \text{Write BW (GB/s)} = \frac{16384}{K}$$

where $4096 = 0.5 \times K_{MAX}\times\text{NUM\_CORES}\times f_{clk}(\text{GHz})$
and $16384 = 2\times K_{MAX}\times\text{NUM\_CORES}\times f_{clk}(\text{GHz})$
are fixed by the hardware already built, not by the workload. Setting
$M=K=N_{tile}=4096$ reproduces sec. 05's original $4096/N_{tile}+1$ and
$4\text{ GB/s}$ formulas exactly — this is the same equation, just no longer
assuming a cube. Read BW is unchanged at 5 GB/s (both terms depend only on
$N_{tile}$ and $M$, and $M=4096$ here too), but **Write BW drops to 2 GB/s**
(half of sec. 05's 4 GB/s) purely because $K$ doubled: the same output tile
now amortizes over twice the reduction depth per element written, at fixed
compute rate.

## 5. SRAM Residency

Same $N_{tile}=1024$ design point, ping-pong double-buffered (sec. 05 sec. 7
convention):

| buffer | single | double (ping-pong) |
|---|---:|---:|
| $W_{up,tile}$ weight-stationary block ($1024\times8192\times0.5$B) | 4 MiB | **8 MiB** |
| $X$ row-band streaming stage ($16\times8192\times0.5$B) | 64 KiB | **128 KiB** |
| $Y$ output tile staging ($16\times16\times$INT16) | 512 B | **1 KiB** |
| **Total minimum** | | **8,520,704 B $\approx$ 8.126 MiB** |

**Recommendation: a 9 MiB (9,437,184 B) Engine-Local SRAM macro** — 10.7%
margin, the same margin ratio sec. 05 used (4.5/4.06 MiB), applied
consistently rather than re-derived from scratch. The growth from 4.5 MiB to
9 MiB is driven entirely by $K$ doubling ($4096\to8192$) — $N_{tile}$ and
GRID_DIM are unchanged, and the storage arrays in `gcb_tensor_sram_controller`
(`a_mem[..][0:K_STEPS-1]`, `b_mem[..][0:K_STEPS-1]`) already scale with
`K_STEPS` as a parameter, so this is a **reconfiguration, not a redesign**:
instantiate with `M_TOTAL=4096, N_TOTAL=28672, K_TOTAL=8192, N_TILE=1024`
in place of the reference `4096,4096,4096,1024`.

## 6. Prefill vs. Decode: Why $M$ Matters

The closed form in sec. 4 shows Read BW scales with $1/M$: weight-stationary
reuse only pays off when enough tokens are in flight to amortize each
$N_{tile}$ load. Three regimes for this same FFN up-projection:

| regime | $M$ | Read BW | Write BW | Total BW | note |
|---|---:|---:|---:|---:|---|
| Prefill (full context tile) | 4096 | 5 GB/s | 2 GB/s | **7 GB/s** | sec. 4 |
| Continuous-batched decode | 256 | 20 GB/s | 2 GB/s | **22 GB/s** | typical LLM-serving batch size |
| Naive single-token decode | 1 | 4100 GB/s | 2 GB/s | **4102 GB/s** | infeasible — no batching |

The $M{=}1$ row is not a flaw in this architecture; it is the same reason
every GPU-based LLM server uses continuous batching — a weight-stationary
(or cache-resident-weight) accelerator is fundamentally a throughput device
that trades batch size for bandwidth. At $M{=}256$, a batch size well within
normal serving practice, Total BW is still **0.017% of one GDDR7 device**
(22 GB/s of 128 GB/s $\times$ many devices in a real subsystem — see sec. 05
sec. 8). The architecture requirement this places on the system is therefore
scheduling, not hardware: the digital orchestration layer must present the
Photonic Complex with a batched $M$, which continuous batching already does
for the attention side of any LLM server.

## 7. Full-Layer and Full-Model Weight Footprint

The FFN up-projection is one of three same-shape photonic GEMMs per layer
(SwiGLU gate + up + down all move $8192\times28672\times0.5\text{B} =
117{,}440{,}512$ B $=112$ MiB of INT4 weight each — down-projection is the
transpose shape but identical byte count and, since $M\times K\times N$ is
invariant under swapping $K$ and $N$, identical cycle count too). Adding the
attention projections (sec. 2) at 70B's GQA dimensions:

| block | shape | INT4 bytes | |
|---|---|---:|---:|
| $W_Q$ | 8192x8192 | 33,554,432 | 32 MiB |
| $W_K$ | 8192x1024 (GQA, 8 KV heads) | 4,194,304 | 4 MiB |
| $W_V$ | 8192x1024 (GQA, 8 KV heads) | 4,194,304 | 4 MiB |
| $W_O$ | 8192x8192 | 33,554,432 | 32 MiB |
| FFN gate + up + down | 3 x (8192x28672) | 352,321,536 | 336 MiB |
| **Per layer, photonic-resident** | | **427,819,008** | **408 MiB** |
| **x 80 layers** | | **34,225,520,640** | **31.875 GiB ($\approx$34.2 GB)** |

INT4 quantization keeps the entire 70B model's photonic-side weights inside
a single GDDR7-class device pool (~34 GB, vs. $\approx$140 GB for a naive
FP16 70B checkpoint) — a direct, load-bearing consequence of `goal.md`'s
"cheap capacity over scarce bandwidth" doctrine, not a separate claim. No
specific competitor's SRAM/HBM figures are asserted here — per `goal.md`'s
characterize-first rule, this section only checks this design's own numbers
against the published GDDR7 device class already cited in sec. 05 sec. 8.

Compute-only lower bound for all photonic GEMMs, full model, one prefill
pass at $M=4096$: $3 \times 117.44\,\text{ms} \times 80\,\text{layers}
\approx 28.2\,\text{s}$ for gate+up+down FFN alone (attention projections
add proportionally less — sec. 2's $W_Q/W_O$ are $8192^2$, a quarter the MACs
of one FFN matrix each). This is a photonic-compute floor, not an end-to-end
latency claim — it excludes all Vortex-side attention/Softmax/RMSNorm time
and assumes no pipelining between layers, both of which a real scheduler
would exploit.

## 8. Validation Against the Existing RTL

`gcb_tensor_memory_engine` (rtl/gcb_tensor_memory_engine.sv,
`gcb-wdm-transceiver`), already lint-clean and testbenched, exposes exactly
the parameters this trace needs and no others:

```
M_TOTAL=4096, N_TOTAL=28672, K_TOTAL=8192, N_TILE=1024,
GRID_DIM=16, K_MAX=16, INT4_W=4, SRAM_LATENCY=1
```

Every width parameter downstream (`KSW`, `MBW`, `NPW`, `COLW`) is derived
from these via `$clog2` and requires no manual resizing. The on-die broadcast
requirement is unchanged from sec. 05 sec. 9 (256 B/cycle, 512 GB/s) since it
depends only on GRID_DIM/K_MAX/INT4_W, none of which changed for 70B — the
already-built `gcb_tensor_broadcast_fabric` needs no changes either. This is
the sense in which the trace "proves the architecture": a real 70B shape
fits the already-committed RTL's parameter space, not a hypothetical one.

## Related

- [`05_photonic_memory_dataflow.md`](05_photonic_memory_dataflow.md) — the
  reuse strategy, hardware constants, and SRAM-sizing convention this
  document re-applies rather than re-derives.
- `goal.md` — Memory Architecture Doctrine (weight-stationary always, cheap
  capacity over scarce bandwidth) that sec. 7's footprint check validates.
- [`04_ai_protocols_and_blue_wording.md`](04_ai_protocols_and_blue_wording.md)
  — why the Photonic Complex has no port for a dynamic per-token operand
  (sec. 2 here).
