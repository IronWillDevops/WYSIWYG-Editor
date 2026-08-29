import ToolbarConfig from './ToolbarConfig.js';
import Localization from '../i18n/Localization.js';
import ColorPickerModule from './ColorPickerModule.js';

const DEFAULT_LAYOUT = [
    ['undo', 'redo'],
    ['blockFormat'],
    ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'],
    ['forecolor', 'backcolor', 'removeFormat'],
    ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
    ['ltr', 'rtl'],
    ['bulletList', 'orderedList', 'checklist', 'indent', 'outdent', 'listProps'],
    ['link', 'unlink', 'image', 'video', 'audio', 'table', 'hr'],
    ['blockquote', 'codeInline', 'codeBlock', 'note'],
    ['emoji', 'specialChars'],
    ['date', 'time', 'anchor', 'templates'],
    ['markdown'],
    ['find', 'sourceCode', 'fullscreen'],
];

/** Builds a configurable, accessible toolbar and wires clicks to editor commands. */
export default class Toolbar {
    /**
     * @param {import('../core/Editor').default} editor
     * @param {Array<string[]>|null} [layout]
     */
    constructor(editor, layout = null) {
        this.editor = editor;
        this.layout = layout ?? DEFAULT_LAYOUT;
        this.buttons = new Map();
        this._colorPickers = new Map();

        this.el = document.createElement('div');
        this.el.className = 'ife-toolbar';
        this.el.setAttribute('role', 'toolbar');
        this.el.setAttribute('aria-label', 'Text formatting');

        this.render();
        this.editor.wrapper.insertBefore(this.el, this.editor.root);

        this.editor.on('selectionchange', () => this.syncActiveStates());
        this.editor.on('focus', () => this.syncActiveStates());

        // Live recolouring: while the user picks a color the toolbar remembers it
        // as "pending"; as they then drag a selection handle to expand the
        // selection, every selectionchange re-applies that color to the growing
        // text (idempotently, without collapsing the live selection) so the new
        // portion is tinted as it is selected.
        this._liveColor = null;
        this._liveTimer = null;
        this._liveIdleTimer = null;
        this._liveLastSelection = '';
        this._handleLiveSelection = () => {
            if (!this._liveColor) return;
            const sel = this.editor.selection.getNativeSelection();
            if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
            const range = sel.getRangeAt(0);
            if (!this.editor.root.contains(range.commonAncestorContainer)) return;
            const text = sel.toString();
            if (!text.trim()) return;
            if (text !== this._liveLastSelection) {
                clearTimeout(this._liveTimer);
                this._liveTimer = setTimeout(() => {
                    this._liveLastSelection = text;
                    const { command, value } = this._liveColor;
                    // Re-save the grown selection before exec: exec() restores
                    // the saved selection, so without this it would clobber the
                    // grown text back to the original pick and never colour it.
                    this.editor.selection.save();
                    this.editor.commands.exec(command, value);
                }, 40);
            }
            // Stop live recolouring shortly after the drag settles so a later,
            // unrelated selection isn't tinted automatically.
            clearTimeout(this._liveIdleTimer);
            this._liveIdleTimer = setTimeout(() => this.disarmLiveColor(), 1500);
        };
        document.addEventListener('selectionchange', this._handleLiveSelection);
        document.addEventListener('mouseup', this._handleLiveSelection);

        // Capture the selection at the toolbar level (capture phase, before any
        // child control's default behavior) so that interacting with native
        // controls that steal focus — the block-format <select>, color inputs,
        // etc. — never loses the user's text selection before the command runs.
        this.el.addEventListener('mousedown', () => {
            this.editor.selection.save();
        }, true);
    }

    render() {
        this.layout.forEach((group) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'ife-toolbar__group';

            group.forEach((id) => {
                const def = ToolbarConfig[id];
                if (!def) return;
                const control = this.buildControl(id, def);
                if (control) groupEl.appendChild(control);
            });

            if (groupEl.children.length) this.el.appendChild(groupEl);
        });

    }

    buildControl(id, def) {
        if (def.type === 'select') return this.buildSelect(id, def);
        if (def.type === 'color') return this.buildColorPicker(id, def);
        return this.buildButton(id, def);
    }

    buildButton(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        let label = Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label;

        if (def.shortcut) {
            const macShortcut = def.shortcut.replace(/Ctrl/g, '⌘');
            label += ` (${def.shortcut} / ${macShortcut})`;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ife-toolbar__btn';
        button.dataset.command = id;
        button.title = label;
        button.setAttribute('aria-label', label);
        button.innerHTML = def.icon ?? '';

        button.addEventListener('mousedown', (event) => event.preventDefault()); // keep editor selection
        button.addEventListener('click', () => {
            this.editor.selection.restore();
            if (def.type === 'command') {
                this.editor.commands.exec(def.command);
            } else {
                def.action?.(this.editor, button);
            }
            if (def.toggle) button.classList.toggle('is-active');
            this.syncActiveStates();
        });

        this.buttons.set(id, button);
        return button;
    }

    buildSelect(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        const select = document.createElement('select');
        select.className = 'ife-toolbar__select';
        select.setAttribute('aria-label', Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label);
        def.options.forEach(([value, text]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        });

        select.addEventListener('pointerdown', () => {
            this.editor.selection.save();
        });
        select.addEventListener('mousedown', () => {
            this.editor.selection.save();
        });
        select.addEventListener('change', () => {
            // Capture the user's chosen value *before* restore(). Restoring the
            // text selection fires a selectionchange that re-runs
            // syncActiveStates(), which rewrites this select to the current
            // block tag. Reading select.value after restore() would therefore
            // apply the stale block tag instead of the format the user picked.
            const value = select.value;
            this.editor.selection.restore();
            def.onChange(this.editor, value);
            this.syncActiveStates();
        });

        this.buttons.set(id, select);
        return select;
    }

    buildColorPicker(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        const label = Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ife-toolbar__btn ife-toolbar__color';
        button.dataset.command = id;
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-haspopup', 'dialog');
        button.innerHTML = def.icon;

        const cssProp = def.command === 'backColor' ? 'backgroundColor' : 'color';

        const picker = new ColorPickerModule(this.editor, button, {
            id,
            cssProp,
            label,
            onChange: (hex) => {
                // Live recolouring: the in-page picker keeps the editor focused,
                // so the selection highlight never drops and each hue/saturation
                // drag, preset click and hex entry recolours the selected text
                // immediately (same live behaviour as the selection-handle
                // recolouring below). The colour is applied unconditionally to
                // preserve a literal preview; clearing is an explicit action.
                this.editor.selection.restoreSavedOffsets();
                this.editor.commands.applyColor(cssProp, hex);
                this.armLiveColor({ command: def.command, value: hex });
            },
            onClear: () => {
                this.editor.selection.restoreSavedOffsets();
                this.editor.commands.clearColor(cssProp);
                this.disarmLiveColor();
            },
        });
        this._colorPickers.set(id, picker);
        button.addEventListener('click', () => {
            // Capture the selection before the picker opens so colour is applied
            // back to exactly the text the user selected.
            this.editor.selection.save();
            picker.toggle();
        });

        this.buttons.set(id, button);
        return button;
    }

    /** Reflects current formatting state (bold/italic/... active) on toolbar buttons. */
    syncActiveStates() {
        const stateMap = {
            bold: 'bold',
            italic: 'italic',
            underline: 'underline',
            strike: 'strikeThrough',
            superscript: 'superscript',
            subscript: 'subscript',
            bulletList: 'insertUnorderedList',
            orderedList: 'insertOrderedList',
        };

        Object.entries(stateMap).forEach(([id, command]) => {
            const button = this.buttons.get(id);
            if (button instanceof HTMLElement) {
                button.classList.toggle('is-active', this.editor.commands.queryState(command));
            }
        });

        const block = this.editor.selection.getBlockElement();
        let activeAlign = '';
        if (block) {
            let el = block;
            while (el && el !== this.editor.root) {
                if (el.style.textAlign) {
                    activeAlign = el.style.textAlign;
                    break;
                }
                el = el.parentElement;
            }
        }

        ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'].forEach((id) => {
            const button = this.buttons.get(id);
            if (button instanceof HTMLElement) {
                button.classList.toggle('is-active', activeAlign === id.replace('align', '').toLowerCase());
            }
        });

        const dirBtnLtr = this.buttons.get('ltr');
        const dirBtnRtl = this.buttons.get('rtl');
        if (dirBtnLtr instanceof HTMLElement && dirBtnRtl instanceof HTMLElement) {
            let activeDir = '';
            if (block) {
                let el = block;
                while (el && el !== this.editor.root) {
                    if (el.dir) {
                        activeDir = el.dir;
                        break;
                    }
                    el = el.parentElement;
                }
            }
            dirBtnLtr.classList.toggle('is-active', activeDir === 'ltr');
            dirBtnRtl.classList.toggle('is-active', activeDir === 'rtl');
        }

        const markdownBtn = this.buttons.get('markdown');
        if (markdownBtn instanceof HTMLElement) {
            markdownBtn.classList.toggle('is-active', this.editor.root.dataset.markdownMode === 'true');
        }

        const blockquoteBtn = this.buttons.get('blockquote');
        if (blockquoteBtn instanceof HTMLElement) {
            let isBlockquote = false;
            if (block) {
                let el = block;
                while (el && el !== this.editor.root) {
                    if (el.tagName === 'BLOCKQUOTE') {
                        isBlockquote = true;
                        break;
                    }
                    el = el.parentElement;
                }
            }
            blockquoteBtn.classList.toggle('is-active', isBlockquote);
        }

        const blockFormatSelect = this.buttons.get('blockFormat');
        if (blockFormatSelect instanceof HTMLSelectElement && block) {
            const tagName = block.tagName.toLowerCase();
            const validValues = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
            blockFormatSelect.value = validValues.includes(tagName) ? tagName : 'p';
        }
    }

    setEnabled(id, enabled) {
        const control = this.buttons.get(id);
        if (control instanceof HTMLButtonElement || control instanceof HTMLSelectElement) {
            control.disabled = !enabled;
        }
    }

    /**
     * Remembers the colour so dragging a selection handle recolours
     * newly-selected text with it (see the document selectionchange hook).
     * @param {{command: string, value: string}} live
     */
    armLiveColor(live) {
        this._liveColor = live;
        this._liveLastSelection = '';
    }

    /** Stops automatic recolouring on selection changes. */
    disarmLiveColor() {
        this._liveColor = null;
        this._liveLastSelection = '';
        clearTimeout(this._liveTimer);
        clearTimeout(this._liveIdleTimer);
    }

    destroy() {
        this.disarmLiveColor();
        this._colorPickers.forEach((picker) => picker.destroy());
        this._colorPickers.clear();
        document.removeEventListener('selectionchange', this._handleLiveSelection);
        document.removeEventListener('mouseup', this._handleLiveSelection);
        this.el.remove();
    }
}
