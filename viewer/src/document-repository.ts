import type { IDocumentRepository, DocumentMeta, DocumentContent } from "./types.js";

/**
 * Fetches portal-manifest.json and the individual .md files it lists
 * (lenses and sagas alike - the manifest's `tier` field is metadata
 * only, this class treats every entry identically).
 * Single Responsibility: this class knows HOW to fetch document
 * content and nothing about Markdown rendering, diagrams, or the DOM.
 *
 * Open/Closed: a new lens or saga is added by editing
 * portal-manifest.json + dropping in a .md file - this class needs no
 * change.
 */
export class FetchDocumentRepository implements IDocumentRepository {
  /**
   * @param basePath Where the repo root (portal-manifest.json + the
   *   lenses/, sagas/, appendices/ directories it references) is
   *   served from, relative to the page.
   */
  constructor(private readonly basePath: string) {}

  async listDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(this.resolve("portal-manifest.json"));
    if (!res.ok) {
      throw new Error(
        `Could not load portal manifest (${res.status} ${res.statusText}) from ${this.resolve("portal-manifest.json")}`,
      );
    }
    const data = (await res.json()) as { documents: DocumentMeta[] };
    return data.documents;
  }

  async loadDocument(meta: DocumentMeta): Promise<DocumentContent> {
    const res = await fetch(this.resolve(meta.file));
    if (!res.ok) {
      throw new Error(
        `Could not load "${meta.id}" (${res.status} ${res.statusText}) from ${this.resolve(meta.file)}`,
      );
    }
    const markdown = await res.text();
    return { ...meta, markdown };
  }

  private resolve(relativePath: string): string {
    return `${this.basePath}${relativePath}`;
  }
}
