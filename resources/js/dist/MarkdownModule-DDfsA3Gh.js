class $ {
  constructor(t) {
    this.editor = t;
  }
  /** @returns {string} */
  export() {
    return this.htmlToMarkdown(this.editor.getHTML()).trim();
  }
  /** @param {string} markdown */
  import(t) {
    const e = this.markdownToHtml(t);
    this.editor.setHTML(e);
  }
  /** @param {string} html */
  htmlToMarkdown(t) {
    const e = document.createElement("div");
    return e.innerHTML = t, this.nodeToMarkdown(e).replace(/\n{3,}/g, `

`);
  }
  /** @param {Node} node */
  nodeToMarkdown(t) {
    let e = "";
    return t.childNodes.forEach((n) => {
      e += this.convertNode(n);
    }), e;
  }
  /** @param {Node} node */
  convertNode(t) {
    var n;
    if (t.nodeType === Node.TEXT_NODE) return t.textContent ?? "";
    if (!(t instanceof HTMLElement)) return "";
    const e = () => this.nodeToMarkdown(t);
    switch (t.tagName) {
      case "H1":
        return `# ${e()}

`;
      case "H2":
        return `## ${e()}

`;
      case "H3":
        return `### ${e()}

`;
      case "H4":
        return `#### ${e()}

`;
      case "H5":
        return `##### ${e()}

`;
      case "H6":
        return `###### ${e()}

`;
      case "P":
        return `${e()}

`;
      case "STRONG":
      case "B":
        return `**${e()}**`;
      case "EM":
      case "I":
        return `*${e()}*`;
      case "S":
      case "STRIKE":
        return `~~${e()}~~`;
      case "A":
        return `[${e()}](${t.getAttribute("href") ?? ""})`;
      case "IMG":
        return `![${t.getAttribute("alt") ?? ""}](${t.getAttribute("src") ?? ""})`;
      case "BLOCKQUOTE":
        return `> ${e().trim().replace(/\n/g, `
> `)}

`;
      case "CODE":
        return ((n = t.parentElement) == null ? void 0 : n.tagName) === "PRE" ? e() : `\`${e()}\``;
      case "PRE":
        return `\`\`\`
${e()}
\`\`\`

`;
      case "HR":
        return `---

`;
      case "BR":
        return `
`;
      case "UL":
        return `${[...t.children].map((r) => `- ${this.nodeToMarkdown(r).trim()}`).join(`
`)}

`;
      case "OL":
        return `${[...t.children].map((r, i) => `${i + 1}. ${this.nodeToMarkdown(r).trim()}`).join(`
`)}

`;
      default:
        return e();
    }
  }
  /** @param {string} markdown */
  markdownToHtml(t) {
    const e = t.split(`
`), n = [];
    let r = null;
    return e.forEach((i) => {
      const s = i, o = s.match(/^(#{1,6})\s+(.*)$/), c = s.match(/^[-*]\s+(.*)$/), a = s.match(/^\d+\.\s+(.*)$/), l = s.match(/^>\s?(.*)$/);
      if (o) {
        this.closeList(n, r), r = null;
        const u = o[1].length;
        n.push(`<h${u}>${this.inlineMarkdown(o[2])}</h${u}>`);
        return;
      }
      if (c) {
        r !== "ul" && (this.closeList(n, r), n.push("<ul>"), r = "ul"), n.push(`<li>${this.inlineMarkdown(c[1])}</li>`);
        return;
      }
      if (a) {
        r !== "ol" && (this.closeList(n, r), n.push("<ol>"), r = "ol"), n.push(`<li>${this.inlineMarkdown(a[1])}</li>`);
        return;
      }
      if (l) {
        this.closeList(n, r), r = null, n.push(`<blockquote>${this.inlineMarkdown(l[1])}</blockquote>`);
        return;
      }
      if (s.trim() === "---") {
        this.closeList(n, r), r = null, n.push("<hr>");
        return;
      }
      this.closeList(n, r), r = null, s.trim() !== "" && n.push(`<p>${this.inlineMarkdown(s)}</p>`);
    }), this.closeList(n, r), n.join("");
  }
  closeList(t, e) {
    e && t.push(`</${e}>`);
  }
  /** @param {string} text */
  inlineMarkdown(t) {
    return t.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>').replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/~~(.+?)~~/g, "<s>$1</s>").replace(/`(.+?)`/g, "<code>$1</code>");
  }
  destroy() {
  }
}
export {
  $ as default
};
//# sourceMappingURL=MarkdownModule-DDfsA3Gh.js.map
