import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
