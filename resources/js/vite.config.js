import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Emits a standalone copy of the shared content/prose stylesheet.
 *
 * The editor's `index.js` imports both `wysiwyg-editor.css` (UI) and
 * `wysiwyg-content.css` (content), which Vite bundles into a single
 * `dist/wysiwyg-editor.css`. Published posts, however, must load only the
 * content styles (no editor-UI leakage), so we also emit the content
 * stylesheet as its own distributable `dist/wysiwyg-content.css`.
 */
function contentCssCopyPlugin() {
    let outDir;
    return {
        name: 'wysiwyg-content-css-copy',
        configResolved(config) {
            outDir = config.build.outDir;
        },
        writeBundle() {
            mkdirSync(
                resolve(outDir),
                { recursive: true },
            );
            copyFileSync(
                resolve(__dirname, '../css/wysiwyg-content.css'),
                resolve(outDir, 'wysiwyg-content.css'),
            );
        },
    };
}

export default defineConfig({
    plugins: [contentCssCopyPlugin()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'WysiwygEditor',
            formats: ['es', 'umd'],
            fileName: (format) => (format === 'es' ? 'wysiwyg-editor.esm.js' : 'wysiwyg-editor.umd.js'),
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) =>
                    assetInfo.name === 'style.css' ? 'wysiwyg-editor.css' : assetInfo.name,
            },
        },
        sourcemap: true,
    },
});
