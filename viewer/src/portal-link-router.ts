import type { DocumentMeta, ILinkRouter } from "./types.js";

/**
 * Resolves a Markdown link's href against the *source document's own
 * repo path* (e.g. `../sagas/saga-01-neighbor.md` from
 * `lenses/04-strategic-partner.md`) rather than the page's own URL,
 * then rewires matching anchors to navigate within the SPA. Single
 * Responsibility: link rewiring only - never touches rendering or the
 * router's own hash/dropdown state directly (the `onNavigate`
 * callback owns that).
 */
export class PortalLinkRouter implements ILinkRouter {
  wireLinks(
    container: HTMLElement,
    currentDoc: DocumentMeta,
    allDocuments: readonly DocumentMeta[],
    onNavigate: (target: DocumentMeta, fragment: string | null) => void,
  ): void {
    const anchors = container.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (const anchor of Array.from(anchors)) {
      const href = anchor.getAttribute("href");
      if (!href || this.isExternalOrSamePageAnchor(href)) continue;

      const { repoPath, fragment } = this.resolve(currentDoc.file, href);
      const target = allDocuments.find((doc) => doc.file === repoPath);
      if (!target) continue; // not a document this portal knows about - leave it as a normal link

      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        onNavigate(target, fragment);
      });
    }
  }

  private isExternalOrSamePageAnchor(href: string): boolean {
    return /^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("#");
  }

  private resolve(currentFile: string, href: string): { repoPath: string; fragment: string | null } {
    const base = new URL(currentFile, "https://portal.invalid/");
    const resolved = new URL(href, base);
    return {
      repoPath: resolved.pathname.replace(/^\//, ""),
      fragment: resolved.hash ? resolved.hash.slice(1) : null,
    };
  }
}
