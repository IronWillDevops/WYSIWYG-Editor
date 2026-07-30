class l {
  constructor(t) {
    this.editor = t, this.active = !1;
  }
  toggle() {
    return this.active ? this.exitCodeView() : this.enterCodeView(), this.active;
  }
  enterCodeView() {
    this.editor.history.push(), this.source = document.createElement("textarea"), this.source.className = "ife-source-view", this.source.value = this.formatHtml(this.editor.getHTML()), this.source.spellcheck = !1, this.editor.root.insertAdjacentElement("afterend", this.source), this.editor.root.style.display = "none", this.active = !0;
  }
  exitCodeView() {
    if (!this.source) return;
    const t = this.editor.sanitizer.sanitize(this.source.value);
    this.editor.setHTML(t), this.source.remove(), this.editor.root.style.display = "", this.active = !1;
  }
  /** Simple, dependency-free HTML pretty-printer for readability in source view. */
  formatHtml(t) {
    const o = t.replace(/></g, `>
<`).split(`
`);
    let s = 0;
    return o.map((e) => {
      const i = /^<\//.test(e);
      i && (s = Math.max(s - 1, 0));
      const r = `${"  ".repeat(s)}${e}`, a = /\/>$/.test(e) || /<(br|hr|img|input|source)[ >]/i.test(e);
      return /^<[a-z]/i.test(e) && !i && !a && (s += 1), r;
    }).join(`
`);
  }
  destroy() {
    var t;
    (t = this.source) == null || t.remove();
  }
}
export {
  l as default
};
//# sourceMappingURL=CodeViewModule-Wu0FnDsK.js.map
