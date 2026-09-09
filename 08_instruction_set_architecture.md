# Level 1 — Instruction Set Architecture: The Execution Opcode Bus

Defines the programmable interface between `compiler/` (`gcb-python-orchestrator`)
and the two execution engines it targets — the Photonic Tensor Complex and
digital Vortex. `compiler/partitioner.py`'s `HybridPartitioner` already tags
every FX graph node `PHOTONIC` / `VORTEX` / `HOST`
([`06_70B_transformer_workload_trace.md`](06_70B_transformer_workload_trace.md)
sec. 2); this document defines what a tagged node actually **becomes** — a
fixed-format instruction word on one shared bus, decoded and routed by
hardware, not hand-wired by the compiler.

## 1. Why an ISA, Not Hardcoded Data Paths

A compiler that hardcodes "write this GEMM's result to address X, which the
Softmax unit happens to read from" is coupling software to a specific
hardware wiring decision — exactly the coupling
[`07_inline_vector_softmax.md`](07_inline_vector_softmax.md) sec. 2 already
had to route *around* once (the inline handoff exists because the naive
GDDR7-round-trip wiring was wrong). An opcode bus inverts the dependency:
the compiler emits **what** to compute and states its **operands**; a
hardware dispatcher decides **which engine** runs it and **how** the
operands actually move, keyed purely off the opcode field. Two consequences
that matter architecturally, not just as software hygiene:

- **The engine assignment is not a compiler-settable field.** `OPCODE`
  implies its target engine by construction (sec. 3) — there is no
  `engine_id` operand to get wrong, and no way for a buggy compiler pass to
  route an `OP_SOFTMAX` at the Photonic array. This is Interface
  Segregation applied to hardware: the bus's producer (compiler) and the
  bus's router (dispatcher) depend on the same opcode encoding, nothing
  else.
- **The dispatcher, not the compiler, owns the inline-handoff decision.**
  Whether an `OP_GEMM`→`OP_SOFTMAX` pair actually keeps data on-die
  (doc 07's whole point) or falls back to a real memory round trip is a
  hardware scheduling decision (sec. 3.2), invisible to the opcode stream
  itself — the compiler emits the same two instructions either way.

## 2. The Execution Opcode Bus Interface

**Reconciled to the hardware wire format.** An earlier draft of this
document specified a wider, 256-bit conceptual layout (40-bit pointers,
three `DIM` fields, a `TILE_CFG` field) before any RTL existed against it.
`rtl/gcb_opcode_dispatcher.sv` (`gcb-wdm-transceiver`) landed first, at a
**128-bit** word instead — it aligns to a single AXI-Stream / PCIe payload
beat with zero padding waste, a real hardware advantage the wider layout
did not have. This section now matches that RTL exactly, field names
included; the two consequences the narrower word has for what it *cannot*
carry are called out explicitly below rather than smoothed over.

| field | bits | width | meaning |
|---|---|---:|---|
| `opcode` | `[127:120]` | 8 b | operation identifier — implies the target engine (sec. 1), room for 256 total, 3 defined (sec. 3) |
| *(reserved)* | `[119:112]` | 8 b | padding; not decoded to any output (`gcb_opcode_dispatcher.sv`) |
| `dst_ptr` | `[111:80]` | 32 b | output pointer — always where the *finished* result lands |
| `b_ptr` | `[79:48]` | 32 b | second operand pointer — meaning is opcode-defined (sec. 4) |
| `a_ptr` | `[47:16]` | 32 b | first operand pointer — meaning is opcode-defined |
| `dim_k` | `[15:0]` | 16 b | the **one** shape parameter this word carries — see below |

A pointer is a *logical* address (GDDR7 or Engine-Local SRAM — which one is
an implementation/allocator concern, not an ISA concern) — see sec. 3.2 for
the one case where `a_ptr` deliberately does not mean "go read memory."

**Pointer range: 4 GiB per pointer, not 1 TiB.** `a_ptr`/`b_ptr`/`dst_ptr`
each directly address 4 GiB ($2^{32}$ B) — generous for any *single*
operand or output tensor at the scales this document has otherwise worked
with (doc 05's 8–32 MiB reference matrices; doc 06's largest single weight
matrix at 112 MiB), but not enough to address the full 70B model's ~34 GiB
aggregate INT4 footprint (doc 06 sec. 7) as one flat space. **Not resolved
here:** whether these are flat GDDR7 addresses (needing a segmented or
windowed scheme above 4 GiB — not designed anywhere in this repo yet) or
offsets into a per-tensor descriptor's own smaller allocation (in which
case 4 GiB per tensor is ample headroom and the aggregate-footprint concern
does not apply). A real open question this width surfaces, not a defect
quietly designed around.

**Resolved (TKT-003 / TKT-004 — Base-Pointer Registers).** The second reading
above is the one adopted: `a_ptr` / `b_ptr` / `dst_ptr` are **32-bit
within-region byte offsets**, not flat addresses. `gcb_tensor_address_
translation.sv` holds four architected 48-bit base registers — `BASE_A`,
`BASE_B`, `BASE_DST`, `BASE_SCRATCH` — reset to 0 and programmed over a
CSR/MMIO path, and forms the effective address once per GEMM as

$$EA_{48} = BASE[\text{role}] + \text{zero\_extend}(ptr_{32})$$

where *role* is A / B / DST by default. A trade study (TKT-004) chose this
over a hardware MMIO/TLB (12–20× the area for translation generality a
three-region sequential-streaming engine never uses) and over bare high-bit
concatenation (a permanent 4 GiB alignment/fragmentation tax). The 128-bit
word is unchanged: an optional 2-bit-per-operand base-select override lives
entirely inside the `[119:112]` reserved byte. The **256-bit conceptual
layout's 40-bit pointer** (below) is therefore just this same quantity —
`BASE[role] + offset32` — with the concrete word carrying the offset and the
role (or the override field) selecting the base.

**One dimension field, not three plus a tiling hint.** `OP_GEMM`'s full
shape needs $M$, $K$, $N$, and (doc 05's own weight-stationary design)
$N_{tile}$ — four numbers — and this word carries exactly one, `dim_k`
(sec. 3.1 names it $K$, matching the field's own name — the reduction
depth, the one dimension that is not already implicit in either operand
tensor's own shape). **Not resolved here:** how $M$, $N$, and $N_{tile}$
reach the Photonic Tensor Complex under this instruction format —
candidates include per-tensor descriptors already carrying their own shape
(so `a_ptr`/`b_ptr` imply $M$/$N$ without a dedicated field), a separate
configuration instruction preceding the `OP_GEMM`, or a wider companion
word — a later task, same as the pointer-range question above.
`OP_SOFTMAX` and `OP_SCALE_DIAG` are unaffected: both need exactly one
length ($VEC\_LEN$), which `dim_k` already carries with no information
lost (sec. 3.2, 3.3).

## 3. Opcode Definitions

### 3.1 `OP_GEMM = 0x01` — routes to the Photonic Tensor Complex

The direct instruction-level counterpart of `compiler/tiler.py`'s
`PhotonicTiler` + `compiler/packer.py`'s `DMAPacker` output: `a_ptr` /
`b_ptr` are the `A` (activations) and `B` (weights) matrices, `dst_ptr` is
`Y`, `dim_k = K` (the reduction depth — sec. 2's callout on $M$/$N$/$N_{tile}$
not yet having a field to travel in)
([`05_photonic_memory_dataflow.md`](05_photonic_memory_dataflow.md) sec. 5's
design point). Dispatches to `gcb_tensor_memory_engine` via
`mem_cfg_start` and the `mem_a_wr_*` / `mem_b_wr_*` DMA ports
(`gcb-wdm-transceiver`); `qam_result` / `qam_result_valid` is the engine's
own output stream, consumed per sec. 3.2 or drained to `dst_ptr`.

### 3.2 `OP_SOFTMAX = 0x02` — routes to the inline Vortex Vector Unit

Maps onto `gcb_inline_vector_unit.sv`'s FSM
([`07_inline_vector_softmax.md`](07_inline_vector_softmax.md) sec. 3):
`a_ptr` is the row to normalize, `dst_ptr` the finished activations,
`dim_k = VEC_LEN`; `b_ptr` is unused (Softmax is unary).

`a_ptr` is deliberately **not always a memory read**. Doc 07's entire
point is that an `OP_GEMM` immediately followed by an `OP_SOFTMAX` over that
same GEMM's output must **not** round-trip GDDR7 (sec. 1's quantified 4.295
GB / 2.68 s tax). The dispatcher recognizes this exact adjacency —
`OP_SOFTMAX.a_ptr == (the immediately preceding OP_GEMM's) dst_ptr` — and
wires `qam_result` / `qam_result_valid` straight into
`gcb_inline_vector_unit`'s `core_result` / `core_result_valid` ports (doc 07
sec. 2's staging SRAM), never touching GDDR7 for that value. `a_ptr`
still names the *logical* value (needed when the two opcodes are **not**
adjacent — a normalization run on data that genuinely does live in GDDR7 is
a legal, if slower, program), but the fused case is what a compiler
targeting this ISA should always try to emit for attention Softmax.

### 3.3 `OP_SCALE_DIAG = 0x03` — element-wise scale, executed as a matmul, on the Photonic array

**The identity.** Element-wise scaling of a length-$N$ vector $v$ by a
length-$N$ scale $s$ — $y_i = v_i \cdot s_i$ — is exactly matrix-vector
multiplication by a diagonal matrix:

$$y = \mathrm{diag}(s) \cdot v, \qquad \mathrm{diag}(s)_{ij} = \begin{cases} s_i & i=j \\ 0 & i \ne j\end{cases}$$

This is a real mathematical equivalence, not a trick played on the ISA:
$\mathrm{diag}(s)$ is **never materialized** in memory (that would cost
$O(N^2)$ storage for $O(N)$ information — exactly the failure mode this
opcode avoids). `a_ptr` / `b_ptr` are $v$ and $s$, two length-$N$
vectors — the *identical* memory footprint a native element-wise-multiply
instruction would need. `dim_k = VEC\_LEN` (sec. 2). What changes is which
physical hardware executes it and how.

**Mapping onto the existing 16x16 PE grid — no new distribution RTL.**
`gcb_tensor_broadcast_fabric.sv` wires core $(r,c)$ (flat index
$r \cdot 16 + c$) to `a_row_vec[r]` (row-broadcast) and `b_col_vec[c]`
(column-broadcast). Load $v$'s elements into the row vectors and $s$'s
elements into the column vectors, one $\text{GRID\_DIM}=16$-wide chunk at a
time: core $(r,c)$ computes $v_r \cdot s_c$. **Only the 16 cores where
$r = c$** — the true diagonal of the PE grid, flat indices
$\{0, 17, 34, \ldots, 255\}$ — compute a term anyone wants
($v_r \cdot s_r$); the other 240 cores compute real but useless cross
terms $v_r s_c,\ r \ne c$, simply never read. Each active core reduces over
$K{=}1$ (one real element, not the full $K_{MAX}{=}16$) — for free, reusing
`gcb_qam_datapath_top`'s existing `k_len` input and `lane_active` masking
(`rtl/gcb_qam_datapath_top.sv`: `lane_active[e] = (e < k_len)`), the same
mechanism that already handles a partial final $K$-tile in an ordinary
`OP_GEMM`. **No new hardware — the physical optical multiply cores, the
broadcast wiring, and the $K$-masking are all reused completely unchanged.**
What's new is only how the SRAM controller is *driven*: stream $v$'s and
$s$'s elements as a length-16 diagonal load instead of a dense $N_{tile}$
tile.

**What "$O(1)$" actually means here, precisely.** Not "independent of
$N$" — a length-$N$ vector inescapably needs $N$ elements touched
somewhere. What is $O(1)$: **the latency of one beat**, the same
fixed-latency parallel dot product an `OP_GEMM` beat already costs,
applied to a **fixed-size** 16-element chunk — never the
$K_{STEPS} \times N_{SUBTILES} \times M_{BANDS} \times N_{PASSES}$ nested
loop a real GEMM needs (sec. 3.1), because there is exactly one chunk, one
beat, no tiling structure to iterate. Scaling a full length-$N$ vector is
$\lceil N/16 \rceil$ such $O(1)$ beats — linear in $N$ with a constant
factor, not literally $N$-independent, but each unit of work is the
*cheapest and most direct* op this hardware has, not a serial digital sweep.

**Quantified, $N=4096$** (`06_70B_transformer_workload_trace.md`'s own
prefill scale):

| approach | work done | beats |
|---|---:|---:|
| naive: materialize $\mathrm{diag}(s)$, dense $N{\times}N$ GEMM against $v$ | $N^2 = 16{,}777{,}216$ MACs, of which $N=4{,}096$ are useful ($4096\times$ waste) | not evaluated — $N_{TOTAL}{=}1$ output column does not tile onto a 16-wide grid at all |
| `OP_SCALE_DIAG`, diagonal PEs only (this section, **available today**) | $N = 4{,}096$ useful MACs, zero waste | $\lceil 4096/16 \rceil = \mathbf{256}$ |
| *(future, sec. 6)* per-core-unique operand delivery, all 256 PEs useful | $N = 4{,}096$ useful MACs | $\lceil 4096/256 \rceil = 16$ |

The naive row is not just wasteful, it is **structurally the wrong shape**
for this hardware — a matrix-*vector* product ($N_{TOTAL}{=}1$) does not
tile onto a $\text{GRID\_DIM}{=}16$-wide output the way a matrix-*matrix*
product does (`compiler/tiler.py`'s own `N_TILE % GRID_DIM == 0`
elaboration-guard-equivalent would reject it). `OP_SCALE_DIAG` is not a
minor tiling optimization of the dense path; it is the only mapping of this
operation onto this array that is dimensionally sound at all.

## 4. Standard Operand Footprint

Every opcode uses the identical three-pointer, one-dimension shape (sec.
2); only the *meaning* of each field is opcode-defined:

| opcode | `a_ptr` | `b_ptr` | `dst_ptr` | `dim_k` |
|---|---|---|---|---|
| `OP_GEMM` | $A$ (activations) | $B$ (weights) | $Y$ | $K$ (sec. 2: $M$/$N$/$N_{tile}$ have no field yet) |
| `OP_SOFTMAX` | row to normalize (sec. 3.2: may be fused, not a real read) | unused | normalized row | $VEC\_LEN$ |
| `OP_SCALE_DIAG` | $v$ | $s$ (the diagonal) | $y$ | $VEC\_LEN$ |

## 5. From `HybridPartitioner` Tags to Opcodes

`compiler/partitioner.py`'s existing `ExecutionTarget` tagging maps onto
this opcode set directly, no new partitioner logic needed for the two
opcodes it already anticipates:

| `HybridPartitioner` tag | node examples | opcode |
|---|---|---|
| `PHOTONIC` | `nn.Linear`, `F.linear`, `matmul` against a parameter | `OP_GEMM` |
| `VORTEX` | `F.softmax` | `OP_SOFTMAX` |
| `VORTEX` (today) | `operator.mul` between two activations | *(stays Vortex — no diagonal structure to exploit)* |

`OP_SCALE_DIAG` is a natural, not-yet-implemented refinement of that last
row: `HybridPartitioner._has_static_operand` already distinguishes a
matmul against a stored parameter from a matmul between two activations
(`compiler/partitioner.py` — the disambiguation attention's own
`torch.matmul` needed, proved by the `ToyAttentionScore` verification
block in that same module). The identical check applies to `operator.mul`
— RMSNorm's
own final step, $y = (x / \mathrm{rms}(x)) \cdot \mathrm{weight}$, multiplies
a dynamic activation by a **stored parameter** (`weight`), not another
activation — exactly the shape `OP_SCALE_DIAG` targets. Wiring this up is
future `compiler/partitioner.py` work, not done here; RMSNorm's own inline
handoff was already named out of scope in doc 07 sec. 5, and this section
is the concrete mechanism that would carry it out.

## 6. Explicitly Out of Scope

- **Addressing above 4 GiB per pointer** (sec. 2) — whether `a_ptr` /
  `b_ptr` / `dst_ptr` are flat GDDR7 addresses needing a segmented/windowed
  scheme, or offsets into smaller per-tensor allocations that make the
  question moot, is not decided anywhere in this repo yet.
- **Carrying `OP_GEMM`'s $M$, $N$, and $N_{tile}$** (sec. 2) — `dim_k`
  covers $K$ only; how the other three shape parameters reach the
  Photonic Tensor Complex under this 128-bit format is not decided.
- Per-core-unique operand delivery for `OP_SCALE_DIAG` (sec. 3.3's "future"
  row, 16 beats instead of 256 for $N{=}4096$) — needs new SRAM-controller
  addressing/muxing, not just a new driving pattern over existing wiring;
  a real RTL task, not designed here.
- Updating `compiler/partitioner.py` to actually emit `OP_SCALE_DIAG` for
  RMSNorm-shaped `operator.mul` nodes (sec. 5) — the routing rule is
  identified, not implemented.
- Actually routing a decoded opcode to an engine.
  `rtl/gcb_opcode_dispatcher.sv` (`gcb-wdm-transceiver`) exists and is
  formally verified (sec. 3's field layout is that module exactly, not a
  forward-looking description of one) — but it only exposes
  `decoded_opcode` / `ptr_a` / `ptr_b` / `ptr_dst` / `dim_k` as discrete
  signals (sec. 1's Dependency Inversion point: decode and route are
  separate concerns). Nothing yet reads `decoded_opcode` and actually
  steers a transaction at `gcb_tensor_memory_engine` or
  `gcb_inline_vector_unit`.
- Any opcode beyond the three defined here (control flow, reductions,
  attention's own $QK^T$/$\mathrm{Attn}{\times}V$ dynamic matmuls, which
  stay on Vortex per doc 06 sec. 2 but have no dedicated opcode yet).

## Related

- [`06_70B_transformer_workload_trace.md`](06_70B_transformer_workload_trace.md)
  — the `PHOTONIC`/`VORTEX` partitioning doctrine this bus routes against.
- [`07_inline_vector_softmax.md`](07_inline_vector_softmax.md) — the
  inline handoff `OP_SOFTMAX`'s fused-`a_ptr` case (sec. 3.2) implements
  at the ISA level.
- `compiler/partitioner.py`, `compiler/tiler.py`, `compiler/packer.py`
  (`gcb-python-orchestrator`) — `OP_GEMM`'s direct software counterpart
  (sec. 3.1), and `HybridPartitioner`'s existing tagging (sec. 5).
- `rtl/gcb_tensor_broadcast_fabric.sv`, `rtl/gcb_qam_datapath_top.sv`
  (`gcb-wdm-transceiver`) — the row/column broadcast wiring and `k_len`
  masking `OP_SCALE_DIAG` sec. 3.3 reuses unchanged.
- `rtl/gcb_opcode_dispatcher.sv` and `tb/tb_opcode_dispatcher.sv`
  (`gcb-wdm-transceiver`) — sec. 2's bus layout is that module's actual,
  formally-verified field decode, not a conceptual description; renamed
  from an earlier draft's name that collided with
  [`04_ai_protocols_and_blue_wording.md`](04_ai_protocols_and_blue_wording.md)'s
  PGB Triad boundary invariant.
