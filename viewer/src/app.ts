import type {
  DepthLevel,
  DocumentMeta,
  IDepthFilter,
  IDiagramRenderer,
  IDocumentRepository,
  IHeadingAnchorer,
  ILinkRouter,
  IMarkdownRenderer,
  IMathRenderer,
} from "./types.js";
import { PortalRouter } from "./portal-router.js";

/**
 * Composition root for the viewer's runtime behavior. Depends only on
 * interfaces (Dependency Inversion) - every concrete renderer or
 * repository is injected via the constructor, so any of them can be
 * swapped (a different Markdown engine, a different diagram library)
 * without touching this class.
 */
export class PortalViewerApp {
  private currentDepth: DepthLevel = "executive";
  private allDocuments: readonly DocumentMeta[] = [];
  private router: PortalRouter | undefined;

  constructor(
    private readonly repository: IDocumentRepository,
    private readonly markdownRenderer: IMarkdownRenderer,
    private readonly diagramRenderer: IDiagramRenderer,
    private readonly mathRenderer: IMathRenderer,
    private readonly headingAnchorer: IHeadingAnchorer,
    private readonly linkRouter: ILinkRouter,
    private readonly depthFilter: IDepthFilter,
    private readonly contentEl: HTMLElement,
    private readonly statusEl: HTMLElement,
  ) {}

  async start(router: PortalRouter): Promise<void> {
    this.router = router;
    try {
      this.allDocuments = await this.repository.listDocuments();
      router.initialize([...this.allDocuments]);
    } catch (err) {
      this.showError(err);
    }
  }

  /** Callback target for PortalRouter - fetch and render the chosen document, optionally scrolling to a heading. */
  async showDocument(meta: DocumentMeta, fragment: string | null): Promise<void> {
    this.setStatus(`Loading "${meta.audience}"…`);
    try {
      const content = await this.repository.loadDocument(meta);
      const html = this.markdownRenderer.render(content.markdown);
      this.contentEl.innerHTML = html;
      delete this.contentEl.dataset.depthProcessed;

      this.mathRenderer.renderAll(this.contentEl);
      await this.diagramRenderer.renderAll(this.contentEl);
      this.headingAnchorer.assignAll(this.contentEl);
      this.linkRouter.wireLinks(this.contentEl, meta, this.allDocuments, (target, frag) =>
        this.router?.navigateToDocument(target.id, frag),
      );
      this.depthFilter.apply(this.contentEl, this.currentDepth);

      this.setStatus("");
      this.scrollToFragmentOrTop(fragment);
    } catch (err) {
      this.showError(err);
    }
  }

  /** Callback target for PortalRouter - re-apply depth to the already-rendered document. */
  setDepth(depth: DepthLevel): void {
    this.currentDepth = depth;
    if (this.contentEl.childElementCount > 0) {
      this.depthFilter.apply(this.contentEl, depth);
    }
  }

  private scrollToFragmentOrTop(fragment: string | null): void {
    if (fragment) {
      const target = this.contentEl.querySelector(`#${CSS.escape(fragment)}`);
      if (target) {
        target.scrollIntoView();
        return;
      }
      console.warn(`[gcb-wiki portal] fragment "#${fragment}" not found in the loaded document`);
    }
    window.scrollTo({ top: 0 });
  }

  private setStatus(message: string): void {
    this.statusEl.textContent = message;
    this.statusEl.hidden = message.length === 0;
  }

  private showError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.setStatus(`Error: ${message}`);
    console.error("[gcb-wiki portal]", err);
  }
}
