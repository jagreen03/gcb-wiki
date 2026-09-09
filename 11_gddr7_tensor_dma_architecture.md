# GDDR7 Tensor-Operand DMA — Architecture & Trade Study

**Level:** L1 — the GDDR7 -> Engine-Local SRAM load path for the Photonic
Tensor Complex.

This note specifies the DMA engine that consumes the 48-bit effective-address
(EA) sideband from `gcb_tensor_command_wiring` and drives the A and B host write
channels of `gcb_tensor_memory_engine` / `gcb_tensor_sram_controller`. It is the
TKT-008 deliverable and answers all ten of that ticket's Green-Target criteria.
No RTL here — the RTL is a separate follow-on.

Companion docs: `05_photonic_memory_dataflow.md` (the bandwidth / residency
model this builds on), `08_instruction_set_architecture.md` (the EA / pointer
contract), the RTL headers of `gcb_tensor_sram_controller.sv` (the structured
address math) and `gcb_tensor_command_wiring.sv` (the sideband).

---

## 0. Fixed quantities

Geometry (default build; every figure below is parameterised on these, none is
hard-coded in the DMA):

| Symbol | Value | Meaning |
|---|---|---|
| `GRID_DIM` | 16 | PE grid dim; A rows per band, B cols per sub-tile |
| `K_MAX` | 16 | contraction elements per optical beat |
| `OPERAND_BITS` | 4 (INT4); 8 (INT8) | element width |
| `VEC_BYTES` | `K_MAX * OPERAND_BITS / 8` = 8 (INT4), 16 (INT8) | one write-beat payload |
| `K_STEPS` | `K_TOTAL / K_MAX` = 256 | beats along K per operand row/col |
| `N_TILE` | 1024 | resident B-tile width |
| `N_SUBTILES` | `N_TILE / GRID_DIM` = 64 | |
| `M_BANDS` | `M_TOTAL / GRID_DIM` = 256 | A bands per pass |
| `N_PASSES` | `N_TOTAL / N_TILE` = 4 | outer passes; A re-streamed each |
| fabric clock | 2 GHz (0.5 ns) | `05` sec. 3 |

Derived data sizes:

* **A band** = `GRID_DIM * K_STEPS * VEC_BYTES` = 16 x 256 x 8 = **32 KiB** (INT4).
* **B tile** = `N_TILE  * K_STEPS * VEC_BYTES` = 1024 x 256 x 8 = **2 MiB** (INT4).
* Row stride (one matrix row/col of K values) = `K_STEPS * VEC_BYTES` = **2048 B** (INT4) — exactly one GDDR7 page.

Residency windows (the prefetch deadlines), from `gcb_tensor_sram_controller`'s
nested `k_step -> n_sub_idx -> m_band_idx -> pass_idx` loop at 2 GHz:

* **A band residency** = `N_SUBTILES * K_STEPS` = 16 384 cyc = **8.192 us**.
* **B pass residency** = `M_BANDS * N_SUBTILES * K_STEPS` = 4 194 304 cyc = **2.097 ms**.
* Whole `4096^3` GEMM = `N_PASSES` x pass residency ~= **8.39 ms** (~2^23 ns).

Assumed GDDR7 read interface (PHY/controller out of scope, sec. 11):

| Parameter | Value |
|---|---|
| channel width | 32-bit (one dedicated tensor channel) |
| per-pin rate | 32 Gb/s (PAM3) |
| peak | 128 GB/s |
| sustained, long sequential, good row locality | **~90 GB/s** (~70%) |
| burst | BL16 = 64 B, BL32 = 128 B |
| `tRCD` / `tCL` / `tRP` | ~14 / ~15 / ~14 ns |
| page | 2 KiB; banks | 32 (8 groups x 4) |

---

## 1. EA -> GDDR7 byte address (criterion 1)

`gcb_tensor_command_wiring` latches `ea_a`, `ea_b`, `ea_dst` (48-bit) at
`ea_valid`. Each is already `BASE[role] + zero_extend(instr_offset[31:0])` (the
BPR result, `08` sec. "Pointer range … Resolved"). The DMA adds **only** the
structured `(band|pass, r|c, k)` offset — it never re-applies the instruction
offset, and `gcb_tensor_sram_controller` never adds either. One translation,
here.

Matrix index (from the controller header):

```
A:  matrix_row = a_load_band * GRID_DIM + r          r  in [0, GRID_DIM)
B:  matrix_col = b_load_pass * N_TILE   + c          c  in [0, N_TILE)
    K element  = k * K_MAX                           k  in [0, K_STEPS)
```

Byte address (layout contract, sec. 2):

```
ROW_STRIDE = K_STEPS * VEC_BYTES                      # 2048 B (INT4)

A_addr(band, r, k) = ea_a + (a_load_band*GRID_DIM + r) * ROW_STRIDE + k*VEC_BYTES
B_addr(pass, c, k) = ea_b + (b_load_pass*N_TILE   + c) * ROW_STRIDE + k*VEC_BYTES
```

### Worked examples (INT4, defaults)

**A beat** — `ea_a = 0x0000_0005_0000_0000` (20 GiB), `band = 3`, `r = 5`, `k = 100`:

```
matrix_row = 3*16 + 5                 = 53
A_addr     = 0x000500000000 + 53*2048 + 100*8
           = 0x000500000000 + 0x1A800 + 0x320
           = 0x0005_0001_AB20
```

**B beat** — `ea_b = 0x0000_0007_1000_0000`, `pass = 2`, `c = 300`, `k = 7`:

```
matrix_col = 2*1024 + 300             = 2348
B_addr     = 0x000710000000 + 2348*2048 + 7*8
           = 0x000710000000 + 0x496000 + 0x38
           = 0x0007_1049_6038
```

INT8: `VEC_BYTES = 16`, `ROW_STRIDE = 4096 B`, A band = 64 KiB, B tile = 4 MiB —
every formula above scales, nothing in the DMA changes but the `VEC_BYTES` CSR.

---

## 2. Operand DRAM layout contract (criterion 2)

The DMA does **closed-form** addressing (sec. 6), so the host/compiler
(`compiler/packer.py` `DMAPacker`) must lay operands out to match:

| Operand | Order in DRAM | Contiguous run | Region |
|---|---|---|---|
| **A** (activations, `M x K`) | **row-major, K-contiguous**: element `(matrix_row, k)` at `ea_a + matrix_row*ROW_STRIDE + k*VEC_BYTES` | one matrix row's `K_STEPS` beats = `ROW_STRIDE` (2048 B, INT4) = 1 page | a band = `GRID_DIM` consecutive rows = 32 KiB contiguous |
| **B** (weights, `K x N`) | **stored transposed — N-major, K-contiguous** (`B^T[N][K]`): element `(matrix_col, k)` at `ea_b + matrix_col*ROW_STRIDE + k*VEC_BYTES` | one matrix column's K beats = `ROW_STRIDE` = 1 page | a tile = `N_TILE` consecutive columns = 2 MiB contiguous |

Why B transposed: the resident tile is consumed column-by-column, K innermost.
If B were left K-major (`B[K][N]`), a column's K beats would be strided by
`N_TOTAL*VEC_BYTES` — one GDDR7 page activation *per beat*, ~256x the row
activations. N-major makes each column one contiguous page. This is a contract,
not a preference: a K-major B is rejected for v1 (a gather mode is deferred,
sec. 7).

`OPERAND_BITS in {4, 8}` only scales `VEC_BYTES` / `ROW_STRIDE`. `dst` (results)
uses `ea_dst` but its write-back path is a **separate engine** — not this DMA
(`05`'s "4 GB/s write" budget is that path, out of scope here).

---

## 3. Alignment strategy (criterion 3)

**Decision: the tensor base (`ea_a` / `ea_b`) must be 64 B aligned — mandatory,
allocator-enforced. 2 KiB (page) alignment is a documented performance
recommendation, not a correctness requirement.**

* With a 64 B-aligned base, every beat address is a multiple of `VEC_BYTES` and
  every row start is `ROW_STRIDE`-aligned (2048 B) — i.e. already page-aligned
  and BL32-aligned. No head/tail sub-burst logic in the DMA on the load path.
* If the base is only 64 B-aligned but *not* page-aligned, a band/tile still
  reads correctly; each matrix row simply straddles a page boundary, costing one
  extra `tRCD` (~14 ns) per row. Over a pass: `M_BANDS*GRID_DIM` rows x 14 ns ~=
  57 us out of 2.097 ms (**2.7%**), and A's prefetch has 22x margin (sec. 6), so
  it never causes a stall — hence "recommended, not required".
* **Rejected: arbitrary byte alignment with head/tail sub-burst + byte-rotate.**
  It adds a shifter/mask datapath and 2 partial bursts per region for <0.1%
  bandwidth on an already 20x-over-provisioned path. Not worth the gates.
* Enforcement: the BPR programming agent / allocator aligns; the DMA asserts
  `dma_cfg_err` (sec. 9) if `ea_a[5:0] != 0` or `ea_b[5:0] != 0` at `ea_valid`
  and refuses to start.

---

## 4. Burst coalescing & DRAM scheduling (criterion 4)

**Coalescing rule: along the innermost contiguous dimension (`k`), pack write
beats into GDDR7 bursts of BL32 (128 B = 16 beats) when the remaining run is
>= 128 B and BL32-aligned, else BL16 (64 B = 8 beats).**

At INT4 defaults a matrix row/column is `ROW_STRIDE` = 2048 B = **16 x BL32**,
zero remainder. So:

* **A band load** = `GRID_DIM` rows x 16 BL32 = **256 bursts**, in ascending
  `(r, k)`.
* **B tile load** = `N_TILE` cols x 16 BL32 = **16 384 bursts**, ascending
  `(c, k)`.

**DRAM scheduling:**

* One matrix row/column == one page. The DMA opens the page, streams its 16
  BL32 bursts back-to-back into the open row (no per-burst `tRCD`), closes,
  advances to the next `r`/`c`.
* **Bank-group interleave:** consecutive `r`/`c` map to consecutive bank groups
  (`bg = r mod 8`). The DMA runs an **8-deep activate pipeline** — issue
  `ACT` for row `r+1..r+8` while streaming row `r` — so `tRCD` is fully hidden
  on the sustained path; only the first row of a band/tile pays it.
* **Strictly ascending** `(r,k)` / `(c,k)` — matches the controller's write-port
  expectations and keeps the address stream monotone for row-buffer reuse.
* Write beats to `a_wr_*` / `b_wr_*` are emitted one per cycle in the same
  order, through a Gray-pointer CDC FIFO into the 2 GHz fabric domain (sec. 10).

---

## 5. (folded into 4)

---

## 6. Latency & throughput model — the no-starve proof (criterion 5)

Model: `t_load = t_coldstart + bytes / BW_sustained`, with
`t_coldstart = tRCD + tCL` ~= 30 ns (first page of the region; subsequent pages
hidden by the activate pipeline, sec. 4).

### A prefetch vs the 8.192 us band deadline

`gcb_tensor_sram_controller` issues the next-A-band request at `at_band_start`
of the current band; it must land before the *next* band boundary — exactly one
band residency of lead.

```
t_load(A) = 30 ns + 32 KiB / 90 GB/s = 30 ns + 364 ns = 0.394 us
deadline  = 8.192 us
margin    = 20.8x
```

Even at a pathological 10 GB/s sustained: `30 ns + 3.28 us = 3.3 us < 8.192 us`
(2.5x). **A never starves the array.**

### B prefetch vs the 2.097 ms pass deadline

Requested at `at_pass_start`, due before the next pass boundary:

```
t_load(B) = 30 ns + 2 MiB / 90 GB/s = 30 ns + 23.3 us = 23.3 us
deadline  = 2097 us
margin    = 90x
```

### Cold start (ST_PRIME)

Band 0 + tile 0 must both land before `ST_RUN`. B dominates: ~23.3 us. This is a
one-time latency *before* the sequence clock starts — no deadline — and is
0.28% of the 8.39 ms GEMM.

### Aggregate GDDR7 demand (cross-check against `05`)

A: re-streamed `N_PASSES` x = 8 MiB x 4 = 32 MiB over 8.39 ms = **3.8 GB/s**.
B: read once ever = 8 MiB over 8.39 ms = **0.95 GB/s**.
Combined **~4.8 GB/s read** vs. `05`'s "5 GB/s read" line and the ~90 GB/s
channel — **~5% channel occupancy**. The design is bandwidth-trivial; the only
real question was latency vs. the ping-pong deadline, and A clears it 20x over.

**Constraint that must hold:** GDDR7 sustained read >= ~10 GB/s and cold-page
latency <= ~1 us. Both are ~10x inside a single commodity GDDR7 channel's
envelope.

---

## 7. Configuration / descriptor interface (criterion 6)

**v1 is descriptor-free — closed-form addressing.** Per GEMM, latched at
`ea_valid`:

| Field | Width | Source |
|---|---|---|
| `ea_a`, `ea_b`, `ea_dst` | 48 | sideband |
| `dim_k` | 16 | sideband (validates `K_STEPS = dim_k / K_MAX`) |

CSR block (set once per soft-config build; mostly mirrors the controller's
compile params so a parameterised bitstream still self-describes):

```
DMA_VEC_BYTES     (from OPERAND_BITS: 8 or 16)
DMA_ROW_STRIDE    (= K_STEPS * VEC_BYTES; redundant, checked)
DMA_GRID_DIM, DMA_N_TILE, DMA_M_BANDS, DMA_N_PASSES
DMA_B_LAYOUT      (0 = N-major/transposed [only mode in v1]; 1 = reserved)
DMA_CTRL          (EN, ABORT)
DMA_STATUS        (RO: RUNNING, A_BUSY, B_BUSY, UNDERRUN, ERR, CFG_ERR)
DMA_IRQ_EN        (UNDERRUN, ERR)
```

At runtime the DMA takes `a_load_band` / `b_load_pass` from the controller,
computes the region base by the sec. 1 formula, and streams. **Topology lives in
CSR + the closed form — never in a hard-coded burst/stride table**, which is
what keeps it from fracturing when `N_TILE`, precision, or `M/N/K` change.

**Deferred (v2): an optional 32-byte descriptor ring** for gather / strided /
batched operands that break the dense contract — format reusable from
`gcb-spec/docs/streaming_dma_architecture.md` (`base_addr[47:0]`,
`elem_log2_bytes`, inner/outer `extent`+`stride`, `flags`). Out of scope for v1.

---

## 8. A / B channel arbitration (criterion 7)

**One shared GDDR7 read port** (aggregate demand ~4.8 GB/s on a ~90 GB/s
channel — a second port is pure waste).

**Policy: strict priority to A; B is preemptible at DRAM-page boundaries.**

* A's deadline is 8.192 us and A requests arrive 256x more often than B's, but
  an A band is tiny (0.39 us) and a B tile is large (23 us). If B held the port
  non-preemptibly, a B tile in flight could delay an A band by up to 23 us >
  A's deadline -> stall.
* On `a_load_req` rising: the DMA finishes the **current B page** (<= 16 BL32
  bursts, ~1.8 us at 90 GB/s), then services the **entire** A band (0.39 us),
  then resumes B from the next page.
* Worst-case A latency = drain current B page + A band = **~2.2 us << 8.192 us**
  (3.7x margin, on top of sec. 6's 20x).
* B is set back by `M_BANDS` A-band interruptions per pass = 256 x 0.39 us ~=
  **100 us** out of the 2.097 ms pass -> B still lands with ~20x margin.
* **Page-boundary preemption, not beat-level:** resuming B mid-page would cost a
  re-activate (`tRP + tRCD` ~= 28 ns); resuming at a page boundary costs
  nothing, and A's margin is large enough that waiting <= 1.8 us for the page to
  drain is free. Simpler control, no partial-burst state.
* `a_load_done` / `b_load_done` are pulsed when the final `(r|c, k)` write beat
  of that region has been accepted on `a_wr_valid` / `b_wr_valid` — exactly what
  the controller's `ST_PRIME` / `ST_RUN` prefetch logic waits on.

---

## 9. Underrun & error path (criterion 8)

`gcb_tensor_sram_controller` already stalls (`sram_valid` low, counters held) if
`a_rdy_q` / `b_rdy_q` is unset at a boundary. The DMA adds:

| Signal | Meaning | Effect |
|---|---|---|
| `DMA_STATUS.UNDERRUN` (sticky) | `a_load_req` / `b_load_req` still high when the controller reached the boundary — the DMA missed a deadline | informational; the controller stalls until the load lands, then continues. Catches a mis-programmed base, a contended shared channel, or a PDK timing miss. Cleared by CSR. |
| `DMA_STATUS.ERR` (sticky) + IRQ | GDDR7 read error (uncorrectable ECC, timeout) | the DMA **does not pulse `*_load_done`** -> the controller stalls indefinitely -> IRQ. No silent bad data. Recovery is `DMA_CTRL.ABORT` + re-issue. |
| `DMA_STATUS.CFG_ERR` + IRQ | `ea_a[5:0] != 0` or `ea_b[5:0] != 0`, or a CSR param inconsistent with `dim_k`, at `ea_valid` | the DMA refuses to start; no GDDR7 traffic. |

Under the sec. 6 model `UNDERRUN` should never fire in a correct build; it is a
guard, not an expected condition.

---

## 10. Reuse decision — `greencoyote_streaming_dma` (criterion 9)

`gcb-rtl`'s `greencoyote_streaming_dma` feeds the **optical fabric's**
activation/weight path (`registers.yaml` 0.6.0 DMA block) — a different consumer
on a different interface. Per component:

| Component | Call | Rationale |
|---|---|---|
| `greencoyote_cs_lane_fifo` (Gray-pointer async FIFO) | **KEEP, verbatim** | Domain-agnostic CDC FIFO. This DMA also crosses its controller clock -> 2 GHz fabric at the write-beat interface; reuse unchanged. |
| `greencoyote_dma_walker` (32-B descriptor decode, stride-nest address gen) | **ADAPT — for v2 only** | The `elem_bytes = 1 << (v-1)` decode and the inner/outer stride-nest arithmetic transfer verbatim *if/when* the sec. 7 descriptor ring is added. v1's closed form needs none of it. |
| `greencoyote_dma_axi_master` (AXI4 read master, banked `ram_style="ultra"` buffers, beat/CDC handling) | **ADAPT the skeleton, replace the protocol** | The per-bank ultra-RAM buffer pattern and the CDC/beat plumbing are a good template. The AXI4 512-bit burst layer is wrong for a GDDR7 BL16/BL32 bank-group-aware interface — the burst scheduler (sec. 4), page/activate pipeline, and A/B arbiter (sec. 8) are net-new. |

Net: **1 KEEP, 2 ADAPT, 0 verbatim protocol reuse.** The GDDR7 burst engine,
row-buffer/bank model, and arbiter are new RTL.

---

## 11. Non-goals (criterion 10)

Restated so the RTL follow-on inherits the boundary:

1. The GDDR7 **PHY / memory controller / link training / refresh / QoS** — this
   spec assumes a burst-oriented read interface with the sec. 0 timing
   constants.
2. **The DMA RTL itself** — a separate ticket once this spec is accepted.
3. The **compute-stream consumer** (`core_valid` / `core_a_flat` /
   `core_b_flat` -> PE array).
4. **`dst` write-back** and the Softmax / `gcb_inline_vector_unit` GDDR7 traffic.
5. The **v2 descriptor ring** (gather / strided / batched) — sketched in sec. 7,
   deferred.
