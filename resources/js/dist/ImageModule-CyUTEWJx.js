import { D as u } from "./index-Cq8Mug0c.js";
class v {
  constructor(e) {
    this.editor = e, this.uploadUrl = e.options.uploadUrl, this.handleDrop = this.handleDrop.bind(this), this.handleClick = this.handleClick.bind(this), this.handleDblClick = this.handleDblClick.bind(this), this.handleMouseDown = this.handleMouseDown.bind(this), this.handleResizeStart = this.handleResizeStart.bind(this), e.root.addEventListener("dragover", (t) => t.preventDefault()), e.root.addEventListener("drop", this.handleDrop), e.root.addEventListener("click", this.handleClick), e.root.addEventListener("dblclick", this.handleDblClick), e.root.addEventListener("mousedown", this.handleMouseDown);
  }
  open() {
    const e = this.getSelectedFigure(), t = e == null ? void 0 : e.querySelector("img"), i = e == null ? void 0 : e.querySelector("figcaption"), n = ["left", "center", "right"].find((s) => e == null ? void 0 : e.classList.contains(`ife-image--${s}`)) ?? "center", o = `
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
                    <input type="text" name="caption" value="${this.escape((i == null ? void 0 : i.textContent) ?? "")}">
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
      onConfirm: (s) => this.handleSubmit(s, e)
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const s = document.createElement("button");
      s.type = "button", s.className = "ife-btn ife-btn--danger", s.textContent = "Remove image", s.addEventListener("mousedown", (a) => a.preventDefault()), s.addEventListener("click", (a) => {
        a.stopPropagation(), this.editor.history.push(), e.remove(), this.editor.emitChange(), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(s);
    }
  }
  /** Returns the currently selected/edited image's <figure>, if any. */
  getSelectedFigure() {
    return this.editor.root.querySelector("figure.ife-image--selected") ?? this.editor.selection.closest("figure.ife-image");
  }
  async handleSubmit(e, t) {
    const i = new FormData(e), n = i.get("file");
    let o = String(i.get("src") ?? "");
    if (n instanceof File && n.size > 0 && (o = await this.upload(n), !o) || !o) return;
    const s = {
      src: o,
      alt: String(i.get("alt") ?? ""),
      caption: String(i.get("caption") ?? ""),
      align: String(i.get("align") ?? "center"),
      lazy: !!i.get("lazy")
    };
    t ? this.update(t, s) : this.insert(s);
  }
  /** @param {File} file */
  async upload(e) {
    var n;
    if (!this.uploadUrl)
      return console.warn("InkForge Editor: no uploadUrl configured, falling back to a local object URL."), URL.createObjectURL(e);
    const t = new FormData();
    t.append("file", e);
    const i = (n = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : n.content;
    try {
      const o = await fetch(this.uploadUrl, {
        method: "POST",
        headers: i ? { "X-CSRF-TOKEN": i } : {},
        body: t,
        credentials: "same-origin"
      }), s = await o.json();
      if (!o.ok || !s.success)
        throw new Error(s.message ?? "Upload failed");
      return s.url;
    } catch (o) {
      return this.editor.events.emit("error", o), null;
    }
  }
  /**
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  insert({ src: e, alt: t, caption: i, align: n, lazy: o }) {
    this.editor.history.push(), this.editor.selection.restore();
    const s = document.createElement("figure");
    s.className = `ife-image ife-image--${n}`;
    const a = document.createElement("img");
    if (this.editor.sanitizer.isSafeUrl(e) && (a.src = e), a.alt = t, o && (a.loading = "lazy"), s.appendChild(a), i) {
      const r = document.createElement("figcaption");
      r.textContent = i, s.appendChild(r);
    }
    const l = this.editor.selection.getRange();
    l == null || l.deleteContents(), l == null || l.insertNode(s), this.editor.emitChange();
  }
  /**
   * Updates an already-inserted <figure class="ife-image"> in place instead
   * of creating a new one, so the "edit image" flow doesn't duplicate it.
   * @param {HTMLElement} figure
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  update(e, { src: t, alt: i, caption: n, align: o, lazy: s }) {
    this.editor.history.push(), e.className = `ife-image ife-image--${o}`;
    const a = e.querySelector("img");
    a && (this.editor.sanitizer.isSafeUrl(t) && (a.src = t), a.alt = i, s ? a.setAttribute("loading", "lazy") : a.removeAttribute("loading"));
    let l = e.querySelector("figcaption");
    n ? (l || (l = document.createElement("figcaption"), e.appendChild(l)), l.textContent = n) : l && l.remove(), e.classList.remove("ife-image--selected"), this.editor.emitChange();
  }
  /** Marks the clicked image's <figure> as selected (for edit/resize), or clears selection. */
  handleClick(e) {
    var i;
    const t = e.target.closest("figure.ife-image img");
    this.editor.root.querySelectorAll(".ife-image--selected").forEach((n) => n.classList.remove("ife-image--selected")), t ? ((i = t.closest("figure")) == null || i.classList.add("ife-image--selected"), this.showResizeHandles(t)) : this.hideResizeHandles();
  }
  /** Adds visible resize handles around a selected image. */
  showResizeHandles(e) {
    this.hideResizeHandles();
    const t = document.createElement("div");
    t.className = "ife-image-resize-handles", ["nw", "ne", "sw", "se"].forEach((n) => {
      const o = document.createElement("div");
      o.className = `ife-image-resize-handle ife-image-resize-handle--${n}`, o.addEventListener("mousedown", (s) => this.handleResizeStart(s, e)), t.appendChild(o);
    }), e.parentElement && e.parentElement.appendChild(t);
  }
  /** Removes visible resize handles. */
  hideResizeHandles() {
    this.editor.root.querySelectorAll(".ife-image-resize-handles").forEach((e) => e.remove());
  }
  /** Drag-start for visible resize handles. */
  handleResizeStart(e, t) {
    e.preventDefault(), e.stopPropagation();
    const i = e.clientX, n = e.clientY, o = t.getBoundingClientRect().width, s = t.getBoundingClientRect().height, a = (r) => {
      const h = r.clientX - i, m = r.clientY - n, p = o / s;
      let d = Math.max(40, o + h), c = Math.max(40, s + m);
      Math.abs(h) > Math.abs(m) ? c = d / p : d = c * p, t.style.width = `${Math.round(d)}px`, t.style.height = `${Math.round(c)}px`;
    }, l = () => {
      document.removeEventListener("mousemove", a), document.removeEventListener("mouseup", l), this.editor.emitChange();
    };
    document.addEventListener("mousemove", a), document.addEventListener("mouseup", l);
  }
  /** Double-clicking an image opens the edit dialog directly. */
  handleDblClick(e) {
    var i;
    const t = e.target.closest("figure.ife-image img");
    t && (e.preventDefault(), this.editor.root.querySelectorAll(".ife-image--selected").forEach((n) => n.classList.remove("ife-image--selected")), (i = t.closest("figure")) == null || i.classList.add("ife-image--selected"), this.open());
  }
  /** Alt+drag on an image resizes it (avoids clashing with normal caret placement). */
  handleMouseDown(e) {
    const t = e.target.closest("figure.ife-image img");
    if (!t || !e.altKey) return;
    e.preventDefault();
    const i = e.clientX, n = t.getBoundingClientRect().width, o = (a) => {
      const l = a.clientX - i;
      t.style.width = `${Math.max(40, n + l)}px`;
    }, s = () => {
      document.removeEventListener("mousemove", o), document.removeEventListener("mouseup", s), this.editor.emitChange();
    };
    document.addEventListener("mousemove", o), document.addEventListener("mouseup", s);
  }
  /** @param {DragEvent} event */
  async handleDrop(e) {
    var n, o;
    const t = (o = (n = e.dataTransfer) == null ? void 0 : n.files) == null ? void 0 : o[0];
    if (!t || !t.type.startsWith("image/")) return;
    e.preventDefault();
    const i = await this.upload(t);
    i && (this.editor.selection.save(), this.insert({ src: i, alt: "", caption: "", align: "center", lazy: !0 }));
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
//# sourceMappingURL=ImageModule-CyUTEWJx.js.map
