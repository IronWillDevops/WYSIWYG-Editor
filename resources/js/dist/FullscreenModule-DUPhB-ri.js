class i {
  constructor(e) {
    this.editor = e, this.active = !1, this.handleChange = this.handleChange.bind(this), document.addEventListener("fullscreenchange", this.handleChange);
  }
  async toggle() {
    return this.active ? await this.exit() : await this.enter(), this.active;
  }
  async enter() {
    try {
      this.editor.wrapper.requestFullscreen && await this.editor.wrapper.requestFullscreen(), this.editor.wrapper.classList.add("ife-fullscreen"), this.active = !0;
    } catch {
      return;
    }
  }
  async exit() {
    try {
      document.fullscreenElement && await document.exitFullscreen();
    } catch {
    }
    this.editor.wrapper.classList.remove("ife-fullscreen"), this.active = !1;
  }
  handleChange() {
    var e;
    if (!document.fullscreenElement) {
      this.editor.wrapper.classList.remove("ife-fullscreen");
      const t = this.active;
      this.active = !1, t && ((e = this.editor.events) == null || e.emit("fullscreenchange", this.editor));
    }
  }
  destroy() {
    document.removeEventListener("fullscreenchange", this.handleChange);
  }
}
export {
  i as default
};
//# sourceMappingURL=FullscreenModule-DUPhB-ri.js.map
