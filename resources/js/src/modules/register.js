import EditorCore from '../core/Editor.js';

const BUILTIN_LOADERS = {
    link: () => import('./LinkModule.js'),
    image: () => import('./ImageModule.js'),
    table: () => import('./TableModule.js'),
    codeView: () => import('./CodeViewModule.js'),
    fullscreen: () => import('./FullscreenModule.js'),
    find: () => import('./FindModule.js'),
    note: () => import('./NoteModule.js'),
    media: () => import('./MediaModule.js'),
    markdown: () => import('./MarkdownModule.js'),
    statusBar: () => import('./StatusBar.js'),
    emoji: () => import('./EmojiModule.js'),
    contextMenu: () => import('./ContextMenu.js'),
    templates: () => import('./TemplateModule.js'),
};

Object.entries(BUILTIN_LOADERS).forEach(([name, loader]) => {
    EditorCore.registerPlugin(name, async (editor) => {
        const { default: ModuleClass } = await loader();
        return new ModuleClass(editor);
    });
});

export default BUILTIN_LOADERS;
