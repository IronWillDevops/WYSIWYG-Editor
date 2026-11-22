import { describe, it, expect, afterEach } from 'vitest';
import WysiwygEditor from '../src/index.js';
import Editor from '../src/core/Editor.js';
import { waitForBuiltinPlugins } from './helpers.js';

describe('WYSIWYG Editor facade', () => {
    function mountTextarea(id, value = '') {
        document.body.innerHTML = `<textarea id="${id}">${value}</textarea>`;
        return document.getElementById(id);
    }

    afterEach(async () => {
        WysiwygEditor.destroyAll();
        // Catches instances whose dynamic import finished while the first
        // destroy pass was running, so nothing keeps document listeners.
        await new Promise((resolve) => setTimeout(resolve, 0));
        WysiwygEditor.destroyAll();
        document.body.innerHTML = '';
    });

    describe('init', () => {
        it('resolves a selector and mounts the surface next to the textarea', () => {
            const textarea = mountTextarea('editor', '<p>hello</p>');

            const editor = WysiwygEditor.init('#editor');

            expect(editor).toBeInstanceOf(Editor);
            expect(document.querySelector('.ife-wrapper')).not.toBeNull();
            expect(document.querySelector('.ife-toolbar')).not.toBeNull();
            expect(textarea.style.display).toBe('none');
            expect(editor.root.innerHTML).toContain('hello');
        });

        it('accepts a textarea element directly', () => {
            const textarea = mountTextarea('editor');

            const editor = WysiwygEditor.init(textarea);

            expect(editor.textarea).toBe(textarea);
            expect(WysiwygEditor.get(textarea)).toBe(editor);
        });

        it('renders empty content as a blank editable line', () => {
            mountTextarea('editor');

            const editor = WysiwygEditor.init('#editor');

            expect(editor.getText()).toBe('');
            expect(editor.root.innerHTML).toBe('<div><br></div>');
        });

        it('throws when the target selector matches nothing', () => {
            expect(() => WysiwygEditor.init('#missing'))
                .toThrow('WYSIWYG Editor: target "#missing" not found');
        });

        it('throws when the target is not a textarea', () => {
            document.body.innerHTML = '<div id="not-a-textarea"></div>';

            expect(() => WysiwygEditor.init('#not-a-textarea'))
                .toThrow('WYSIWYG Editor: init() target must be a <textarea> element');
        });

        it('returns the existing instance instead of mounting twice', async () => {
            const textarea = mountTextarea('editor');
            const first = WysiwygEditor.init('#editor');
            await waitForBuiltinPlugins(first);

            const second = WysiwygEditor.init('#editor');
            const third = WysiwygEditor.init(textarea);

            expect(second).toBe(first);
            expect(third).toBe(first);
            expect(document.querySelectorAll('.ife-wrapper')).toHaveLength(1);
            expect(document.querySelectorAll('.ife-toolbar')).toHaveLength(1);
        });
    });

    describe('get', () => {
        it('returns the instance registered for a mounted textarea', () => {
            mountTextarea('editor');
            const editor = WysiwygEditor.init('#editor');

            expect(WysiwygEditor.get('#editor')).toBe(editor);
        });

        it('returns undefined for a selector without an editor', () => {
            mountTextarea('editor');
            WysiwygEditor.init('#editor');

            expect(WysiwygEditor.get('#other')).toBeUndefined();
        });

        it('returns undefined for a textarea that was never initialized', () => {
            const textarea = mountTextarea('editor');

            expect(WysiwygEditor.get(textarea)).toBeUndefined();
        });
    });

    describe('destroy', () => {
        it('unregisters the instance so the textarea can be re-initialized', async () => {
            const textarea = mountTextarea('editor');
            const editor = WysiwygEditor.init('#editor');
            await waitForBuiltinPlugins(editor);
            const firstWrapper = editor.wrapper;

            editor.destroy();

            expect(WysiwygEditor.get(textarea)).toBeUndefined();
            expect(document.querySelector('.ife-wrapper')).toBeNull();
            expect(document.querySelector('.ife-toolbar')).toBeNull();
            expect(textarea.style.display).toBe('');

            const fresh = WysiwygEditor.init(textarea);
            expect(fresh).not.toBe(editor);
            expect(fresh.wrapper).not.toBe(firstWrapper);
        });

        it('destroys every mounted editor via destroyAll()', async () => {
            document.body.innerHTML =
                '<textarea id="first"></textarea><textarea id="second"></textarea>';
            const first = WysiwygEditor.init('#first');
            const second = WysiwygEditor.init('#second');
            await Promise.all([waitForBuiltinPlugins(first), waitForBuiltinPlugins(second)]);

            WysiwygEditor.destroyAll();

            expect(WysiwygEditor.get('#first')).toBeUndefined();
            expect(WysiwygEditor.get('#second')).toBeUndefined();
            expect(document.querySelector('.ife-wrapper')).toBeNull();
        });
    });

    it('exposes the plugin registry entry point', () => {
        expect(WysiwygEditor.registerPlugin).toBe(Editor.registerPlugin);
    });
});
