import { I as n, L as h } from "./index-DZXl3GUk.js";
const o = {
  p: "paragraph",
  h1: "heading1",
  h2: "heading2",
  h3: "heading3",
  h4: "heading4",
  h5: "heading5",
  h6: "heading6",
  blockquote: "blockquote",
  pre: "preformatted",
  li: "listItem",
  div: "paragraph"
};
class u {
  constructor(t) {
    this.editor = t, this.update = this.update.bind(this), this._onDestroy = () => this.destroy(), this.buildDom(), this.bindEvents(), this.update();
  }
  buildDom() {
    this.el = document.createElement("div"), this.el.className = "ife-statusbar", this.left = document.createElement("span"), this.left.className = "ife-statusbar__left", this.typeEl = document.createElement("span"), this.typeEl.className = "ife-statusbar__item", this.typeEl.innerHTML = '<span class="ife-statusbar__value">Paragraph</span>', this.wordsEl = document.createElement("span"), this.wordsEl.className = "ife-statusbar__item", this.wordsEl.innerHTML = `${n.wordCount} <span class="ife-statusbar__value">0</span>`, this.charsEl = document.createElement("span"), this.charsEl.className = "ife-statusbar__item", this.charsEl.innerHTML = `${n.specialChars} <span class="ife-statusbar__value">0</span>`, this.left.appendChild(this.typeEl), this.left.appendChild(this.wordsEl), this.left.appendChild(this.charsEl), this.right = document.createElement("span"), this.right.className = "ife-statusbar__right", this.right.textContent = "Made by ITkha", this.el.appendChild(this.left), this.el.appendChild(this.right), this.editor.wrapper.appendChild(this.el);
  }
  bindEvents() {
    this.editor.root.addEventListener("input", this.update), this._unsubChange = this.editor.on("change", this.update), this._unsubSelectionChange = this.editor.on("selectionchange", this.update), this._unsubDestroy = this.editor.on("destroy", this._onDestroy);
  }
  update() {
    const t = this.editor.getText(), e = t.length, s = t.trim() ? t.trim().split(/\s+/).length : 0;
    this.wordsEl.querySelector(".ife-statusbar__value").textContent = s, this.charsEl.querySelector(".ife-statusbar__value").textContent = e;
    const a = this._getElementType(), r = this.editor.options.locale ?? "en";
    this.typeEl.querySelector(".ife-statusbar__value").textContent = h.t(r, a);
  }
  _getElementType() {
    var s, a, r;
    const t = this.editor.selection;
    if (!t) return "paragraph";
    if ((s = t.closest) != null && s.call(t, "a")) return "linkLabel";
    if ((a = t.closest) != null && a.call(t, "code")) return "code";
    const e = (r = t.getBlockElement) == null ? void 0 : r.call(t);
    if (!e) return "paragraph";
    if (e.tagName === "LI") {
      let i = e.parentElement;
      for (; i && i !== this.editor.root; ) {
        if (i.tagName === "OL") return "orderedList";
        if (i.tagName === "UL") return "bulletList";
        i = i.parentElement;
      }
    }
    return o[e.tagName.toLowerCase()] || "paragraph";
  }
  destroy() {
    var t, e, s;
    this.destroyed || (this.destroyed = !0, this.editor.root.removeEventListener("input", this.update), (t = this._unsubChange) == null || t.call(this), (e = this._unsubSelectionChange) == null || e.call(this), (s = this._unsubDestroy) == null || s.call(this), this.el.remove());
  }
}
export {
  u as default
};
//# sourceMappingURL=StatusBar-CS7CkoQs.js.map
