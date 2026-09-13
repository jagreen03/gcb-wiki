import type { IMathRenderer } from "./types.js";

/** Minimal surface of the global `renderMathInElement` (KaTeX auto-render) this class depends on. */
type RenderMathInElementFn = (
  element: HTMLElement,
  options: Record<string, unknown>,
) => void;

declare global {
  // Loaded via CDN <script> in index.html before this module runs.
  // eslint-disable-next-line no-var
  var renderMathInElement: RenderMathInElementFn;
}

/**
 * Typesets inline ($...$) and block ($$...$$) LaTeX math via KaTeX's
 * auto-render extension. Single Responsibility: math typesetting only.
 */
export class KatexMathRenderer implements IMathRenderer {
  renderAll(container: HTMLElement): void {
    if (typeof renderMathInElement === "undefined") {
      throw new Error(
        "KaTeX auto-render was not found on window - check the CDN <script> tags in index.html loaded before main.js",
      );
    }
    renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
    });
  }
}
