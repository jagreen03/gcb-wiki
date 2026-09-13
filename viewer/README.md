# gcb-wiki stakeholder portal viewer

A small, static TypeScript/HTML client that renders
[`../lenses/`](../lenses/) (4 consolidated entry points),
[`../sagas/`](../sagas/) (8 full-depth, per-audience documents), and
[`../appendices/`](../appendices/) (shared technical/manufacturing
facts) as one browsable site: a document picker grouped by tier, a
real 3-level reading-depth toggle, live Markdown + Mermaid diagrams +
KaTeX math, deployable to GitHub Pages with zero server-side component.

## Design (why it's structured this way)

Every class implements one of the interfaces in
[`src/types.ts`](src/types.ts) and depends only on those interfaces,
never on a sibling concrete class (Dependency Inversion) — see that
file's doc-comments for the full rationale per interface:

| Interface | Implementation | Responsibility |
|---|---|---|
| `IDocumentRepository` | `FetchDocumentRepository` (`src/document-repository.ts`) | Fetch `../portal-manifest.json` and document Markdown |
| `IMarkdownRenderer` | `MarkedMarkdownRenderer` (`src/markdown-renderer.ts`) | Markdown → HTML (raw HTML, including depth-comment markers, passed through) |
| `IDiagramRenderer` | `MermaidDiagramRenderer` (`src/mermaid-diagram-renderer.ts`) | \`\`\`mermaid fences → SVG |
| `IMathRenderer` | `KatexMathRenderer` (`src/katex-math-renderer.ts`) | `$...$` / `$$...$$` → typeset math |
| `IDepthFilter` | `PortalDepthFilter` (`src/portal-depth-filter.ts`) | Apply the selected reading depth — see below |

[`src/portal-router.ts`](src/portal-router.ts) owns the document
dropdown (lenses grouped ahead of sagas via `<optgroup>`), the
depth-toggle buttons, and the URL hash (`#doc=<id>&depth=<level>`, so a
specific document + depth is directly linkable and survives a reload).
[`src/app.ts`](src/app.ts) is the orchestrator, itself only depending
on interfaces. [`src/main.ts`](src/main.ts) is the **only** file that
constructs concrete classes — the composition root. Adding a new lens
or saga needs zero code changes (edit `../portal-manifest.json` + add
the `.md` file — Open/Closed); swapping a library means writing one
new class and editing one line in `main.ts`.

### The reading-depth system, concretely

Three levels — **Executive → System → Foundry** — cumulative (System
shows Executive's content plus more; Foundry shows everything).
`PortalDepthFilter` supports two document styles without needing every
file retrofitted:

1. **Explicitly tagged** (`lenses/*.md`): wrap a section in
   `<!-- depth:executive -->` … `<!-- /depth -->` (or `system` /
   `foundry`). `marked` passes HTML comments through verbatim, so these
   survive into the DOM as real, findable markers the filter wraps into
   `<div class="depth-section" data-depth="...">` elements on first
   render, then shows/hides by comparing against the selected level.
2. **Untagged fallback** (`sagas/*.md`, written before this system
   existed): non-diagram code blocks and any "Epistemic status"
   section collapse behind a closed `<details>` at Executive, open
   otherwise — the same heuristic the original 2-level toggle used,
   now mapped onto the 3-button UI.

## Local development

```bash
cd viewer
npm install
npm run build        # tsc -> dist/assets/*.js, then build.mjs assembles dist/
npx serve dist        # or any static file server
```

Open the served URL — `dist/` is a complete, self-contained static
site (it carries its own copy of `../portal-manifest.json`,
`../lenses/*.md`, `../sagas/*.md`, and `../appendices/*.md`, so it
doesn't matter how the rest of the `gcb-wiki` repo is served). Opening
`viewer/index.html` directly, unbuilt, is **not** a supported mode —
`index.html` and `portal-manifest.json` are siblings only after the
build step assembles `dist/`.

`npm run typecheck` runs `tsc --noEmit` only, for a fast compile-error
check while editing.

## Deployment

[`../.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
builds and deploys `viewer/dist/` to GitHub Pages automatically on every
push to `main` that touches `viewer/`, `lenses/`, `sagas/`, or
`appendices/` (or via manual dispatch). **One-time setup required in
the GitHub repo itself** (this cannot be done from a commit): Settings
→ Pages → Source → "GitHub Actions". After that, pushes deploy
automatically — no further manual steps.

## Runtime dependencies (CDN, no bundler)

Loaded via `<script>`/`<link>` tags in `index.html`, pinned to exact
versions: `marked` (Markdown), `mermaid` (diagrams), `KaTeX` + its
auto-render extension (math). `package.json` only declares `typescript`
as a dev dependency — there is no runtime npm dependency and no bundler
step; the compiled output is plain ES modules the browser loads
natively.
