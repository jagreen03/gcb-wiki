import type { DepthLevel, IDepthFilter } from "./types.js";

/**
 * Presents a saga at a reading depth without needing the Markdown
 * source to be pre-tagged by depth (Open/Closed: works on any saga,
 * including ones written before this filter existed, or written
 * after it with no special markup).
 *
 * "overview": collapse non-diagram code blocks and any section headed
 *   "Epistemic status..." behind a <details> toggle - the narrative
 *   stays readable without the denser technical asides.
 * "full": everything expanded, nothing hidden.
 *
 * Single Responsibility: presentation-depth toggling only. Runs after
 * the Markdown, diagram, and math renderers have already produced the
 * final DOM.
 */
export class GenericDepthFilter implements IDepthFilter {
  apply(container: HTMLElement, depth: DepthLevel): void {
    this.collapseCodeBlocks(container, depth);
    this.collapseEpistemicSections(container, depth);
  }

  private collapseCodeBlocks(container: HTMLElement, depth: DepthLevel): void {
    const codeBlocks = container.querySelectorAll<HTMLElement>(
      "pre:not(:has(code.language-mermaid))",
    );
    for (const pre of Array.from(codeBlocks)) {
      this.wrapInDetails(pre, "Show code", depth === "full");
    }
  }

  private collapseEpistemicSections(container: HTMLElement, depth: DepthLevel): void {
    const headings = container.querySelectorAll<HTMLElement>("h2, h3");
    for (const heading of Array.from(headings)) {
      if (!/epistemic status/i.test(heading.textContent ?? "")) continue;
      const rangeEls = this.collectSectionSiblings(heading);
      if (rangeEls.length === 0) continue;
      this.wrapRangeInDetails(heading, rangeEls, "Epistemic status (evidence tier)", depth === "full");
    }
  }

  /** Collect sibling elements after `heading` up to (not including) the next same-or-higher heading. */
  private collectSectionSiblings(heading: HTMLElement): HTMLElement[] {
    const level = Number(heading.tagName.substring(1));
    const result: HTMLElement[] = [];
    let node = heading.nextElementSibling as HTMLElement | null;
    while (node) {
      const match = /^H([1-6])$/.exec(node.tagName);
      if (match && Number(match[1]) <= level) break;
      result.push(node);
      node = node.nextElementSibling as HTMLElement | null;
    }
    return result;
  }

  private wrapInDetails(el: HTMLElement, summaryText: string, open: boolean): void {
    if (el.closest("details.depth-collapsible")) return; // already wrapped
    const details = document.createElement("details");
    details.className = "depth-collapsible";
    details.open = open;
    const summary = document.createElement("summary");
    summary.textContent = summaryText;
    details.appendChild(summary);
    el.replaceWith(details);
    details.appendChild(el);
  }

  private wrapRangeInDetails(
    heading: HTMLElement,
    rangeEls: HTMLElement[],
    summaryText: string,
    open: boolean,
  ): void {
    const firstEl = rangeEls[0];
    if (!firstEl || firstEl.closest("details.depth-collapsible")) return; // empty or already wrapped
    const details = document.createElement("details");
    details.className = "depth-collapsible";
    details.open = open;
    const summary = document.createElement("summary");
    summary.textContent = summaryText;
    details.appendChild(summary);
    firstEl.before(details);
    for (const el of rangeEls) details.appendChild(el);
  }
}
