import type { DepthLevel, DocumentMeta } from "./types.js";

export interface PortalRouterCallbacks {
  onDocumentSelected(meta: DocumentMeta): void;
  onDepthChanged(depth: DepthLevel): void;
}

const DEFAULT_DEPTH: DepthLevel = "executive";
const VALID_DEPTHS: readonly DepthLevel[] = ["executive", "system", "foundry"];

/**
 * Owns the document <select> dropdown (lenses grouped ahead of sagas
 * via <optgroup>) and the depth toggle buttons, and turns user
 * interaction into callbacks. Single Responsibility: UI wiring for
 * navigation only - never touches document content or rendering
 * directly (App composes this with the renderers).
 *
 * Also owns the URL hash (#doc=<id>&depth=<level>) so a specific
 * document + depth is directly linkable and survives a page reload.
 */
export class PortalRouter {
  private documents: DocumentMeta[] = [];
  private depth: DepthLevel = DEFAULT_DEPTH;

  constructor(
    private readonly selectEl: HTMLSelectElement,
    private readonly depthButtons: NodeListOf<HTMLButtonElement>,
    private readonly callbacks: PortalRouterCallbacks,
  ) {
    this.selectEl.addEventListener("change", () => this.handleSelectChange());
    this.depthButtons.forEach((btn) =>
      btn.addEventListener("click", () => this.handleDepthClick(btn)),
    );
    window.addEventListener("hashchange", () => this.syncFromHash());
  }

  /** Populate the dropdown (grouped by tier) and select the document named in the URL hash, or the first lens. */
  initialize(documents: DocumentMeta[]): void {
    this.documents = documents;
    this.selectEl.innerHTML = "";

    const lensGroup = this.buildOptGroup("Lenses — start here");
    const sagaGroup = this.buildOptGroup("Full-depth sagas");
    for (const doc of documents) {
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = `${doc.audience} — ${doc.oneLine}`;
      (doc.tier === "lens" ? lensGroup : sagaGroup).appendChild(opt);
    }
    if (lensGroup.childElementCount > 0) this.selectEl.appendChild(lensGroup);
    if (sagaGroup.childElementCount > 0) this.selectEl.appendChild(sagaGroup);

    this.syncFromHash();
  }

  private buildOptGroup(label: string): HTMLOptGroupElement {
    const group = document.createElement("optgroup");
    group.label = label;
    return group;
  }

  private syncFromHash(): void {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const docId = params.get("doc");
    const depthParam = params.get("depth");
    const depth: DepthLevel = VALID_DEPTHS.includes(depthParam as DepthLevel)
      ? (depthParam as DepthLevel)
      : DEFAULT_DEPTH;

    const firstLens = this.documents.find((d) => d.tier === "lens");
    const target = this.documents.find((d) => d.id === docId) ?? firstLens ?? this.documents[0];
    if (!target) return;

    this.selectEl.value = target.id;
    this.depth = depth;
    this.updateDepthButtonState();
    this.callbacks.onDocumentSelected(target);
    this.callbacks.onDepthChanged(this.depth);
  }

  private handleSelectChange(): void {
    const target = this.documents.find((d) => d.id === this.selectEl.value);
    if (!target) return;
    this.updateHash(target.id, this.depth);
  }

  private handleDepthClick(btn: HTMLButtonElement): void {
    const depth = (btn.dataset.depth as DepthLevel | undefined) ?? DEFAULT_DEPTH;
    this.depth = depth;
    this.updateDepthButtonState();
    const currentId = this.selectEl.value || this.documents[0]?.id;
    if (currentId) this.updateHash(currentId, depth);
  }

  private updateDepthButtonState(): void {
    this.depthButtons.forEach((btn) => {
      const isActive = btn.dataset.depth === this.depth;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  private updateHash(docId: string, depth: DepthLevel): void {
    window.location.hash = `doc=${docId}&depth=${depth}`;
  }
}
