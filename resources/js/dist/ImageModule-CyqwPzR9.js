import { D as u } from "./index-B7xMO_r_.js";
class v {
  constructor(e) {
    this.editor = e, this.uploadUrl = e.options.uploadUrl, this.handleDrop = this.handleDrop.bind(this), this.handleClick = this.handleClick.bind(this), this.handleDblClick = this.handleDblClick.bind(this), this.handleMouseDown = this.handleMouseDown.bind(this), this.handleResizeStart = this.handleResizeStart.bind(this), e.root.addEventListener("dragover", (t) => t.preventDefault()), e.root.addEventListener("drop", this.handleDrop), e.root.addEventListener("click", this.handleClick), e.root.addEventListener("dblclick", this.handleDblClick), e.root.addEventListener("mousedown", this.handleMouseDown);
  }
  open() {
    const e = this.getSelectedFigure(), t = e == null ? void 0 : e.querySelector("img"), s = e == null ? void 0 : e.querySelector("figcaption"), n = ["left", "center", "right"].find((i) => e == null ? void 0 : e.classList.contains(`ife-image--${i}`)) ?? "center", o = `
            <div class="ife-tabs">
                <label class="ife-field">
                    <span>Image URL</span>
                    <input type="url" name="src" placeholder="https://example.com/image.jpg" value="${this.escape((t == null ? void 0 : t.getAttribute("src")) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Or upload a file</span>
                    <input type="file" name="file" accept="image/*">
                </label>
                <label class="ife-field">
                    <span>Alt text</span>
                    <input type="text" name="alt" value="${this.escape((t == null ? void 0 : t.getAttribute("alt")) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Caption</span>
                    <input type="text" name="caption" value="${this.escape((s == null ? void 0 : s.textContent) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Alignment</span>
                    <select name="align">
                        <option value="none" ${n === "none" ? "selected" : ""}>None</option>
                        <option value="left" ${n === "left" ? "selected" : ""}>Left</option>
                        <option value="center" ${n === "center" ? "selected" : ""}>Center</option>
                        <option value="right" ${n === "right" ? "selected" : ""}>Right</option>
                    </select>
                </label>
                <label class="ife-field--inline">
                    <input type="checkbox" name="lazy" ${!e || (t == null ? void 0 : t.loading) === "lazy" ? "checked" : ""}>
                    <span>Lazy loading</span>
                </label>
            </div>
        `;
    if (this.dialog = new u(this.editor.wrapper, {
      title: e ? "Edit image" : "Insert image",
      bodyHtml: o,
      confirmLabel: e ? "Update" : "Insert",
      onConfirm: (i) => this.handleSubmit(i, e)
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const i = document.createElement("button");
      i.type = "button", i.className = "ife-btn ife-btn--danger", i.textContent = "Remove image", i.addEventListener("mousedown", (a) => a.preventDefault()), i.addEventListener("click", (a) => {
        a.stopPropagation(), this.editor.history.push(), e.remove(), this.editor.emitChange(), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(i);
    }
  }
  /** Returns the currently selected/edited image's <figure>, if any. */
  getSelectedFigure() {
    return this.editor.root.querySelector("figure.ife-image--selected") ?? this.editor.selection.closest("figure.ife-image");
  }
  async handleSubmit(e, t) {
    const s = new FormData(e), n = s.get("file");
    let o = String(s.get("src") ?? "");
    if (n instanceof File && n.size > 0 && (o = await this.upload(n), !o) || !o) return;
    const i = {
      src: o,
      alt: String(s.get("alt") ?? ""),
      caption: String(s.get("caption") ?? ""),
      align: String(s.get("align") ?? "center"),
      lazy: !!s.get("lazy")
    };
    t ? this.update(t, i) : this.insert(i);
  }
  /** @param {File} file */
  async upload(e) {
    var n;
    if (!this.uploadUrl)
      return console.warn("InkForge Editor: no uploadUrl configured, falling back to a local object URL."), URL.createObjectURL(e);
    const t = new FormData();
    t.append("file", e);
    const s = (n = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : n.content;
    try {
      const o = await fetch(this.uploadUrl, {
        method: "POST",
        headers: s ? { "X-CSRF-TOKEN": s } : {},
        body: t,
        credentials: "same-origin"
      }), i = await o.json();
      if (!o.ok || !i.success)
        throw new Error(i.message ?? "Upload failed");
      return i.url;
    } catch (o) {
      return this.editor.events.emit("error", o), null;
    }
  }
  /**
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  insert({ src: e, alt: t, caption: s, align: n, lazy: o }) {
    this.editor.history.push(), this.editor.selection.restore();
    const i = document.createElement("figure");
    i.className = `ife-image ife-image--${n}`;
    const a = document.createElement("img");
    if (this.editor.sanitizer.isSafeUrl(e) && (a.src = e), a.alt = t, o && (a.loading = "lazy"), i.appendChild(a), s) {
      const c = document.createElement("figcaption");
      c.textContent = s, i.appendChild(c);
    }
    const l = this.editor.selection.getRange();
    l == null || l.deleteContents(), l == null || l.insertNode(i);
    const r = document.createRange();
    r.setStartAfter(i), r.collapse(!0), this.editor.selection.setRange(r), this.editor.emitChange();
  }
  /**
   * Updates an already-inserted <figure class="ife-image"> in place instead
   * of creating a new one, so the "edit image" flow doesn't duplicate it.
   * @param {HTMLElement} figure
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  update(e, { src: t, alt: s, caption: n, align: o, lazy: i }) {
    this.editor.history.push(), e.className = `ife-image ife-image--${o}`;
    const a = e.querySelector("img");
    if (a && (this.editor.sanitizer.isSafeUrl(t) && (a.src = t), a.alt = s, i ? a.setAttribute("loading", "lazy") : a.removeAttribute("loading")), e.querySelectorAll("figcaption").forEach((l) => l.remove()), n) {
      const l = document.createElement("figcaption");
      l.textContent = n, e.appendChild(l);
    }
    e.classList.remove("ife-image--selected"), this.editor.emitChange();
  }
  /** Marks the clicked image's <figure> as selected (for edit/resize), or clears selection. */
  handleClick(e) {
    var s;
    const t = e.target.closest("figure.ife-image img");
    this.editor.root.querySelectorAll(".ife-image--selected").forEach((n) => n.classList.remove("ife-image--selected")), t ? ((s = t.closest("figure")) == null || s.classList.add("ife-image--selected"), this.showResizeHandles(t)) : this.hideResizeHandles();
  }
  /** Adds visible resize handles around a selected image. */
  showResizeHandles(e) {
    this.hideResizeHandles();
    const t = document.createElement("div");
    t.className = "ife-image-resize-handles", ["nw", "ne", "sw", "se"].forEach((n) => {
      const o = document.createElement("div");
      o.className = `ife-image-resize-handle ife-image-resize-handle--${n}`, o.addEventListener("mousedown", (i) => this.handleResizeStart(i, e)), t.appendChild(o);
    }), e.parentElement && e.parentElement.appendChild(t);
  }
  /** Removes visible resize handles. */
  hideResizeHandles() {
    this.editor.root.querySelectorAll(".ife-image-resize-handles").forEach((e) => e.remove());
  }
  /** Drag-start for visible resize handles. */
  handleResizeStart(e, t) {
    e.preventDefault(), e.stopPropagation();
    const s = e.clientX, n = e.clientY, o = t.getBoundingClientRect().width, i = t.getBoundingClientRect().height, a = (r) => {
      const c = r.clientX - s, m = r.clientY - n, p = o / i;
      let d = Math.max(40, o + c), h = Math.max(40, i + m);
      Math.abs(c) > Math.abs(m) ? h = d / p : d = h * p, t.style.width = `${Math.round(d)}px`, t.style.height = `${Math.round(h)}px`;
    }, l = () => {
      document.removeEventListener("mousemove", a), document.removeEventListener("mouseup", l), this.editor.emitChange();
    };
    document.addEventListener("mousemove", a), document.addEventListener("mouseup", l);
  }
  /** Double-clicking an image opens the edit dialog directly. */
  handleDblClick(e) {
    var s;
    const t = e.target.closest("figure.ife-image img");
    t && (e.preventDefault(), this.editor.root.querySelectorAll(".ife-image--selected").forEach((n) => n.classList.remove("ife-image--selected")), (s = t.closest("figure")) == null || s.classList.add("ife-image--selected"), this.open());
  }
  /** Alt+drag on an image resizes it (avoids clashing with normal caret placement). */
  handleMouseDown(e) {
    const t = e.target.closest("figure.ife-image img");
    if (!t || !e.altKey) return;
    e.preventDefault();
    const s = e.clientX, n = t.getBoundingClientRect().width, o = (a) => {
      const l = a.clientX - s;
      t.style.width = `${Math.max(40, n + l)}px`;
    }, i = () => {
      document.removeEventListener("mousemove", o), document.removeEventListener("mouseup", i), this.editor.emitChange();
    };
    document.addEventListener("mousemove", o), document.addEventListener("mouseup", i);
  }
  /** @param {DragEvent} event */
  async handleDrop(e) {
    var n, o;
    const t = (o = (n = e.dataTransfer) == null ? void 0 : n.files) == null ? void 0 : o[0];
    if (!t || !t.type.startsWith("image/")) return;
    e.preventDefault();
    const s = await this.upload(t);
    s && (this.editor.selection.save(), this.insert({ src: s, alt: "", caption: "", align: "center", lazy: !0 }));
  }
  escape(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("drop", this.handleDrop), this.editor.root.removeEventListener("click", this.handleClick), this.editor.root.removeEventListener("dblclick", this.handleDblClick), this.editor.root.removeEventListener("mousedown", this.handleMouseDown), this.hideResizeHandles();
  }
}
export {
  v as default
};
//# sourceMappingURL=ImageModule-CyqwPzR9.js.map
