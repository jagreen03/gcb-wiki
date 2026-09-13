import type { IHeadingAnchorer } from "./types.js";

/**
 * Assigns `id="some-slug"` to every heading, since `marked` does not
 * do this itself (confirmed empirically: its default heading renderer
 * emits a bare `<h2>text</h2>`, no `id` - checked before writing this
 * class, not assumed). Duplicate slugs on the same page get `-1`,
 * `-2`, ... suffixes.
 *
 * The exact slug algorithm does not need to match GitHub's own
 * heading-anchor slugifier byte-for-byte - it only needs to be
 * consistent with itself, since this class is both the producer (this
 * file) and the only consumer that matters (ILinkRouter's fragment
 * resolution, and native in-page `#anchor` links) for anything
 * rendered by this viewer. Markdown source files' own `#fragment`
 * links were written to match this exact function's real output,
 * verified by running it against the real heading text before
 * committing those links - not guessed.
 */
export class SlugHeadingAnchorer implements IHeadingAnchorer {
  assignAll(container: HTMLElement): void {
    const seen = new Map<string, number>();
    const headings = container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
    for (const heading of Array.from(headings)) {
      if (heading.id) continue; // don't clobber an id set some other way
      const base = this.slugify(heading.textContent ?? "");
      if (!base) continue;
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      heading.id = count === 0 ? base : `${base}-${count}`;
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
  }
}
