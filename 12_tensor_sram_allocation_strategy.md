# Engine-Local Operand SRAM — Allocation Strategy & Banking

**Level:** L1 — the on-die operand store between the GDDR7 tensor DMA
(`11_gddr7_tensor_dma_architecture.md`) and the 256-way broadcast fabric
(`gcb_tensor_broadcast_fabric`).

This note specifies how the double-buffered resident **A row-band** and
**B column-tile** that `gcb_tensor_sram_controller` owns are partitioned into
macro-sized SRAM instances, how the DMA write port and the execution-grid read
port share that storage, and a closed-form proof that the grid read port is
never stalled by the 16 GB/s DMA fill. It is the TKT-012 deliverable.

Companion docs: `05_photonic_memory_dataflow.md` (bandwidth / residency model),
`11_gddr7_tensor_dma_architecture.md` §6 (the write-beat-port limiter and the
prefetch deadlines), the RTL headers of `gcb_tensor_sram_controller.sv` and the
new `gcb_tensor_operand_sram.sv` / `gcb_sram_sp1w1r.sv`.

---

## 0. Fixed quantities

Geometry (default build; every figure below is parameterised on these, none is
hard-coded in the RTL):

| Symbol | Value | Meaning |
|---|---|---|
| `GRID_DIM` | 16 | PE grid dim; A rows per band, B cols per sub-tile slice |
| `K_MAX` | 16 | contraction elements per optical beat |
| `INT4_W` | 4 | element width (INT4 default) |
| `VEC_W` | `K_MAX * INT4_W` = 64 b (8 B) | one operand vector = one write beat / one macro word |
| `K_STEPS` | `K_TOTAL / K_MAX` = 256 | beats along K per operand row/col |
| `N_TILE` | 1024 | resident B-tile width |
| `N_SUBTILES` | `N_TILE / GRID_DIM` = 64 | GRID_DIM-wide B slices in a resident tile |
| `M_BANDS` | `M_TOTAL / GRID_DIM` = 256 | A bands per pass |
| `SRAM_BUS_W` | `2 * GRID_DIM * VEC_W` = 2048 b (256 B) | fabric read bus, one K-slice per cycle |
| fabric clock | 2 GHz (0.5 ns) | `05` §3 |

Resident capacities (single-buffered), from `05` §5/§7 and `11` §0:

* **A row-band** = `GRID_DIM * K_STEPS * VEC_W` = 16 · 256 · 8 B = **32 KiB**.
* **B column-tile** = `N_TILE * K_STEPS * VEC_W` = 1024 · 256 · 8 B = **2 MiB**.

Double-buffered (ping-pong), the engine holds **64 KiB A + 4 MiB B = 4.06 MiB**
of operand SRAM.

---

## 1. Why the behavioural model cannot ship

`gcb_tensor_sram_controller` today stores both operands in flat unpacked arrays

```
logic [VEC_W-1:0] a_mem [0:1][0:GRID_DIM-1][0:K_STEPS-1];   // 64 KiB
logic [VEC_W-1:0] b_mem [0:1][0:N_TILE-1] [0:K_STEPS-1];    // 4 MiB
```

read every cycle as `2 * GRID_DIM` = 32 independent `VEC_W` slices (an implicit
32-read-port memory) and written on a separate `always_ff`. Nothing here maps to
an SRAM compiler: a 4 MiB 32-read-port register file is not a buildable macro,
and OpenROAD / the PPA flow has no cell to place. TKT-012 replaces the storage —
**not the interface** — with a bank/lane/port structure a foundry single-port or
1W1R compiler can realise directly.

---

## 2. Access pattern (what the banking must serve)

Per `gcb_tensor_sram_controller` in `ST_RUN`, every cycle that `advancing` is
true:

* **Read (to the fabric).** `GRID_DIM` distinct A row-vectors
  `a_mem[a_bank][r][k_step]`, `r = 0..GRID_DIM-1`, all at the *same* `k_step`;
  and `GRID_DIM` distinct B column-vectors
  `b_mem[b_bank][n_sub_idx*GRID_DIM + c][k_step]`, `c = 0..GRID_DIM-1`, all at
  the same `(n_sub_idx, k_step)`. `2 * GRID_DIM` reads/cycle, one `VEC_W` each.
* **Write (from the DMA).** At most **one** `VEC_W` beat/cycle, total, across
  both operands — the arbiter's `a_wr_valid` / `b_wr_valid` are driven from one
  shared spiller and are mutually exclusive (`11` §8). The beat targets the
  **non-resident** bank (`~a_bank` / `~b_bank`) — `gcb_tensor_sram_controller`
  gates every write with `a_req_q` / `b_req_q` and addresses `~bank`.
* **Bank swap.** At a band boundary `a_bank` flips; at a pass boundary `b_bank`
  flips. The swap is gated on `a_rdy_q` / `b_rdy_q` — the load into the
  non-resident bank has fully landed — so a half-filled bank is never made
  resident.

Key structural facts the banking exploits:

1. The read touches **only** the resident bank; the write touches **only** the
   non-resident bank. In steady state they are physically disjoint.
2. The `GRID_DIM` reads on each side differ **only in the row / column lane** —
   same `k_step`, same `n_sub_idx`. Lane is therefore the natural bank split.
3. `col = n_sub_idx * GRID_DIM + c` decomposes exactly as
   `(sub-tile) * GRID_DIM + (lane)` with `lane = c = col mod GRID_DIM` and
   `sub-tile = col div GRID_DIM ∈ [0, N_SUBTILES)`.

---

## 3. Banking scheme

### 3.1 Primitive — `gcb_sram_sp1w1r`

One macro = a synchronous-write / single-read-port RAM, parameters `DW`,
`DEPTH`, `RD_REG`:

```
write : posedge clk, mem[waddr] <= wdata          when we
read  : rdata = mem[raddr]         (RD_REG = 0, async — register-file compiler)
        rdata <= mem[raddr]        (RD_REG = 1, one pipe stage — SP-SRAM macro)
```

Read-during-write to the **same address** returns the **old** contents (write-
first, no forwarding) on both `RD_REG` settings — the standard foundry 1W1R
behaviour. The RTL ships `RD_REG = 0` so cycle timing is bit-identical to the
behavioural model (the controller's existing `SRAM_LATENCY` pipe supplies the
read-data register); a synchronous-macro build flips `RD_REG = 1` and drops one
`SRAM_LATENCY` stage for the same total latency.

### 3.2 A row-band array

| | |
|---|---|
| macros | `2 (bank) × GRID_DIM (row lane)` = **32** |
| macro geometry | `DEPTH = K_STEPS` (256), `DW = VEC_W` (64 b) → **2 KiB each** |
| total | 32 · 2 KiB = **64 KiB** (32 KiB resident) |
| write | `we = a_wr_valid & a_req_q`; bank `~a_bank`; lane `a_wr_row`; addr `a_wr_kstep` |
| read | bank `a_bank`; lane `r` (all 16 in parallel); addr `k_step` |

Each lane macro carries one PE row's activation vectors for the whole K sweep.
A 2 KiB × 64 b macro is a textbook single-port compiler point.

### 3.3 B column-tile array

| | |
|---|---|
| macros | `2 (bank) × GRID_DIM (column lane)` = **32** |
| macro geometry | `DEPTH = N_SUBTILES · K_STEPS` (16384), `DW = VEC_W` (64 b) → **128 KiB each** |
| total | 32 · 128 KiB = **4 MiB** (2 MiB resident) |
| write | `we = b_wr_valid & b_req_q`; bank `~b_bank`; lane `b_wr_col[3:0]`; addr `b_wr_col[COLW-1:4]·K_STEPS + b_wr_kstep` |
| read | bank `b_bank`; lane `c` (all 16 in parallel); addr `n_sub_idx·K_STEPS + k_step` |

`COLW = clog2(N_TILE) = clog2(N_SUBTILES) + clog2(GRID_DIM)`, so the split of
`b_wr_col` into `{sub-tile, lane}` is a pure bit-slice — no arithmetic. A
128 KiB × 64 b macro is a large but ordinary SP-SRAM instance; a compiler that
caps depth at 8 K splits it into `N_SUBTILES · K_STEPS / 8192` = 2 sub-macros
with a high-address mux, transparently to this RTL.

### 3.4 Layout is a re-index, not a re-map

The physical address of a logical element is deterministic and bijective:

```
A:  a_mem[bank][r][k]           ->  macro[bank][r]        @  k
B:  b_mem[bank][col][k]         ->  macro[bank][col mod GRID_DIM]  @  (col div GRID_DIM)·K_STEPS + k
```

so the banked store holds **bit-identical contents** to the behavioural array
for every access the FSM issues — the change is invisible above `sram_rdata`.

---

## 4. Port contention & its resolution

| Case | Where | Resolution |
|---|---|---|
| Grid read vs DMA write, **steady state** | read = resident bank, write = non-resident bank | **Physically disjoint** — different macro set. No arbitration, no stall. |
| Two grid reads to one lane macro | never — one read per lane per cycle | n/a |
| Two DMA writes in one cycle | never — one shared spiller, `a_wr_valid`⊕`b_wr_valid` | n/a |
| DMA write vs grid read, **same bank, different lane** (forced / single-buffer mode) | different macro | Independent ports — both complete, no interaction. |
| DMA write vs grid read, **same bank, same lane, different address** | one macro, its 1W + 1R ports | Both complete same cycle (that is what 1W1R *is*). |
| DMA write vs grid read, **same bank, same lane, same address** | one macro word | Read returns **pre-write** data (write-first, no forwarding). Deterministic, no `X`, no corruption, no stall. |
| Bank swap with load not finished | FSM | `stalled` — `sram_valid` held low, counters frozen, stale data never served (`gcb_tensor_sram_controller` header). §5 proves this never fires under the DMA margins. |

The execution grid's read path has a **dedicated read port on every resident-bank
macro**. Nothing on the write path shares those ports. The only mechanism that
can withhold read data is the FSM `stalled` guard at a buffer swap; §5 shows the
DMA always beats that deadline.

`gcb_tensor_operand_sram` implements exactly this: `2 · GRID_DIM` macros, the
bank/lane/address decode of §3, and a `we` that is qualified by bank so the
resident bank is never written on the normal path.

---

## 5. No-stall proof — the grid read is never starved

Let one fabric cycle = `t_c` = 0.5 ns. Define, per `gcb_tensor_sram_controller`:

* band residency `R_A = N_SUBTILES · K_STEPS` cycles (A resident-bank lifetime),
* pass residency `R_B = M_BANDS · N_SUBTILES · K_STEPS` cycles (B tile lifetime),
* DMA delivered rate `≤ 1` beat / cycle into the non-resident bank (`11` §6,
  BFM-confirmed; `a_wr_valid ⊕ b_wr_valid`).

### 5.1 Read side — structural, unconditional

Every `advancing` cycle the fabric consumes `2·GRID_DIM` words. Each comes from
its own lane macro's **1R port** in the **resident** bank. That port has exactly
one client (this read) and one access per cycle. No queue, no shared arbiter, no
dependence on `we`. Therefore, *given a resident bank whose contents are valid*,
`sram_valid` is high on every `advancing` cycle by construction — the read can
physically never be blocked. The whole proof reduces to: **is the resident bank
always valid in time?**

### 5.2 A row-band — fill vs. deadline

`gcb_tensor_sram_controller` issues the next A-band request at `at_band_start`;
it must land before the next band boundary → lead time `R_A`.

```
fill(A)   = GRID_DIM · K_STEPS beats · (1 cyc/beat)      = GRID_DIM · K_STEPS cyc
deadline  = R_A = N_SUBTILES · K_STEPS cyc
margin    = R_A / fill(A) = N_SUBTILES / GRID_DIM
```

`N_TILE > GRID_DIM²` (Doc 04 tiling rule) ⇒ `N_SUBTILES = N_TILE/GRID_DIM >
GRID_DIM` ⇒ **margin > 1 always**, and `= 64/16 = 4×` at defaults. The fill is
one contiguous non-resident A bank = `GRID_DIM` lane macros × `K_STEPS` words,
written one word/cycle; the `+~58` cyc GDDR7 cold-page cost is one-time per band
and is inside the 4× headroom (`11` §6).

### 5.3 B column-tile — combined write-port occupancy

B is requested at `at_pass_start`, due before the next pass boundary. Over that
window the shared write port also carries every A-band reload of the pass:

```
fill(B)            = N_TILE · K_STEPS beats
A reloads / pass   = M_BANDS · GRID_DIM · K_STEPS beats
combined demand    = (N_TILE + M_BANDS · GRID_DIM) · K_STEPS beats
deadline           = R_B = M_BANDS · N_SUBTILES · K_STEPS cyc
occupancy          = (N_TILE + M_BANDS·GRID_DIM) / (M_BANDS·N_SUBTILES)
                   = GRID_DIM/N_SUBTILES  +  N_TILE/(M_BANDS·N_SUBTILES)
```

* Defaults (`M_BANDS=256`): `16/64 + 1024/(256·64) = 0.25 + 0.0625 = 0.3125` →
  **~3.2× combined margin**.
* TB geometry (`M_BANDS=64`, `dma_tb_top.sv`): `0.25 + 0.25 = 0.5` → **2×**.

Both `< 1` with margin ⇒ the shared 16 GB/s write port drains its whole
combined workload inside the pass, so `b_rdy_q` is set before the swap and the
`stalled` guard never trips on B.

### 5.4 Result

Read side cannot block (§5.1); both buffers are refilled with ≥ 2× margin
(§5.2–5.3); therefore `stalled` is unreachable in steady state and `sram_valid`
is high on every `ST_RUN` `advancing` cycle. This is what
`sim/cocotb/test_dma_arbiter.py::full_gemm` asserts on the real engine:
`stall_cycles == 0` over a full 2-pass GEMM (BFM-measured A margin 2.7–3.5×,
`11` §6).

### 5.5 Cold start

`ST_PRIME` fills band 0 + tile 0 before the sequence clock starts — B dominates
at `N_TILE · K_STEPS` cyc ≈ 131 µs, one-time, no deadline (~1.6 % of the 8.39 ms
GEMM). Not a steady-state concern.

---

## 6. Parameter surface

Everything sized above is a `parameter`, never a literal:

| Parameter | Module | Meaning |
|---|---|---|
| `GRID_DIM`, `K_MAX`, `INT4_W` | controller / engine | operand geometry → `VEC_W`, lane count |
| `M_TOTAL`, `N_TOTAL`, `K_TOTAL`, `N_TILE` | controller / engine | derives `K_STEPS`, `N_SUBTILES`, `M_BANDS` |
| `SRAM_LATENCY` | controller | external read-data pipe depth (kept; macros ship `RD_REG=0`) |
| `RD_REG` | `gcb_sram_sp1w1r` / `gcb_tensor_operand_sram` | 0 = async (RF compiler), 1 = registered (SP-SRAM macro) |
| `DW`, `DEPTH` | `gcb_sram_sp1w1r` | one macro's word width / depth |
| `LANES`, `SUBTILES`, `DEPTH_K` | `gcb_tensor_operand_sram` | `GRID_DIM`, `{1 | N_SUBTILES}`, `K_STEPS` |

No interface signal of `gcb_tensor_memory_engine`, `gcb_tensor_sram_controller`,
or `gcb_tensor_broadcast_fabric` changes. The `TKT-009` `dma_tb_top` elaborates
and passes unmodified.

---

## 7. Out of scope (later tickets)

1. ECC / scrubbing / redundancy-repair / power-gating on the operand SRAM.
2. `dst` / result write-back buffering.
3. OpenROAD PPA, macro-compiler selection, floorplanning of the banks.
4. The execution grid / `gcb_tensor_broadcast_fabric` internals.
5. The GDDR7 DMA itself — `TKT-009` (done), `11`.
