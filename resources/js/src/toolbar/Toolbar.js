import ToolbarConfig from './ToolbarConfig.js';
import Localization from '../i18n/Localization.js';

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

        this.el = document.createElement('div');
        this.el.className = 'ife-toolbar';
        this.el.setAttribute('role', 'toolbar');
        this.el.setAttribute('aria-label', 'Text formatting');

        this.render();
        this.editor.wrapper.insertBefore(this.el, this.editor.root);

        this.editor.on('selectionchange', () => this.syncActiveStates());
        this.editor.on('focus', () => this.syncActiveStates());
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
            this.editor.selection.restore();
            def.onChange(this.editor, select.value);
            this.syncActiveStates();
        });

        this.buttons.set(id, select);
        return select;
    }

    buildColorPicker(id, def) {
        const locale = this.editor.options.locale ?? 'en';
        const label = Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label;
        const wrapper = document.createElement('label');
        wrapper.className = 'ife-toolbar__color';
        wrapper.title = label;
        wrapper.innerHTML = def.icon;

        const input = document.createElement('input');
        input.type = 'color';
        input.setAttribute('aria-label', label);
        input.addEventListener('input', () => {
            this.editor.selection.restore();
            this.editor.commands.exec(def.command, input.value);
        });

        wrapper.appendChild(input);
        this.buttons.set(id, wrapper);
        return wrapper;
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

    destroy() {
        this.el.remove();
    }
}
