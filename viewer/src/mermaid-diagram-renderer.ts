import type { IDiagramRenderer } from "./types.js";

/** Minimal surface of the global `mermaid` UMD build this class depends on. */
interface MermaidLike {
  initialize(config: Record<string, unknown>): void;
  run(options?: { nodes?: HTMLElement[] }): Promise<void>;
}

declare global {
  // Loaded via CDN <script> in index.html before this module runs.
  // eslint-disable-next-line no-var
  var mermaid: MermaidLike;
}

/**
 * Finds ```mermaid fenced code blocks (rendered by marked as
 * <pre><code class="language-mermaid">...</code></pre>) inside a
 * container and replaces them with live Mermaid SVG diagrams.
 *
 * Single Responsibility: diagram rendering only - knows nothing about
 * how the HTML it's handed was produced (Markdown renderer stays
 * swappable without this class changing).
 */
export class MermaidDiagramRenderer implements IDiagramRenderer {
  private initialized = false;

  constructor(private readonly theme: "default" | "dark" = "default") {}

  async renderAll(container: HTMLElement): Promise<void> {
    if (typeof mermaid === "undefined") {
      throw new Error(
        "mermaid.js was not found on window - check the CDN <script> tag in index.html loaded before main.js",
      );
    }
    this.ensureInitialized();

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>("pre > code.language-mermaid"),
    );
    const mermaidNodes: HTMLElement[] = [];

    for (const codeEl of blocks) {
      const pre = codeEl.parentElement;
      if (!pre) continue;
      const div = document.createElement("div");
      div.className = "mermaid";
      // textContent, not innerHTML - codeEl's content was HTML-escaped
      // by the Markdown renderer; textContent gives back the raw source.
      div.textContent = codeEl.textContent ?? "";
      pre.replaceWith(div);
      mermaidNodes.push(div);
    }

    if (mermaidNodes.length > 0) {
      await mermaid.run({ nodes: mermaidNodes });
    }
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    mermaid.initialize({ startOnLoad: false, theme: this.theme, securityLevel: "strict" });
    this.initialized = true;
  }
}
