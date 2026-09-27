class d {
  constructor(e) {
    this.editor = e, this.active = !1;
  }
  toggle() {
    return this.active ? this.exitCodeView() : this.enterCodeView(), this.active;
  }
  enterCodeView() {
    this.editor.history.push(), this.source = document.createElement("textarea"), this.source.className = "ife-source-view", this.source.value = this.formatHtml(this.editor.getHTML()), this.source.spellcheck = !1, this.editor.root.insertAdjacentElement("afterend", this.source), this.editor.root.style.display = "none", this.editor.wrapper.classList.add("ife-source-open"), this.active = !0;
  }
  exitCodeView() {
    if (!this.source) return;
    const e = this.editor.sanitizer.sanitize(this.source.value);
    this.editor.setHTML(e), this.source.remove(), this.editor.root.style.display = "", this.editor.wrapper.classList.remove("ife-source-open"), this.active = !1;
  }
  /** Simple, dependency-free HTML pretty-printer for readability in source view. */
  formatHtml(e) {
    const o = e.replace(/></g, `>
<`).split(`
`);
    let s = 0;
    return o.map((t) => {
      const i = /^<\//.test(t);
      i && (s = Math.max(s - 1, 0));
      const r = `${"  ".repeat(s)}${t}`, a = /\/>$/.test(t) || /<(br|hr|img|input|source)[ >]/i.test(t);
      return /^<[a-z]/i.test(t) && !i && !a && (s += 1), r;
    }).join(`
`);
  }
  destroy() {
    var e;
    (e = this.source) == null || e.remove();
  }
}
export {
  d as default
};
//# sourceMappingURL=CodeViewModule-CuLP4-db.js.map
