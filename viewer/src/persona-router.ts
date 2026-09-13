import type { DepthLevel, SagaMeta } from "./types.js";

export interface PersonaRouterCallbacks {
  onSagaSelected(meta: SagaMeta): void;
  onDepthChanged(depth: DepthLevel): void;
}

/**
 * Owns the audience <select> dropdown and the depth toggle buttons,
 * and turns user interaction into callbacks. Single Responsibility:
 * UI wiring for navigation only - never touches saga content or
 * rendering directly (App composes this with the renderers).
 *
 * Also owns the URL hash (#audience=<id>&depth=<level>) so a saga is
 * directly linkable and survives a page reload.
 */
export class PersonaRouter {
  private sagas: SagaMeta[] = [];
  private depth: DepthLevel = "overview";

  constructor(
    private readonly selectEl: HTMLSelectElement,
    private readonly depthButtons: NodeListOf<HTMLButtonElement>,
    private readonly callbacks: PersonaRouterCallbacks,
  ) {
    this.selectEl.addEventListener("change", () => this.handleSelectChange());
    this.depthButtons.forEach((btn) =>
      btn.addEventListener("click", () => this.handleDepthClick(btn)),
    );
    window.addEventListener("hashchange", () => this.syncFromHash());
  }

  /** Populate the dropdown and select the saga named in the URL hash, or the first one. */
  initialize(sagas: SagaMeta[]): void {
    this.sagas = sagas;
    this.selectEl.innerHTML = "";
    for (const saga of sagas) {
      const opt = document.createElement("option");
      opt.value = saga.id;
      opt.textContent = `${saga.audience} — ${saga.oneLine}`;
      this.selectEl.appendChild(opt);
    }
    this.syncFromHash();
  }

  private syncFromHash(): void {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const audienceId = params.get("audience");
    const depthParam = params.get("depth");
    const depth: DepthLevel = depthParam === "full" ? "full" : "overview";

    const target = this.sagas.find((s) => s.id === audienceId) ?? this.sagas[0];
    if (!target) return;

    this.selectEl.value = target.id;
    this.depth = depth;
    this.updateDepthButtonState();
    this.callbacks.onSagaSelected(target);
    this.callbacks.onDepthChanged(this.depth);
  }

  private handleSelectChange(): void {
    const target = this.sagas.find((s) => s.id === this.selectEl.value);
    if (!target) return;
    this.updateHash(target.id, this.depth);
  }

  private handleDepthClick(btn: HTMLButtonElement): void {
    const depth = (btn.dataset.depth as DepthLevel | undefined) ?? "overview";
    this.depth = depth;
    this.updateDepthButtonState();
    const currentId = this.selectEl.value || this.sagas[0]?.id;
    if (currentId) this.updateHash(currentId, depth);
  }

  private updateDepthButtonState(): void {
    this.depthButtons.forEach((btn) => {
      const isActive = btn.dataset.depth === this.depth;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  private updateHash(audienceId: string, depth: DepthLevel): void {
    window.location.hash = `audience=${audienceId}&depth=${depth}`;
  }
}
