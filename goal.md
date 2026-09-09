# Project Goals

## Primary Objective

Build the GCB photonic accelerator (the "GPU" in project shorthand) into an
LLM-inference engine that **removes the memory wall and does not put another one
back**, **scales to large models** by connecting accelerator tiles into a
weight-stationary chain, stays **economically efficient** (LPDDR-class capacity,
minimal HBM, reticle reuse), and **outperforms Dwarf-Star** on tokens/s/W and
$/token.

The photonic mesh makes the MAC nearly free. That only matters if operand and
weight movement do not become the new bottleneck. Every goal below is judged by
one test:

> **Per generated token, the bytes crossing any chip boundary must scale with
> `hidden_dim`, not with model parameters.**

## Memory Architecture Doctrine

1. **Weight-stationary, always.** A weight tile is programmed once, on model
   load, into photonic / near-mesh state and multiplied for millions of tokens.
   Weights are never re-fetched from DRAM per token. A design that streams
   weights per token has kept the wall.
2. **The model is distributed, not shuttled.** A model too large for one tile is
   split across a chain of tiles at **layer boundaries** (pipeline / model
   parallel). Tile *i* permanently owns a contiguous block of layers and their
   weights.
3. **Only activations cross tiles.** Chip-to-chip traffic is one hidden-state
   vector per token per stage boundary - `O(hidden_dim)`, kilobytes, not the
   `O(hidden_dim^2)` all-reduce of tensor parallelism. **No tensor-parallel
   sharding across the chain.**
4. **The daisy chain is optical.** Activation hops ride co-packaged-optics /
   fibre links (~1 pJ/bit, >100 Gb/s/lane) in a linear or ring topology. An
   electrical-SerDes chain (PCIe / NVLink / Ethernet) would re-introduce the
   wall; GCB's photonics is the structural advantage here.
5. **KV cache is local and never travels.** Each tile stores the KV cache for
   the layers it owns. Local DRAM is sized for **target context x batch**, not
   for weights. Grouped-query attention and KV quantization cut this 4-8x.
6. **Cheap capacity, scarce bandwidth.** Because weights are stationary, the
   DRAM tier needs *capacity* (KV + model-load staging), not weight bandwidth.
   Prefer **LPDDR5X** over HBM (~1/3 the $/GB); reserve HBM only where KV
   bandwidth at max context demands it.
7. **Amortise with non-volatility.** Evaluate PCM / MRAM / floating-gate biasing
   of the modulators so weight state survives power events and costs ~0 J/token.
   Write endurance only has to outlast model swaps, not token steps.

## Memory Hierarchy (per tile, hot -> cold)

| tier | holds | per-token cost |
|---|---|---|
| photonic weight state (MZI / ring / PCM) | one resident weight block | 0 fetch - programmed on load |
| on-die SRAM (MB) | bit-plane Tx buffers (see [`13_bitplane_tx_mapper.md`](13_bitplane_tx_mapper.md)), K<=16 partial-sum accumulators, KV line buffers | on-die only |
| local LPDDR5X (a slice of HBM only if KV BW forces it) | KV cache for this tile's layers, model-load staging, weight spill | KV read/write only |
| host / CXL / NVMe pool | full model store, model swap, paged-KV offload | load & eviction only - never per token |

## Scaling: the Daisy Chain

- Tiles hold `total_layers / N` layers each; `N` grows to fit the model. A 70B
  INT4 model (~35 GB) across `N` tiles needs ~`35/N` GB of resident weight state
  per tile.
- Throughput is set by the slowest stage; latency is `N` stage-hops deep - hide
  it with micro-batching / continuous batching, not with a fatter interconnect.
- Pipeline bubbles are the risk. Target <10 % bubble overhead at the serving
  batch size; measure it on a 2-4 tile prototype before committing topology.
- A ring topology lets the chain also carry the residual / embedding return path
  without a separate fabric.

## The Dwarf-Star Target

Dwarf-Star is the incumbent to beat. **First task: characterise it** - vendor,
process node, die size, memory (type / capacity / bandwidth), interconnect
(type / bytes per token per hop), and its published **tokens/s, tokens/s/W and
$/token** for a fixed reference workload (proposed: Llama-3-70B, 8 k context,
batch 1 and batch 32).

GCB must-win metrics vs that baseline (fill once Dwarf-Star is characterised):

- tokens/s/W: **>= [2x] TBD**
- $/token (amortised silicon + power + DRAM): **>= [1.5x] TBD advantage**
- max resident model per node-dollar: **>= Dwarf-Star**
- per-token off-chip bytes: **`O(hidden_dim)`** - structural, must hold at any `N`

## Near-Term Goals

### 1. Prove there is no new wall
Analytic + simulation model of the bytes moved per token across every boundary
(photonic Tx feed, digital accumulate, tile -> tile, DRAM). Show weight traffic
-> 0 and tile -> tile traffic -> `O(hidden_dim)`. This gates everything else.

### 2. Prototype the optical daisy chain
2-4 tile chain, one transformer block per tile, activations over optical hops.
Measure per-hop energy (pJ/bit), pipeline bubble overhead, end-to-end tokens/s.
Build a same-size electrical-SerDes chain to quantify the photonic advantage.

### 3. Choose the weight-state technology
MZI thermal-hold vs micro-ring vs PCM vs MRAM-biased modulator. Compare
retention, drift, program time, write endurance, area and $/bit. Decide before
the tile floorplan freezes.

### 4. Physical realisation of Components 4 & 5  *(in progress)*
`gcb-analog-rx`: switched-charge Rx quantiser and kT/C budget -
`switched_charge_model.py` (done); next, a Verilog-A / SPICE model and extracted
noise figure. `gcb-pic-core`: K=16 balanced-homodyne tile layout in gdsfactory -
`layout_homodyne.py` (done); next, extract real insertion loss, phase noise and
detector capacitance. See `03_dual_mode_integration.md` for the digital top.

### 5. Cross-domain validation
Feed the measured analog + photonic figures back into the C++ DPI-C optical
model and prove the digital Rx recombiner still reconstructs exact INT16 - at
the daisy-chain scale, not just one tile.

## Research Reading

- **Memory wall, quantified:** Gholami et al., *AI and Memory Wall* (2024).
  Pope et al., *Efficiently Scaling Transformer Inference* (2022) - what is
  memory- vs compute-bound in LLM serving and how to shard.
- **Weight-stationary optics:** Shen et al., *Deep learning with coherent
  nanophotonic circuits* (Nat. Photonics 2017); Feldmann et al., *photonic
  tensor core with PCM weights* (Nature 2021); Lightmatter Envise +
  **Passage** (optical interposer for die-to-die - directly the daisy chain).
- **In-memory compute:** IBM analog-AI PCM crossbars (Nature 2023-24);
  d-Matrix DIMC; Mythic - drift / endurance lessons for the weight-state choice.
- **Contrast the dataflow bets:** Cerebras *weight-streaming* whitepaper (the
  opposite choice); Groq TSP (SRAM-resident, why scale-out needs hundreds of
  chips); Tesla Dojo tile mesh (no per-tile DRAM); SambaNova RDU 3-tier memory;
  Graphcore IPU BSP.
- **Pipeline parallelism:** GPipe (2019); PipeDream / 1F1B; Megatron-LM
  pipeline scheduling.
- **KV cache:** PagedAttention / vLLM (2023); grouped- / multi-query attention;
  KVQuant, KIVI; FlexGen offload.
- **Optical interconnect & disaggregation:** Ayar Labs TeraPHY optical I/O
  chiplet; OIF co-packaged-optics roadmap; CXL 3.0 memory pooling (fine for
  model load / cold KV, not for weights).
