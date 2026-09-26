import { L as o } from "./index-CO1fWwaT.js";
const s = 120, r = 32;
class d {
  constructor(e) {
    this.editor = e, this.drag = null, this.handlePointerDown = this.handlePointerDown.bind(this), this.handlePointerMove = this.handlePointerMove.bind(this), this.handlePointerUp = this.handlePointerUp.bind(this), this.handleKeyDown = this.handleKeyDown.bind(this), this.buildDom(), this.bindEvents();
  }
  buildDom() {
    this.el = document.createElement("div"), this.el.className = "ife-resize-handle", this.el.setAttribute("role", "separator"), this.el.setAttribute("aria-orientation", "horizontal"), this.el.setAttribute("aria-valuemin", String(s)), this.el.tabIndex = 0, this.updateAriaLabel(), this.editor.wrapper.appendChild(this.el);
  }
  bindEvents() {
    this.el.addEventListener("pointerdown", this.handlePointerDown), this.el.addEventListener("keydown", this.handleKeyDown);
  }
  updateAriaLabel() {
    const e = this.editor.options.locale ?? "en";
    this.el.setAttribute("aria-label", o.t(e, "resizeHandle"));
  }
  /**
   * The content box height in px, measured from the live layout.
   *
   * `min-height`/`max-height` size the *content* box (box-sizing is
   * content-box here), so the padding is excluded — otherwise the first drag
   * step would jump by twice the padding.
   *
   * @returns {number}
   */
  getHeight() {
    var n;
    const e = this.editor.root, t = (n = window.getComputedStyle) == null ? void 0 : n.call(window, e), i = t ? (parseFloat(t.paddingTop) || 0) + (parseFloat(t.paddingBottom) || 0) : 0;
    return (e.getBoundingClientRect().height || e.offsetHeight) - i;
  }
  /**
   * The single write path for a user-driven height: the option is the source
   * of truth, `applyHeight()` renders it.
   *
   * @param {number} height px
   */
  setHeight(e) {
    const t = Math.max(s, Math.round(e));
    this.editor.options.height = t, this.editor.applyHeight(), this.updateAriaValue();
  }
  updateAriaValue() {
    this.el.setAttribute("aria-valuenow", String(Math.round(this.getHeight())));
  }
  handlePointerDown(e) {
    e.button !== void 0 && e.button !== 0 || (e.preventDefault(), this.drag = {
      startY: e.clientY,
      startHeight: this.getHeight()
    }, this.updateAriaValue(), this.editor.wrapper.classList.add("ife-resizing"), window.addEventListener("pointermove", this.handlePointerMove), window.addEventListener("pointerup", this.handlePointerUp), window.addEventListener("pointercancel", this.handlePointerUp));
  }
  handlePointerMove(e) {
    this.drag && this.setHeight(this.drag.startHeight + (e.clientY - this.drag.startY));
  }
  handlePointerUp() {
    this.drag && (this.drag = null, this.editor.wrapper.classList.remove("ife-resizing"), window.removeEventListener("pointermove", this.handlePointerMove), window.removeEventListener("pointerup", this.handlePointerUp), window.removeEventListener("pointercancel", this.handlePointerUp));
  }
  /** Arrow keys resize in 32px steps, so the grip is usable without a mouse. */
  handleKeyDown(e) {
    const t = e.shiftKey ? r * 3 : r;
    let i = 0;
    if (e.key === "ArrowUp") i = -t;
    else if (e.key === "ArrowDown") i = t;
    else return;
    e.preventDefault(), this.setHeight(this.getHeight() + i);
  }
  destroy() {
    this.handlePointerUp(), this.el.removeEventListener("pointerdown", this.handlePointerDown), this.el.removeEventListener("keydown", this.handleKeyDown), this.el.remove();
  }
}
export {
  d as default
};
//# sourceMappingURL=ResizeModule-B9lviRJC.js.map
