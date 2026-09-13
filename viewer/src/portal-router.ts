import type { DepthLevel, DocumentMeta } from "./types.js";

export interface PortalRouterCallbacks {
  onDocumentSelected(meta: DocumentMeta, fragment: string | null): void;
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
 * Also owns the URL hash (#doc=<id>&depth=<level>[&frag=<id>]) so a
 * specific document + depth (+ heading, if navigated via a same-portal
 * link) is directly linkable and survives a page reload.
 * `navigateToDocument` is the entry point ILinkRouter's callback uses,
 * so a clicked in-content link updates the dropdown/hash exactly like
 * a manual selection would - one state-management path, not two.
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

    const groups: Record<DocumentMeta["tier"], HTMLOptGroupElement> = {
      lens: this.buildOptGroup("Lenses — start here"),
      saga: this.buildOptGroup("Full-depth sagas"),
      appendix: this.buildOptGroup("Reference appendices"),
    };
    for (const doc of documents) {
      const opt = document.createElement("option");
      opt.value = doc.id;
      opt.textContent = `${doc.audience} — ${doc.oneLine}`;
      groups[doc.tier].appendChild(opt);
    }
    for (const group of Object.values(groups)) {
      if (group.childElementCount > 0) this.selectEl.appendChild(group);
    }

    this.syncFromHash();
  }

  /** Entry point for ILinkRouter's onNavigate callback - a clicked same-portal link. */
  navigateToDocument(docId: string, fragment: string | null): void {
    this.updateHash(docId, this.depth, fragment);
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
    const fragment = params.get("frag");
    const depth: DepthLevel = VALID_DEPTHS.includes(depthParam as DepthLevel)
      ? (depthParam as DepthLevel)
      : DEFAULT_DEPTH;

    const firstLens = this.documents.find((d) => d.tier === "lens");
    const target = this.documents.find((d) => d.id === docId) ?? firstLens ?? this.documents[0];
    if (!target) return;

    this.selectEl.value = target.id;
    this.depth = depth;
    this.updateDepthButtonState();
    this.callbacks.onDocumentSelected(target, fragment);
    this.callbacks.onDepthChanged(this.depth);
  }

  private handleSelectChange(): void {
    const target = this.documents.find((d) => d.id === this.selectEl.value);
    if (!target) return;
    this.updateHash(target.id, this.depth, null);
  }

  private handleDepthClick(btn: HTMLButtonElement): void {
    const depth = (btn.dataset.depth as DepthLevel | undefined) ?? DEFAULT_DEPTH;
    this.depth = depth;
    this.updateDepthButtonState();
    const currentId = this.selectEl.value || this.documents[0]?.id;
    if (currentId) this.updateHash(currentId, depth, null);
  }

  private updateDepthButtonState(): void {
    this.depthButtons.forEach((btn) => {
      const isActive = btn.dataset.depth === this.depth;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  private updateHash(docId: string, depth: DepthLevel, fragment: string | null): void {
    const fragPart = fragment ? `&frag=${fragment}` : "";
    window.location.hash = `doc=${docId}&depth=${depth}${fragPart}`;
  }
}
