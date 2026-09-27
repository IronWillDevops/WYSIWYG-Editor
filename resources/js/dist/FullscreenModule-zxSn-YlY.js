class i {
  constructor(e) {
    this.editor = e, this.active = !1, this.handleChange = this.handleChange.bind(this), document.addEventListener("fullscreenchange", this.handleChange);
  }
  async toggle() {
    return this.active ? await this.exit() : await this.enter(), this.active;
  }
  async enter() {
    try {
      this.editor.wrapper.requestFullscreen && await this.editor.wrapper.requestFullscreen(), this.editor.wrapper.classList.add("ife-fullscreen"), this.editor.applyHeight(!0), this.active = !0;
    } catch {
      return;
    }
  }
  async exit() {
    try {
      document.fullscreenElement && await document.exitFullscreen();
    } catch {
    }
    this.editor.wrapper.classList.remove("ife-fullscreen"), this.editor.applyHeight(!1), this.active = !1;
  }
  handleChange() {
    document.fullscreenElement || (this.editor.wrapper.classList.remove("ife-fullscreen"), this.editor.applyHeight(!1), this.active = !1);
  }
  destroy() {
    document.removeEventListener("fullscreenchange", this.handleChange);
  }
}
export {
  i as default
};
//# sourceMappingURL=FullscreenModule-zxSn-YlY.js.map
