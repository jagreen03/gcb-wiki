import type {
  DepthLevel,
  IDepthFilter,
  IDiagramRenderer,
  IMarkdownRenderer,
  IMathRenderer,
  ISagaRepository,
  SagaMeta,
} from "./types.js";
import { PersonaRouter } from "./persona-router.js";

/**
 * Composition root for the viewer's runtime behavior. Depends only on
 * interfaces (Dependency Inversion) - every concrete renderer or
 * repository is injected via the constructor, so any of them can be
 * swapped (a different Markdown engine, a different diagram library)
 * without touching this class.
 */
export class SagaViewerApp {
  private currentDepth: DepthLevel = "overview";

  constructor(
    private readonly repository: ISagaRepository,
    private readonly markdownRenderer: IMarkdownRenderer,
    private readonly diagramRenderer: IDiagramRenderer,
    private readonly mathRenderer: IMathRenderer,
    private readonly depthFilter: IDepthFilter,
    private readonly contentEl: HTMLElement,
    private readonly statusEl: HTMLElement,
  ) {}

  async start(router: PersonaRouter): Promise<void> {
    try {
      const sagas = await this.repository.listSagas();
      router.initialize(sagas);
    } catch (err) {
      this.showError(err);
    }
  }

  /** Callback target for PersonaRouter - fetch and render the chosen saga. */
  async showSaga(meta: SagaMeta): Promise<void> {
    this.setStatus(`Loading "${meta.audience}"…`);
    try {
      const content = await this.repository.loadSaga(meta);
      const html = this.markdownRenderer.render(content.markdown);
      this.contentEl.innerHTML = html;
      this.mathRenderer.renderAll(this.contentEl);
      await this.diagramRenderer.renderAll(this.contentEl);
      this.depthFilter.apply(this.contentEl, this.currentDepth);
      this.setStatus("");
      window.scrollTo({ top: 0 });
    } catch (err) {
      this.showError(err);
    }
  }

  /** Callback target for PersonaRouter - re-apply depth to the already-rendered saga. */
  setDepth(depth: DepthLevel): void {
    this.currentDepth = depth;
    if (this.contentEl.childElementCount > 0) {
      this.depthFilter.apply(this.contentEl, depth);
    }
  }

  private setStatus(message: string): void {
    this.statusEl.textContent = message;
    this.statusEl.hidden = message.length === 0;
  }

  private showError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.setStatus(`Error: ${message}`);
    console.error("[gcb-wiki viewer]", err);
  }
}
