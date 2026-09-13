/**
 * Shared contracts for the saga viewer. Every concrete class below
 * depends on one of these interfaces, never on another concrete class
 * directly (Dependency Inversion) - swap any implementation without
 * touching the others.
 */

/** One entry from sagas/manifest.json. */
export interface SagaMeta {
  readonly id: string;
  readonly file: string;
  readonly audience: string;
  readonly oneLine: string;
}

/** A saga's metadata plus its fetched, raw Markdown source. */
export interface SagaContent extends SagaMeta {
  readonly markdown: string;
}

/** Reading-depth levels a viewer can present a saga at. */
export type DepthLevel = "overview" | "full";

/**
 * Fetches the saga manifest and individual saga Markdown files.
 * Segregated from rendering concerns (Interface Segregation) - a
 * repository only knows how to fetch content, never how to display it.
 */
export interface ISagaRepository {
  listSagas(): Promise<SagaMeta[]>;
  loadSaga(meta: SagaMeta): Promise<SagaContent>;
}

/** Converts a Markdown string into sanitized HTML. */
export interface IMarkdownRenderer {
  render(markdown: string): string;
}

/**
 * Finds and renders diagram code blocks (e.g. ```mermaid fences,
 * already turned into <pre class="language-mermaid"> or similar by the
 * Markdown renderer) inside a container element, in place.
 */
export interface IDiagramRenderer {
  renderAll(container: HTMLElement): Promise<void>;
}

/** Applies a depth-level presentation to already-rendered saga HTML. */
export interface IDepthFilter {
  apply(container: HTMLElement, depth: DepthLevel): void;
}

/**
 * Finds and typesets inline ($...$) and block ($$...$$) LaTeX math
 * inside a container element, in place. Separate from IDiagramRenderer
 * (Interface Segregation) - a consumer that only needs diagrams
 * shouldn't have to depend on a math-rendering contract too.
 */
export interface IMathRenderer {
  renderAll(container: HTMLElement): void;
}
