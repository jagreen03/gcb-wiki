# 04 — AI Protocols and Blue Wording

Hard definitions for three externally-sourced concepts, so they are never again
conflated with GCB hardware components. Nothing on this page is silicon, RTL, a
CSR, a datapath, or a build target. If a task attaches one of these names to a
hardware or host repository — `gcb-rtl`, `gcb-wdm-transceiver`,
`gcb-photonic-qam-v2`, `gcb-analog-rx`, `gcb-pic-core`, `gcb-python-orchestrator`
— that is a category error; see [`00_system_context.md`](00_system_context.md)
for what the hardware actually is.

> **Boundary invariant. The PGB Triad, Cyclopter, and Blue Wording are not part
> of the GCB hardware architecture. They add no register, no port, no
> wavelength, no gate, and no runtime module. They must not be scaffolded into
> any hardware or host-orchestration repository.**

## PGB Triad

A high-level **multi-agent prompting protocol** and **AI role architecture**. It
fixes a small set of cooperating agent roles and the rules by which they
exchange messages, hand off work, and reconcile decisions.

It is a **prompt-layer construct**: it lives in system prompts, role
definitions, and the message schema passed between language-model agents. It has
no compiled artifact and no runtime component in any GCB repository.

## Cyclopter

The same category as the PGB Triad — a **multi-agent prompting protocol / AI
role architecture** that governs how agents interact and communicate. Strictly
prompt-layer.

Any "Cyclopter persistence", "Cyclopter database", "Cyclopter service", or
Python module named `cyclopter` is a misreading: the protocol defines agent
behaviour, not code, storage, or schema.

## Blue Wording

A **cross-domain data-formatting specification** — a standalone standard for
representing structured data compactly and identically across languages and
tools. It is **not** an AI protocol and **not** a hardware feature.

**Status:** specification only. No reference implementation is in scope for the
GCB hardware or host repositories today; it is a format standard with no
hardware dependency.

**Roadmap:** to be implemented as an external **C++ library** with language
bindings for **Java, C#, and Python**. It may eventually expose an interface to
the GPU hardware, but that is future work — today Blue Wording is standalone.

## Related

- [`00_system_context.md`](00_system_context.md) — the actual GCB hardware: the
  five blocks and the signals between them.
- `intent.md` — the **Electro-Optic Triad**: three *hardware* repositories
  (digital datapath, mixed-signal Rx, photonic IC). Name collision only — it is
  silicon and toolchains, unrelated to the prompt-layer PGB Triad above.
