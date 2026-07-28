import '../../css/inkforge-editor.css';
import EditorCore from './core/Editor.js';
import Toolbar from './toolbar/Toolbar.js';
import './modules/register.js';

/** @type {Map<HTMLElement, EditorCore>} */
const instances = new Map();

/**
 * Public facade matching the TinyMCE-style bootstrap convention:
 *
 *   Editor.init('#editor', { theme: 'dark' });
 *
 * Resolves a selector or element to a <textarea>, mounts the contenteditable
 * surface + toolbar, and returns the underlying Editor instance.
 */
const Editor = {
    /**
     * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
     * @param {import('./core/Editor.js').EditorOptions} [options]
     * @returns {EditorCore}
     */
    init(target, options = {}) {
        const textarea = typeof target === 'string' ? document.querySelector(target) : target;

        if (!textarea) {
            throw new Error(`InkForge Editor: target "${target}" not found`);
        }
        if (textarea.tagName !== 'TEXTAREA') {
            throw new Error('InkForge Editor: init() target must be a <textarea> element');
        }
        if (instances.has(textarea)) {
            return instances.get(textarea);
        }

        const editor = new EditorCore(textarea, options);
        const toolbar = new Toolbar(editor, options.toolbar);
        editor.on('destroy', () => toolbar.destroy());

        instances.set(textarea, editor);
        editor.on('destroy', () => instances.delete(textarea));

        return editor;
    },

    /**
     * @param {string|HTMLTextAreaElement} target
     * @returns {EditorCore|undefined}
     */
    get(target) {
        const textarea = typeof target === 'string' ? document.querySelector(target) : target;
        return textarea ? instances.get(textarea) : undefined;
    },

    /** Destroys every editor instance currently mounted on the page. */
    destroyAll() {
        instances.forEach((editor) => editor.destroy());
        instances.clear();
    },

    registerPlugin: EditorCore.registerPlugin,
};

export default Editor;
