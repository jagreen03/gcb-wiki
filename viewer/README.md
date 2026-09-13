# gcb-wiki saga viewer

A small, static TypeScript/HTML client that renders
[`../sagas/`](../sagas/) — the persona-oriented narrative portal — as a
browsable site: an audience picker, a reading-depth toggle, live
Markdown + Mermaid diagrams + KaTeX math, deployable to GitHub Pages
with zero server-side component.

## Design (why it's structured this way)

Every class implements one of the interfaces in
[`src/types.ts`](src/types.ts) and depends only on those interfaces,
never on a sibling concrete class (Dependency Inversion) — see that
file's doc-comments for the full rationale per interface:

| Interface | Implementation | Responsibility |
|---|---|---|
| `ISagaRepository` | `FetchSagaRepository` (`src/saga-repository.ts`) | Fetch `manifest.json` and saga Markdown |
| `IMarkdownRenderer` | `MarkedMarkdownRenderer` (`src/markdown-renderer.ts`) | Markdown → HTML |
| `IDiagramRenderer` | `MermaidDiagramRenderer` (`src/mermaid-diagram-renderer.ts`) | \`\`\`mermaid fences → SVG |
| `IMathRenderer` | `KatexMathRenderer` (`src/katex-math-renderer.ts`) | `$...$` / `$$...$$` → typeset math |
| `IDepthFilter` | `GenericDepthFilter` (`src/depth-filter.ts`) | Collapse code blocks / "Epistemic status" sections in "Overview" mode |

[`src/persona-router.ts`](src/persona-router.ts) owns the audience
dropdown, the depth-toggle buttons, and the URL hash (so a specific
saga + depth is directly linkable and survives a reload).
[`src/app.ts`](src/app.ts) is the orchestrator, itself only depending
on interfaces. [`src/main.ts`](src/main.ts) is the **only** file that
constructs concrete classes — the composition root. Adding a new saga
needs zero code changes (edit `../sagas/manifest.json` + add the `.md`
file); swapping a library (a different Markdown engine, a different
diagram renderer) means writing one new class and editing one line in
`main.ts`.

## Local development

```bash
cd viewer
npm install
npm run build        # tsc -> dist/assets/*.js, then build.mjs assembles dist/
npx serve dist        # or any static file server
```

Open the served URL — `dist/` is a complete, self-contained static
site (it carries its own copy of `../sagas/*.md`, so it doesn't matter
how the rest of the `gcb-wiki` repo is served).

`npm run typecheck` runs `tsc --noEmit` only, for a fast compile-error
check while editing.

## Deployment

[`../.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
builds and deploys `viewer/dist/` to GitHub Pages automatically on every
push to `main` that touches `viewer/` or `sagas/` (or via manual
dispatch). **One-time setup required in the GitHub repo itself** (this
cannot be done from a commit): Settings → Pages → Source → "GitHub
Actions". After that, pushes deploy automatically — no further manual
steps.

## Runtime dependencies (CDN, no bundler)

Loaded via `<script>`/`<link>` tags in `index.html`, pinned to exact
versions: `marked` (Markdown), `mermaid` (diagrams), `KaTeX` + its
auto-render extension (math). `package.json` only declares `typescript`
as a dev dependency — there is no runtime npm dependency and no bundler
step; the compiled output is plain ES modules the browser loads
natively.
