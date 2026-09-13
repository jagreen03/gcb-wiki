import { FetchSagaRepository } from "./saga-repository.js";
import { MarkedMarkdownRenderer } from "./markdown-renderer.js";
import { MermaidDiagramRenderer } from "./mermaid-diagram-renderer.js";
import { KatexMathRenderer } from "./katex-math-renderer.js";
import { GenericDepthFilter } from "./depth-filter.js";
import { PersonaRouter } from "./persona-router.js";
import { SagaViewerApp } from "./app.js";

/**
 * Entry point. The only file allowed to construct concrete classes -
 * every other module talks to the interfaces in types.ts. Swapping an
 * implementation (a different Markdown library, a dark-mode-aware
 * Mermaid theme) means editing exactly this file.
 */
function bootstrap(): void {
  const contentEl = requireElement<HTMLElement>("#saga-content");
  const statusEl = requireElement<HTMLElement>("#saga-status");
  const selectEl = requireElement<HTMLSelectElement>("#audience-select");
  const depthButtons = document.querySelectorAll<HTMLButtonElement>("[data-depth]");

  // sagas/ is served as a sibling directory to this compiled app in the
  // published site (see build.mjs) - "../sagas/" works identically in
  // local dev (viewer/index.html opened next to ../sagas/) and in the
  // built dist/ output (sagas/ copied in as dist/sagas/, viewer at
  // dist/index.html, so "../sagas/" still resolves one level up from
  // wherever index.html is served).
  const repository = new FetchSagaRepository(resolveSagasBasePath());

  const app = new SagaViewerApp(
    repository,
    new MarkedMarkdownRenderer(),
    new MermaidDiagramRenderer(prefersDarkTheme() ? "dark" : "default"),
    new KatexMathRenderer(),
    new GenericDepthFilter(),
    contentEl,
    statusEl,
  );

  const router = new PersonaRouter(selectEl, depthButtons, {
    onSagaSelected: (meta) => void app.showSaga(meta),
    onDepthChanged: (depth) => app.setDepth(depth),
  });

  void app.start(router);
}

function resolveSagasBasePath(): string {
  // A small escape hatch for hosting this viewer at a different
  // relative depth than the default - set before this script runs:
  //   <script>window.GCB_SAGAS_BASE_PATH = "/gcb-wiki/sagas/";</script>
  const override = (window as unknown as { GCB_SAGAS_BASE_PATH?: string })
    .GCB_SAGAS_BASE_PATH;
  return override ?? "sagas/";
}

function prefersDarkTheme(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function requireElement<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Required element "${selector}" not found in the page`);
  return el;
}

bootstrap();
