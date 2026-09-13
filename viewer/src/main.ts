import { FetchDocumentRepository } from "./document-repository.js";
import { MarkedMarkdownRenderer } from "./markdown-renderer.js";
import { MermaidDiagramRenderer } from "./mermaid-diagram-renderer.js";
import { KatexMathRenderer } from "./katex-math-renderer.js";
import { SlugHeadingAnchorer } from "./slug-heading-anchorer.js";
import { PortalLinkRouter } from "./portal-link-router.js";
import { PortalDepthFilter } from "./portal-depth-filter.js";
import { PortalRouter } from "./portal-router.js";
import { PortalViewerApp } from "./app.js";

/**
 * Entry point. The only file allowed to construct concrete classes -
 * every other module talks to the interfaces in types.ts. Swapping an
 * implementation (a different Markdown library, a dark-mode-aware
 * Mermaid theme) means editing exactly this file.
 */
function bootstrap(): void {
  const contentEl = requireElement<HTMLElement>("#doc-content");
  const statusEl = requireElement<HTMLElement>("#doc-status");
  const selectEl = requireElement<HTMLSelectElement>("#document-select");
  const depthButtons = document.querySelectorAll<HTMLButtonElement>("[data-depth]");

  // portal-manifest.json + lenses/, sagas/, appendices/ are all copied
  // into dist/ as siblings of dist/index.html by build.mjs - see
  // resolveBasePath()'s own doc-comment for what that implies.
  const repository = new FetchDocumentRepository(resolveBasePath());

  const app = new PortalViewerApp(
    repository,
    new MarkedMarkdownRenderer(),
    new MermaidDiagramRenderer(prefersDarkTheme() ? "dark" : "default"),
    new KatexMathRenderer(),
    new SlugHeadingAnchorer(),
    new PortalLinkRouter(),
    new PortalDepthFilter(),
    contentEl,
    statusEl,
  );

  const router = new PortalRouter(selectEl, depthButtons, {
    onDocumentSelected: (meta, fragment) => void app.showDocument(meta, fragment),
    onDepthChanged: (depth) => app.setDepth(depth),
  });

  void app.start(router);
}

function resolveBasePath(): string {
  // build.mjs assembles dist/ as one flat site root: index.html,
  // portal-manifest.json, lenses/, sagas/, and appendices/ all as
  // direct siblings - so the default is "same directory as this page",
  // i.e. no prefix. This is the only supported serving mode (build
  // first, serve dist/ - see viewer/README.md); opening viewer/
  // index.html directly, unbuilt, is not.
  //
  // Escape hatch for hosting at a different depth - set before this
  // script runs: <script>window.GCB_PORTAL_BASE_PATH = "/some/prefix/";</script>
  const override = (window as unknown as { GCB_PORTAL_BASE_PATH?: string })
    .GCB_PORTAL_BASE_PATH;
  return override ?? "";
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
