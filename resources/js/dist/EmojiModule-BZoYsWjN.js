class k {
  constructor(t) {
    this.editor = t, this.picker = null, this._triggerEl = null, this._boundOnResize = null, this._boundOnScroll = null, this._boundOnClickOutside = null;
  }
  open(t) {
    if (this.picker) {
      this.close();
      return;
    }
    this._triggerEl = t || this.editor.wrapper.querySelector('[data-command="emoji"]'), this.editor.selection.save(), this.picker = document.createElement("div"), this.picker.className = "ife-emoji-picker", this.picker.setAttribute("role", "dialog"), this.picker.setAttribute("aria-label", "Emoji picker");
    const s = document.createElement("div");
    s.className = "ife-emoji-picker__header";
    const r = document.createElement("span");
    r.className = "ife-emoji-picker__title", r.textContent = "Emoji", s.appendChild(r);
    const e = document.createElement("button");
    e.type = "button", e.className = "ife-emoji-picker__close", e.innerHTML = "&times;", e.setAttribute("aria-label", "Close"), e.addEventListener("click", () => this.close()), s.appendChild(e), this.picker.appendChild(s);
    const n = [
      { name: "Smileys", emojis: [
        "😀",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "🤣",
        "😂",
        "🙂",
        "😊",
        "😇",
        "🥰",
        "😍",
        "🤩",
        "😘",
        "😗",
        "😚",
        "😙",
        "🥲",
        "😋",
        "😛",
        "😜",
        "🤪",
        "😝",
        "🤑",
        "🤗",
        "🤭",
        "🫢",
        "🫣",
        "🤫",
        "🤔",
        "🫡",
        "🤐",
        "🤨",
        "😐",
        "😑",
        "😶",
        "🫥",
        "😏",
        "😒",
        "🙄",
        "😬",
        "🤥",
        "😌",
        "😔",
        "😪",
        "🤤",
        "😴",
        "😷",
        "🤒",
        "🤕",
        "🤢",
        "🤮",
        "🥴",
        "😵",
        "🤯",
        "🥳",
        "🥺",
        "😢",
        "😭",
        "😤",
        "😠",
        "😡",
        "🤬",
        "💀",
        "☠️",
        "💩",
        "🤡",
        "👹",
        "👺"
      ] },
      { name: "Gestures", emojis: [
        "👋",
        "🤚",
        "🖐️",
        "✋",
        "🖖",
        "🫱",
        "🫲",
        "🫳",
        "🫴",
        "👌",
        "🤌",
        "🤏",
        "✌️",
        "🤞",
        "🫰",
        "🤟",
        "🤘",
        "🤙",
        "👈",
        "👉",
        "👆",
        "🖕",
        "👇",
        "🫵",
        "👍",
        "👎",
        "✊",
        "👊",
        "🤛",
        "🤜",
        "👏",
        "🙌",
        "🫶",
        "👐",
        "🤲",
        "🤝",
        "🙏",
        "✍️",
        "💅",
        "🤳"
      ] },
      { name: "Nature", emojis: [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐸",
        "🐵",
        "🐔",
        "🐧",
        "🐦",
        "🐤",
        "🦆",
        "🦅",
        "🦉",
        "🦇",
        "🐺",
        "🐗",
        "🐴",
        "🦄",
        "🐝",
        "🐛",
        "🦋",
        "🐌",
        "🐞",
        "🐜",
        "🦟",
        "🦗",
        "🪳",
        "🪰",
        "🪱",
        "🐢",
        "🐍",
        "🦎",
        "🦖",
        "🦕",
        "🐙",
        "🦑",
        "🦐",
        "🦞",
        "🦀",
        "🐡",
        "🐠"
      ] },
      { name: "Food", emojis: [
        "🍏",
        "🍎",
        "🍐",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🫐",
        "🍈",
        "🍒",
        "🍑",
        "🥭",
        "🍍",
        "🥥",
        "🥝",
        "🍅",
        "🍆",
        "🥑",
        "🥦",
        "🥬",
        "🥒",
        "🌶️",
        "🫑",
        "🌽",
        "🥕",
        "🫒",
        "🧄",
        "🧅",
        "🥔",
        "🍠",
        "🫓",
        "🥐",
        "🥖",
        "🥨",
        "🧀",
        "🥚",
        "🍳",
        "🥞",
        "🧇",
        "🥓",
        "🥩",
        "🍗",
        "🍖",
        "🦴",
        "🌭",
        "🍔",
        "🍟",
        "🍕"
      ] },
      { name: "Symbols", emojis: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "🤍",
        "🤎",
        "💔",
        "❣️",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "💝",
        "💟",
        "☮️",
        "✝️",
        "☪️",
        "🕉️",
        "☸️",
        "✡️",
        "🔯",
        "🕎",
        "☯️",
        "🪯",
        "♈",
        "♉",
        "♊",
        "♋",
        "♌",
        "♍",
        "♎",
        "♏",
        "♐",
        "♑",
        "♒",
        "♓",
        "⛎",
        "🔀",
        "🔁",
        "🔂",
        "▶️",
        "⏩",
        "⏭️",
        "⏯️",
        "◀️"
      ] }
    ], l = document.createElement("div");
    l.className = "ife-emoji-picker__body", n.forEach((i) => {
      const d = document.createElement("div");
      d.className = "ife-emoji-picker__group";
      const p = document.createElement("div");
      p.className = "ife-emoji-picker__group-label", p.textContent = i.name, d.appendChild(p);
      const a = document.createElement("div");
      a.className = "ife-emoji-picker__grid", i.emojis.forEach((h) => {
        const o = document.createElement("button");
        o.type = "button", o.className = "ife-emoji-picker__btn", o.textContent = h, o.setAttribute("aria-label", h), o.addEventListener("mousedown", (u) => u.preventDefault()), o.addEventListener("click", () => {
          this.editor.selection.restore(), this.editor.commands.insertHTML(h), this.close();
        }), a.appendChild(o);
      }), d.appendChild(a), l.appendChild(d);
    }), this.picker.appendChild(l), document.body.appendChild(this.picker);
    const c = this.editor.wrapper;
    this.picker.style.setProperty("--ife-bg", getComputedStyle(c).getPropertyValue("--ife-bg")), this.picker.style.setProperty("--ife-text", getComputedStyle(c).getPropertyValue("--ife-text")), this.picker.style.setProperty("--ife-border", getComputedStyle(c).getPropertyValue("--ife-border")), this.picker.style.setProperty("--ife-btn-hover", getComputedStyle(c).getPropertyValue("--ife-btn-hover")), this.picker.style.setProperty("--ife-btn-active", getComputedStyle(c).getPropertyValue("--ife-btn-active")), this.positionPicker(), this._boundOnResize = () => this.positionPicker(), this._boundOnScroll = () => {
      this.picker && this.positionPicker();
    }, this._boundOnClickOutside = (i) => {
      this.picker && (this.picker.contains(i.target) || this._triggerEl && this._triggerEl.contains(i.target) || this.close());
    }, window.addEventListener("resize", this._boundOnResize), window.addEventListener("scroll", this._boundOnScroll, { passive: !0 }), document.addEventListener("click", this._boundOnClickOutside), setTimeout(() => {
      if (!this.picker) return;
      const i = this.picker.querySelector(".ife-emoji-picker__btn");
      i && i.focus();
    }, 50);
  }
  positionPicker() {
    if (!this._triggerEl || !this.picker) return;
    const t = this._triggerEl.getBoundingClientRect(), s = this.picker.offsetWidth || 352, r = this.picker.offsetHeight;
    let e = t.bottom + 4, n = t.left;
    e + r > window.innerHeight && t.top - r - 4 > 0 && (e = t.top - r - 4), n + s > window.innerWidth && (n = Math.max(8, window.innerWidth - s - 8)), n < 0 && (n = 8);
    const l = parseFloat(getComputedStyle(this.editor.wrapper).zIndex);
    isNaN(l) || (this.picker.style.zIndex = l + 1), this.picker.style.top = `${e}px`, this.picker.style.left = `${n}px`;
  }
  close() {
    this.picker && (this.picker.remove(), this.picker = null), this._triggerEl = null, this._removeListeners();
  }
  _removeListeners() {
    this._boundOnResize && (window.removeEventListener("resize", this._boundOnResize), this._boundOnResize = null), this._boundOnScroll && (window.removeEventListener("scroll", this._boundOnScroll), this._boundOnScroll = null), this._boundOnClickOutside && (document.removeEventListener("click", this._boundOnClickOutside), this._boundOnClickOutside = null);
  }
  destroy() {
    this.close();
  }
}
export {
  k as default
};
//# sourceMappingURL=EmojiModule-BZoYsWjN.js.map
