import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Editor from '../src/core/Editor.js';
import BUILTIN_LOADERS from '../src/modules/register.js';
import LinkModule from '../src/modules/LinkModule.js';
import { waitForBuiltinPlugins } from './helpers.js';

describe('built-in plugin registration', () => {
    beforeEach(() => {
        document.body.innerHTML = '<textarea></textarea>';
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    function createEditor(options = {}) {
        return new Editor(document.querySelector('textarea'), options);
    }

    it('registers a loader for every built-in module', () => {
        expect(Object.keys(BUILTIN_LOADERS)).toEqual([
            'link', 'image', 'table', 'codeView', 'fullscreen', 'find',
            'note', 'media', 'markdown', 'statusBar', 'emoji', 'contextMenu',
            'templates',
        ]);
    });

    it('loads every built-in module into a new editor instance', async () => {
        const editor = createEditor();

        await waitForBuiltinPlugins(editor);

        Object.keys(BUILTIN_LOADERS).forEach((name) => {
            expect(editor.module(name), `module "${name}" did not load`).toBeDefined();
            expect(typeof editor.module(name).destroy).toBe('function');
        });
        editor.destroy();
    });

    it('maps the link loader to the LinkModule class', async () => {
        const { default: LoadedClass } = await BUILTIN_LOADERS.link();

        expect(LoadedClass).toBe(LinkModule);
    });

    it('skips plugins listed in disabledPlugins but loads the rest', async () => {
        const editor = createEditor({ disabledPlugins: ['table', 'link'] });

        await waitForBuiltinPlugins(editor, ['table', 'link']);

        expect(editor.module('table')).toBeUndefined();
        expect(editor.module('link')).toBeUndefined();
        expect(editor.module('image')).toBeDefined();
        editor.destroy();
    });

    it('logs a plugin loading failure and keeps the editor alive', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        Editor.registerPlugin('test-broken-plugin', () => Promise.reject(new Error('boom')));

        try {
            const editor = createEditor();

            await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledWith(
                'WYSIWYG Editor: plugin loading failed',
                expect.objectContaining({ message: 'boom' })
            ));
            // The editor stays usable: content and plugins that did load
            // are unaffected by the single failing factory.
            await waitForBuiltinPlugins(editor);
            expect(editor.getHTML()).toBe('<div><br></div>');
            expect(editor.module('image')).toBeDefined();
            editor.destroy();
        } finally {
            // Neutralize the registry entry: the module graph is per file,
            // but later tests in this file still construct editors.
            Editor.registerPlugin('test-broken-plugin', () => ({ destroy: () => {} }));
            errorSpy.mockRestore();
        }
    });
});
