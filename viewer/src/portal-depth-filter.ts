import { DEPTH_ORDER, type DepthLevel, type IDepthFilter } from "./types.js";

const DEPTH_START = /^\s*depth:(executive|system|foundry)\s*$/;
const DEPTH_END = /^\s*\/depth\s*$/;
const PROCESSED_FLAG = "depthProcessed";

/**
 * Applies the portal's reading-depth presentation. Two strategies,
 * tried in order, so both the new lenses/ (explicitly tagged) and the
 * pre-existing sagas/ (untagged) work correctly without retrofitting
 * markup into 8 already-committed files:
 *
 * 1. **Explicit tagging** - `<!-- depth:LEVEL -->` ... `<!-- /depth -->`
 *    HTML comment pairs (passed through verbatim by the Markdown
 *    renderer as sibling comment nodes) delimit a region. Cumulative:
 *    selecting "system" shows executive + system content; "foundry"
 *    shows everything. Untagged content (headings, connective prose)
 *    is always visible. Used by `lenses/*.md`.
 * 2. **Heuristic fallback**, only when a document has zero explicit
 *    tags - collapse non-diagram code blocks and any "Epistemic
 *    status" section behind a closed `<details>` at the "executive"
 *    level, open otherwise. Used by `sagas/*.md`.
 *
 * Idempotent: re-applying a different level to an already-tagged
 * container only adjusts visibility, never re-wraps.
 */
export class PortalDepthFilter implements IDepthFilter {
  apply(container: HTMLElement, level: DepthLevel): void {
    if (!container.dataset[PROCESSED_FLAG]) {
      const tagged = this.tagExplicitSections(container);
      if (!tagged) {
        this.applyHeuristicFallback(container);
      }
      container.dataset[PROCESSED_FLAG] = "1";
    }
    this.applyVisibility(container, level);
  }

  /** Wrap each `<!-- depth:X -->`..`<!-- /depth -->` run of siblings in a tagged <div>. Returns true if any were found. */
  private tagExplicitSections(container: HTMLElement): boolean {
    let foundAny = false;
    const children = Array.from(container.childNodes);
    let i = 0;
    while (i < children.length) {
      const node = children[i];
      const startMatch =
        node?.nodeType === Node.COMMENT_NODE
          ? DEPTH_START.exec((node as Comment).data)
          : null;
      if (!startMatch) {
        i++;
        continue;
      }
      const level = startMatch[1] as DepthLevel;
      const startNode = node as Comment;
      const collected: ChildNode[] = [];
      let j = i + 1;
      let endNode: Comment | undefined;
      while (j < children.length) {
        const candidate = children[j];
        if (
          candidate?.nodeType === Node.COMMENT_NODE &&
          DEPTH_END.test((candidate as Comment).data)
        ) {
          endNode = candidate as Comment;
          break;
        }
        collected.push(candidate as ChildNode);
        j++;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "depth-section";
      wrapper.dataset.depth = level;
      startNode.before(wrapper);
      for (const el of collected) wrapper.appendChild(el);
      startNode.remove();
      endNode?.remove();
      foundAny = true;
      i = 0; // childNodes mutated - restart the scan over the (now shorter) list
      children.length = 0;
      children.push(...Array.from(container.childNodes));
    }
    return foundAny;
  }

  private applyVisibility(container: HTMLElement, level: DepthLevel): void {
    const selectedIndex = DEPTH_ORDER.indexOf(level);

    const sections = container.querySelectorAll<HTMLElement>(".depth-section");
    for (const section of Array.from(sections)) {
      const sectionLevel = section.dataset.depth as DepthLevel | undefined;
      const sectionIndex = sectionLevel ? DEPTH_ORDER.indexOf(sectionLevel) : 0;
      section.hidden = sectionIndex > selectedIndex;
    }

    const collapsibles = container.querySelectorAll<HTMLDetailsElement>(
      "details.depth-collapsible",
    );
    for (const details of Array.from(collapsibles)) {
      details.open = level !== "executive";
    }
  }

  private applyHeuristicFallback(container: HTMLElement): void {
    this.collapseCodeBlocks(container);
    this.collapseEpistemicSections(container);
  }

  private collapseCodeBlocks(container: HTMLElement): void {
    const codeBlocks = container.querySelectorAll<HTMLElement>(
      "pre:not(:has(code.language-mermaid))",
    );
    for (const pre of Array.from(codeBlocks)) {
      this.wrapInDetails(pre, "Show code");
    }
  }

  private collapseEpistemicSections(container: HTMLElement): void {
    const headings = container.querySelectorAll<HTMLElement>("h2, h3");
    for (const heading of Array.from(headings)) {
      if (!/epistemic status/i.test(heading.textContent ?? "")) continue;
      const rangeEls = this.collectSectionSiblings(heading);
      this.wrapRangeInDetails(rangeEls, "Epistemic status (evidence tier)");
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

  private wrapInDetails(el: HTMLElement, summaryText: string): void {
    if (el.closest("details.depth-collapsible")) return; // already wrapped
    const details = document.createElement("details");
    details.className = "depth-collapsible";
    const summary = document.createElement("summary");
    summary.textContent = summaryText;
    details.appendChild(summary);
    el.replaceWith(details);
    details.appendChild(el);
  }

  private wrapRangeInDetails(rangeEls: HTMLElement[], summaryText: string): void {
    const firstEl = rangeEls[0];
    if (!firstEl || firstEl.closest("details.depth-collapsible")) return; // empty or already wrapped
    const details = document.createElement("details");
    details.className = "depth-collapsible";
    const summary = document.createElement("summary");
    summary.textContent = summaryText;
    details.appendChild(summary);
    firstEl.before(details);
    for (const el of rangeEls) details.appendChild(el);
  }
}
