import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/index.js'),
            name: 'InkForgeEditor',
            formats: ['es', 'umd'],
            fileName: (format) => (format === 'es' ? 'inkforge-editor.esm.js' : 'inkforge-editor.umd.js'),
        },
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) =>
                    assetInfo.name === 'style.css' ? 'inkforge-editor.css' : assetInfo.name,
            },
        },
        sourcemap: true,
    },
});
