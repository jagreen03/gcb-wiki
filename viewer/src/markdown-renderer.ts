import type { IMarkdownRenderer } from "./types.js";

/** Minimal surface of the global `marked` UMD build this class depends on. */
interface MarkedLike {
  parse(markdown: string, options?: Record<string, unknown>): string;
}

declare global {
  // Loaded via CDN <script> in index.html before this module runs.
  // eslint-disable-next-line no-var
  var marked: MarkedLike;
}

/**
 * Converts Markdown to HTML via the `marked` library. Single
 * Responsibility: Markdown -> HTML only. Mermaid fences are left as
 * plain <pre><code class="language-mermaid"> blocks for
 * MermaidDiagramRenderer to find and replace later - this class does
 * not know Mermaid exists (Interface Segregation in practice).
 */
export class MarkedMarkdownRenderer implements IMarkdownRenderer {
  render(markdown: string): string {
    if (typeof marked === "undefined") {
      throw new Error(
        "marked.js was not found on window - check the CDN <script> tag in index.html loaded before main.js",
      );
    }
    return marked.parse(markdown, { gfm: true, breaks: false });
  }
}
