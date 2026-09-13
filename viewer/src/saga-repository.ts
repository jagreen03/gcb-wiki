import type { ISagaRepository, SagaMeta, SagaContent } from "./types.js";

/**
 * Fetches sagas/manifest.json and the individual .md files it lists.
 * Single Responsibility: this class knows HOW to fetch saga content
 * and nothing about Markdown rendering, diagrams, or the DOM.
 *
 * Open/Closed: a new saga is added by editing manifest.json + dropping
 * in a .md file - this class needs no change.
 */
export class FetchSagaRepository implements ISagaRepository {
  /**
   * @param sagasBasePath Where the sagas/ directory is served from,
   *   relative to the page (e.g. "../sagas/" in dev, "sagas/" once the
   *   build copies it alongside the compiled viewer - see build.mjs).
   */
  constructor(private readonly sagasBasePath: string) {}

  async listSagas(): Promise<SagaMeta[]> {
    const res = await fetch(this.resolve("manifest.json"));
    if (!res.ok) {
      throw new Error(
        `Could not load saga manifest (${res.status} ${res.statusText}) from ${this.resolve("manifest.json")}`,
      );
    }
    const data = (await res.json()) as { sagas: SagaMeta[] };
    return data.sagas;
  }

  async loadSaga(meta: SagaMeta): Promise<SagaContent> {
    const res = await fetch(this.resolve(meta.file));
    if (!res.ok) {
      throw new Error(
        `Could not load saga "${meta.id}" (${res.status} ${res.statusText}) from ${this.resolve(meta.file)}`,
      );
    }
    const markdown = await res.text();
    return { ...meta, markdown };
  }

  private resolve(filename: string): string {
    return `${this.sagasBasePath}${filename}`;
  }
}
