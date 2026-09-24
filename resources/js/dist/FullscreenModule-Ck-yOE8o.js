class i {
  constructor(e) {
    this.editor = e, this.active = !1, this._previousMaxHeight = "", this.handleChange = this.handleChange.bind(this), document.addEventListener("fullscreenchange", this.handleChange);
  }
  async toggle() {
    return this.active ? await this.exit() : await this.enter(), this.active;
  }
  async enter() {
    try {
      this.editor.wrapper.requestFullscreen && await this.editor.wrapper.requestFullscreen(), this.editor.wrapper.classList.add("ife-fullscreen"), this.editor.root && (this._previousMaxHeight = this.editor.root.style.maxHeight, this.editor.root.style.maxHeight = "none"), this.active = !0;
    } catch {
      return;
    }
  }
  async exit() {
    try {
      document.fullscreenElement && await document.exitFullscreen();
    } catch {
    }
    this.editor.wrapper.classList.remove("ife-fullscreen"), this._restoreMaxHeight(), this.active = !1;
  }
  handleChange() {
    document.fullscreenElement || (this.editor.wrapper.classList.remove("ife-fullscreen"), this._restoreMaxHeight(), this.active = !1);
  }
  /** Puts the editor's previous inline max-height back ('' = unset). */
  _restoreMaxHeight() {
    this.editor.root && (this.editor.root.style.maxHeight = this._previousMaxHeight || ""), this._previousMaxHeight = "";
  }
  destroy() {
    document.removeEventListener("fullscreenchange", this.handleChange);
  }
}
export {
  i as default
};
//# sourceMappingURL=FullscreenModule-Ck-yOE8o.js.map
