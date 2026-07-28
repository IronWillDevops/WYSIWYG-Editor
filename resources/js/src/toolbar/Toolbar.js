import ToolbarConfig from './ToolbarConfig.js';
import Localization from '../i18n/Localization.js';

const DEFAULT_LAYOUT = [
    ['undo', 'redo'],
    ['blockFormat', 'fontFamily', 'fontSize'],
    ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'],
    ['forecolor', 'backcolor', 'removeFormat'],
    ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
    ['bulletList', 'orderedList', 'checklist', 'indent', 'outdent'],
    ['link', 'unlink', 'image', 'video', 'audio', 'table', 'hr'],
    ['blockquote', 'codeInline', 'codeBlock', 'note'],
    ['emoji', 'specialChars'],
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
        const label = Localization.t(locale, id) !== id ? Localization.t(locale, id) : def.label;

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
                def.action?.(this.editor);
            }
            if (def.toggle) button.classList.toggle('is-active');
            this.syncActiveStates();
        });

        this.buttons.set(id, button);
        return button;
    }

    buildSelect(id, def) {
        const select = document.createElement('select');
        select.className = 'ife-toolbar__select';
        select.setAttribute('aria-label', def.label);
        def.options.forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });

        select.addEventListener('mousedown', (event) => event.stopPropagation());
        select.addEventListener('change', () => {
            this.editor.selection.restore();
            def.onChange(this.editor, select.value);
        });

        this.buttons.set(id, select);
        return select;
    }

    buildColorPicker(id, def) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ife-toolbar__color';
        wrapper.title = def.label;
        wrapper.innerHTML = def.icon;

        const input = document.createElement('input');
        input.type = 'color';
        input.setAttribute('aria-label', def.label);
        input.addEventListener('input', () => {
            this.editor.selection.restore();
            this.editor.commands.exec(def.command, input.value);
        });
        input.addEventListener('click', (e) => {
            if (wrapper.classList.contains('is-active')) {
                e.preventDefault();
                this.editor.selection.restore();
                this.editor.commands.exec(def.command, '');
            }
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

        ['forecolor', 'backcolor'].forEach((id) => {
            const btn = this.buttons.get(id);
            if (!(btn instanceof HTMLElement)) return;
            const cssProp = id === 'forecolor' ? 'color' : 'backgroundColor';
            btn.classList.toggle('is-active', this.hasStyle(cssProp));
        });

        this.syncAlignment();
        this.syncContextual();
    }

    syncAlignment() {
        const block = this.editor.selection.getBlockElement();
        let align = block ? window.getComputedStyle(block).textAlign : 'left';
        if (align === 'start') align = 'left';
        if (align === 'end') align = 'right';
        const alignMap = { alignLeft: 'left', alignCenter: 'center', alignRight: 'right', alignJustify: 'justify' };
        Object.entries(alignMap).forEach(([id, value]) => {
            const btn = this.buttons.get(id);
            if (btn instanceof HTMLElement) {
                btn.classList.toggle('is-active', align === value);
            }
        });
    }

    syncContextual() {
        const sel = this.editor.selection;

        const hasLink = !!sel.closest('a');
        const linkBtn = this.buttons.get('link');
        const unlinkBtn = this.buttons.get('unlink');
        if (linkBtn instanceof HTMLElement) linkBtn.classList.toggle('is-active', hasLink);
        if (unlinkBtn instanceof HTMLElement) unlinkBtn.classList.toggle('is-active', hasLink);

        const contextMap = {
            image: 'figure.ife-image',
            table: 'table',
            codeInline: 'code',
            blockquote: 'blockquote',
            note: '.note',
        };
        Object.entries(contextMap).forEach(([id, selector]) => {
            const btn = this.buttons.get(id);
            if (btn instanceof HTMLElement) {
                btn.classList.toggle('is-active', !!sel.closest(selector));
            }
        });
    }

    /**
     * Checks whether the current selection has a given inline CSS property set.
     * @param {string} cssProp camelCase property name (e.g. 'color', 'backgroundColor')
     * @returns {boolean}
     */
    hasStyle(cssProp) {
        const range = this.editor.selection.getRange();
        if (!range) return false;
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        if (!container) return false;

        if (container instanceof HTMLElement && container.style?.[cssProp]) return true;

        const children = container.querySelectorAll('*');
        for (const el of children) {
            try {
                if (range.intersectsNode(el) && el.style?.[cssProp]) return true;
            } catch {
                continue;
            }
        }
        return false;
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
