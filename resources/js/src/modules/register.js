import EditorCore from '../core/Editor.js';
import LinkModule from './LinkModule.js';
import ImageModule from './ImageModule.js';
import TableModule from './TableModule.js';
import CodeViewModule from './CodeViewModule.js';
import FullscreenModule from './FullscreenModule.js';
import FindModule from './FindModule.js';
import NoteModule from './NoteModule.js';
import MediaModule from './MediaModule.js';
import MarkdownModule from './MarkdownModule.js';
import StatusBar from './StatusBar.js';
import EmojiModule from './EmojiModule.js';
import ContextMenu from './ContextMenu.js';
import TemplateModule from './TemplateModule.js';

/**
 * Built-in modules are registered through the same public plugin API that
 * third-party plugins use (Editor.registerPlugin), keeping Core small and
 * every feature — including first-party ones — equally pluggable/removable.
 */
const BUILTIN_MODULES = {
    link: LinkModule,
    image: ImageModule,
    table: TableModule,
    codeView: CodeViewModule,
    fullscreen: FullscreenModule,
    find: FindModule,
    note: NoteModule,
    media: MediaModule,
    markdown: MarkdownModule,
    statusBar: StatusBar,
    emoji: EmojiModule,
    contextMenu: ContextMenu,
    templates: TemplateModule,
};

Object.entries(BUILTIN_MODULES).forEach(([name, ModuleClass]) => {
    EditorCore.registerPlugin(name, (editor) => new ModuleClass(editor));
});

export default BUILTIN_MODULES;
