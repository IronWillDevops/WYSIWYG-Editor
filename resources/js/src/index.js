import '../../css/wysiwyg-editor.css';
import EditorCore from './core/Editor.js';
import Toolbar from './toolbar/Toolbar.js';
import './modules/register.js';

/** @type {WeakMap<HTMLElement, EditorCore>} */
const instances = new WeakMap();
/** @type {Set<EditorCore>} */
const allInstances = new Set();

/**
 * Public facade matching the TinyMCE-style bootstrap convention:
 *
 *   WysiwygEditor.init('#editor', { theme: 'dark' });
 *
 * Resolves a selector or element to a <textarea>, mounts the contenteditable
 * surface + toolbar, and returns the underlying Editor instance.
 */
const WysiwygEditor = {
    /**
     * @param {string|HTMLTextAreaElement} target CSS selector or a textarea element
     * @param {import('./core/Editor.js').EditorOptions} [options]
     * @returns {EditorCore}
     */
    init(target, options = {}) {
        const textarea = typeof target === 'string' ? document.querySelector(target) : target;

        if (!textarea) {
            throw new Error(`WYSIWYG Editor: target "${target}" not found`);
        }
        if (textarea.tagName !== 'TEXTAREA') {
            throw new Error('WYSIWYG Editor: init() target must be a <textarea> element');
        }
        if (instances.has(textarea)) {
            return instances.get(textarea);
        }

        const editor = new EditorCore(textarea, options);
        const toolbar = new Toolbar(editor, options.toolbar);
        editor.on('destroy', () => toolbar.destroy());

        instances.set(textarea, editor);
        allInstances.add(editor);
        editor.on('destroy', () => {
            instances.delete(textarea);
            allInstances.delete(editor);
        });

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
        allInstances.forEach((editor) => editor.destroy());
        allInstances.clear();
    },

    registerPlugin: EditorCore.registerPlugin,
};

export default WysiwygEditor;
