import { D as u } from "./index-DuOeHlvd.js";
class v {
  constructor(e) {
    this.editor = e, this.uploadUrl = e.options.uploadUrl, this.handleDrop = this.handleDrop.bind(this), this.handleClick = this.handleClick.bind(this), this.handleDblClick = this.handleDblClick.bind(this), this.handleMouseDown = this.handleMouseDown.bind(this), this.handleResizeStart = this.handleResizeStart.bind(this), this.handleDragOverPrevent = (t) => t.preventDefault(), e.root.addEventListener("dragover", this.handleDragOverPrevent), e.root.addEventListener("drop", this.handleDrop), e.root.addEventListener("click", this.handleClick), e.root.addEventListener("dblclick", this.handleDblClick), e.root.addEventListener("mousedown", this.handleMouseDown);
  }
  open() {
    const e = this.getSelectedFigure(), t = e == null ? void 0 : e.querySelector("img"), n = e == null ? void 0 : e.querySelector("figcaption"), s = ["none", "left", "center", "right"].find((i) => e == null ? void 0 : e.classList.contains(`ife-image--${i}`)) ?? "center", a = `
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
                    <input type="text" name="caption" value="${this.escape((n == null ? void 0 : n.textContent) ?? "")}">
                </label>
                <label class="ife-field">
                    <span>Alignment</span>
                    <select name="align">
                        <option value="none" ${s === "none" ? "selected" : ""}>None</option>
                        <option value="left" ${s === "left" ? "selected" : ""}>Left</option>
                        <option value="center" ${s === "center" ? "selected" : ""}>Center</option>
                        <option value="right" ${s === "right" ? "selected" : ""}>Right</option>
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
      bodyHtml: a,
      confirmLabel: e ? "Update" : "Insert",
      onConfirm: (i) => {
        const o = new FormData(i), l = o.get("file");
        if (!(l instanceof File && l.size > 0) && !String(o.get("src") ?? "").trim()) return !1;
        this.handleSubmit(i, e);
      }
    }), this.editor.selection.save(), this.dialog.open(), e) {
      const i = document.createElement("button");
      i.type = "button", i.className = "ife-btn ife-btn--danger", i.textContent = "Remove image", i.addEventListener("mousedown", (o) => o.preventDefault()), i.addEventListener("click", (o) => {
        o.stopPropagation(), this.editor.history.push(), e.remove(), this.editor.emitChange(), this.dialog.close();
      }), this.dialog.form.querySelector(".ife-dialog__footer").prepend(i);
    }
  }
  /** Returns the currently selected/edited image's <figure>, if any. */
  getSelectedFigure() {
    return this.editor.root.querySelector("figure.ife-image--selected") ?? this.editor.selection.closest("figure.ife-image");
  }
  async handleSubmit(e, t) {
    const n = new FormData(e), s = n.get("file");
    let a = String(n.get("src") ?? "").trim();
    if (s instanceof File && s.size > 0 && (a = await this.upload(s), !a) || !a) return;
    const i = {
      src: a,
      alt: String(n.get("alt") ?? ""),
      caption: String(n.get("caption") ?? ""),
      align: String(n.get("align") ?? "center"),
      lazy: !!n.get("lazy")
    };
    t ? this.update(t, i) : this.insert(i);
  }
  /** @param {File} file */
  async upload(e) {
    var s;
    if (!this.uploadUrl)
      return console.warn("WYSIWYG Editor: no uploadUrl configured, falling back to a local object URL."), URL.createObjectURL(e);
    const t = new FormData();
    t.append("file", e);
    const n = (s = document.querySelector('meta[name="csrf-token"]')) == null ? void 0 : s.content;
    try {
      const a = await fetch(this.uploadUrl, {
        method: "POST",
        headers: n ? { "X-CSRF-TOKEN": n } : {},
        body: t,
        credentials: "same-origin"
      }), i = await a.json();
      if (!a.ok || !i.success)
        throw new Error(i.message ?? "Upload failed");
      return i.url;
    } catch (a) {
      return this.editor.events.emit("error", a), null;
    }
  }
  /**
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  insert({ src: e, alt: t, caption: n, align: s, lazy: a }) {
    this.editor.history.push(), this.editor.selection.restore();
    const i = document.createElement("figure");
    i.className = `ife-image ife-image--${s}`;
    const o = document.createElement("img");
    if (this.editor.sanitizer.isSafeUrl(e) && (o.src = e), o.alt = t, a && (o.loading = "lazy"), i.appendChild(o), n) {
      const c = document.createElement("figcaption");
      c.textContent = n, i.appendChild(c);
    }
    const l = this.editor.selection.getRange();
    l ? (l.deleteContents(), l.insertNode(i)) : this.editor.root.appendChild(i);
    const r = document.createRange();
    r.setStartAfter(i), r.collapse(!0), this.editor.selection.setRange(r), this.editor.emitChange();
  }
  /**
   * Updates an already-inserted <figure class="ife-image"> in place instead
   * of creating a new one, so the "edit image" flow doesn't duplicate it.
   * @param {HTMLElement} figure
   * @param {{src:string, alt:string, caption:string, align:string, lazy:boolean}} options
   */
  update(e, { src: t, alt: n, caption: s, align: a, lazy: i }) {
    this.editor.history.push(), e.className = `ife-image ife-image--${a}`;
    const o = e.querySelector("img");
    if (o && (this.editor.sanitizer.isSafeUrl(t) && (o.src = t), o.alt = n, i ? o.setAttribute("loading", "lazy") : o.removeAttribute("loading")), e.querySelectorAll("figcaption").forEach((l) => l.remove()), s) {
      const l = document.createElement("figcaption");
      l.textContent = s, e.appendChild(l);
    }
    e.classList.remove("ife-image--selected"), this.editor.emitChange();
  }
  /** Marks the clicked image's <figure> as selected (for edit/resize), or clears selection. */
  handleClick(e) {
    var n;
    const t = e.target.closest("figure.ife-image img");
    this.editor.root.querySelectorAll(".ife-image--selected").forEach((s) => s.classList.remove("ife-image--selected")), t ? ((n = t.closest("figure")) == null || n.classList.add("ife-image--selected"), this.showResizeHandles(t)) : this.hideResizeHandles();
  }
  /** Adds visible resize handles around a selected image. */
  showResizeHandles(e) {
    this.hideResizeHandles();
    const t = document.createElement("ife-image-resize-handles");
    t.className = "ife-image-resize-handles", ["nw", "ne", "sw", "se"].forEach((s) => {
      const a = document.createElement("ife-image-resize-handle");
      a.className = `ife-image-resize-handle ife-image-resize-handle--${s}`, a.addEventListener("mousedown", (i) => this.handleResizeStart(i, e)), t.appendChild(a);
    }), e.parentElement && e.parentElement.appendChild(t);
  }
  /** Removes visible resize handles. */
  hideResizeHandles() {
    this.editor.root.querySelectorAll(".ife-image-resize-handles").forEach((e) => e.remove());
  }
  /** Drag-start for visible resize handles. */
  handleResizeStart(e, t) {
    e.preventDefault(), e.stopPropagation();
    const n = e.clientX, s = e.clientY, a = t.getBoundingClientRect().width, i = t.getBoundingClientRect().height, o = (r) => {
      const c = r.clientX - n, m = r.clientY - s, p = a / i;
      let d = Math.max(40, a + c), h = Math.max(40, i + m);
      Math.abs(c) > Math.abs(m) ? h = d / p : d = h * p, t.style.width = `${Math.round(d)}px`, t.style.height = `${Math.round(h)}px`;
    }, l = () => {
      document.removeEventListener("mousemove", o), document.removeEventListener("mouseup", l), this.editor.emitChange();
    };
    document.addEventListener("mousemove", o), document.addEventListener("mouseup", l);
  }
  /** Double-clicking an image opens the edit dialog directly. */
  handleDblClick(e) {
    var n;
    const t = e.target.closest("figure.ife-image img");
    t && (e.preventDefault(), this.editor.root.querySelectorAll(".ife-image--selected").forEach((s) => s.classList.remove("ife-image--selected")), (n = t.closest("figure")) == null || n.classList.add("ife-image--selected"), this.open());
  }
  /** Alt+drag on an image resizes it (avoids clashing with normal caret placement). */
  handleMouseDown(e) {
    const t = e.target.closest("figure.ife-image img");
    if (!t || !e.altKey) return;
    e.preventDefault();
    const n = e.clientX, s = t.getBoundingClientRect().width, a = (o) => {
      const l = o.clientX - n;
      t.style.width = `${Math.max(40, s + l)}px`;
    }, i = () => {
      document.removeEventListener("mousemove", a), document.removeEventListener("mouseup", i), this.editor.emitChange();
    };
    document.addEventListener("mousemove", a), document.addEventListener("mouseup", i);
  }
  /** @param {DragEvent} event */
  async handleDrop(e) {
    var s, a;
    const t = (a = (s = e.dataTransfer) == null ? void 0 : s.files) == null ? void 0 : a[0];
    if (!t || !t.type.startsWith("image/")) return;
    e.preventDefault();
    const n = await this.upload(t);
    n && (this.editor.selection.save(), this.insert({ src: n, alt: "", caption: "", align: "center", lazy: !0 }));
  }
  escape(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  destroy() {
    var e;
    (e = this.dialog) == null || e.close(), this.editor.root.removeEventListener("dragover", this.handleDragOverPrevent), this.editor.root.removeEventListener("drop", this.handleDrop), this.editor.root.removeEventListener("click", this.handleClick), this.editor.root.removeEventListener("dblclick", this.handleDblClick), this.editor.root.removeEventListener("mousedown", this.handleMouseDown), this.hideResizeHandles();
  }
}
export {
  v as default
};
//# sourceMappingURL=ImageModule-BBABgJK1.js.map
