/**
 * Shared contracts for the portal viewer. Every concrete class below
 * depends on one of these interfaces, never on another concrete class
 * directly (Dependency Inversion) - swap any implementation without
 * touching the others.
 */

/** Which collection a document belongs to - drives dropdown grouping only. */
export type DocumentTier = "lens" | "saga" | "appendix";

/** One entry from portal-manifest.json. */
export interface DocumentMeta {
  readonly id: string;
  readonly file: string;
  readonly audience: string;
  readonly oneLine: string;
  readonly tier: DocumentTier;
}

/** A document's metadata plus its fetched, raw Markdown source. */
export interface DocumentContent extends DocumentMeta {
  readonly markdown: string;
}

/**
 * Reading-depth levels the portal can present a document at, low to
 * high (each higher level is a superset of the ones below it - see
 * IDepthFilter). Documents opt into this by wrapping sections in
 * `<!-- depth:LEVEL -->` ... `<!-- /depth -->` HTML comments; content
 * outside any such wrapper is always visible at every level.
 */
export type DepthLevel = "executive" | "system" | "foundry";

export const DEPTH_ORDER: readonly DepthLevel[] = ["executive", "system", "foundry"];

/**
 * Fetches the portal manifest and individual document Markdown files.
 * Segregated from rendering concerns (Interface Segregation) - a
 * repository only knows how to fetch content, never how to display it.
 */
export interface IDocumentRepository {
  listDocuments(): Promise<DocumentMeta[]>;
  loadDocument(meta: DocumentMeta): Promise<DocumentContent>;
}

/** Converts a Markdown string into HTML (raw HTML passthrough, including depth-comment markers). */
export interface IMarkdownRenderer {
  render(markdown: string): string;
}

/**
 * Finds and renders diagram code blocks (```mermaid fences, already
 * turned into <pre><code class="language-mermaid"> by the Markdown
 * renderer) inside a container element, in place.
 */
export interface IDiagramRenderer {
  renderAll(container: HTMLElement): Promise<void>;
}

/**
 * Applies a depth-level presentation to already-rendered document HTML.
 * Implementations are expected to be idempotent - safe to call again
 * on the same container with a different level (e.g. the user flips
 * the depth toggle without reloading the document).
 */
export interface IDepthFilter {
  apply(container: HTMLElement, level: DepthLevel): void;
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

/**
 * Assigns a unique, deterministic `id` to every heading in a container
 * (Markdown renderers commonly do NOT do this by default - `marked`
 * confirmed not to, empirically, before this interface was written).
 * Required for `#fragment` links - both within a document and, via
 * ILinkRouter, across documents - to have anything to scroll to.
 */
export interface IHeadingAnchorer {
  assignAll(container: HTMLElement): void;
}

/**
 * Rewires same-portal Markdown links (written as repo-relative paths,
 * correct for viewing the raw file on GitHub or in an editor) to
 * navigate within the SPA instead of letting the browser follow the
 * href literally - which would resolve against this page's own URL,
 * not the source document's repo location, and 404. A link that does
 * not resolve to a document in `allDocuments` (external URLs, plain
 * `#anchor` links) is left completely alone.
 */
export interface ILinkRouter {
  wireLinks(
    container: HTMLElement,
    currentDoc: DocumentMeta,
    allDocuments: readonly DocumentMeta[],
    onNavigate: (target: DocumentMeta, fragment: string | null) => void,
  ): void;
}
