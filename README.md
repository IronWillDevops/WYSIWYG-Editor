# InkForge Editor

**A modern, dependency-free WYSIWYG HTML editor for Laravel.**
Built entirely from scratch with native JavaScript (ES6+), HTML5, and CSS3 —
no TinyMCE, CKEditor, Quill, Tiptap, EditorJS, Froala, Summernote, or any
other third-party editor under the hood.

[![CI](https://github.com/inkforge/laravel-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/inkforge/laravel-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-8.3%2B-777bb4)](composer.json)
[![Laravel](https://img.shields.io/badge/Laravel-11%20%7C%2012%20%7C%2013%20%7C%2014-ff2d20)](composer.json)

---

## Why InkForge?

Most "Laravel editor" packages are thin wrappers around TinyMCE or CKEditor.
InkForge is the editor itself: a modular `contenteditable`-based engine with
its own history, selection, sanitizer, and command system, distributed as a
proper Laravel package with a one-line Blade component.

## Features

- **Formatting** — bold, italic, underline, strike, super/subscript, block
  formats (paragraph, H1–H6, blockquote, pre), font family/size, line height,
  text & background color.
- **Layout** — align left/center/right/justify, indent/outdent, ordered /
  unordered / checklist lists.
- **Links** — full insert/edit/remove flow: URL, text, title, target, and
  `rel` flags (`nofollow`, `noopener`, `noreferrer`).
- **Tables** — insert, delete, merge/split cells, add/remove rows & columns,
  cell background color, table alignment.
- **Images** — drag & drop, upload (Laravel API included), URL, paste,
  Alt+drag resize, alignment, caption, alt text, lazy loading.
- **Media** — YouTube, Vimeo, raw iframe embeds, HTML5 `<video>`/`<audio>`.
- **Notes/callouts** — info, warning, danger, success, quote, tip blocks.
- **Source & Markdown** — HTML source view, Markdown import/export.
- **Find & Replace** — with regex and case-sensitive matching.
- **History** — up to 1000 undo/redo steps, debounced recording.
- **Autosave**, **fullscreen**, **keyboard shortcuts**, **spellcheck**.
- **Themes** — light / dark / auto (`prefers-color-scheme`).
- **i18n** — English, Українська, Русский, easy to extend.
- **Security** — whitelist HTML sanitizer, paste sanitizer, URL validation,
  XSS protection, mirrored on the Laravel side for upload validation.
- **Plugin API** — `Editor.registerPlugin()`; built-in modules use the exact
  same API as third-party plugins.

> Some advanced UI affordances (image cropping, an emoji/character picker
> panel, a guided video wizard) ship as minimal working versions in 1.0 and
> are tracked in [CHANGELOG.md](CHANGELOG.md#unreleased) for follow-up
> releases — see that file for the current, honest state of each feature.

## Requirements

- PHP 8.3+
- Laravel 11, 12, 13, or 14
- Node.js 18+ / npm (only if you build the JS bundle yourself)

## Installation

```bash
composer require inkforge/laravel-editor
```

Publish the config (optional — sensible defaults ship out of the box):

```bash
php artisan vendor:publish --tag=inkforge-editor-config
```

Publish the compiled assets to your public directory (or reference them
directly from `vendor/inkforge/laravel-editor/resources` in your bundler):

```bash
php artisan vendor:publish --tag=inkforge-editor-assets
```

If you want the editor's uploads to be publicly reachable, make sure your
storage symlink exists:

```bash
php artisan storage:link
```

## Quick start

### 1. Blade component (simplest)

```blade
<x-editor
    name="content"
    id="content"
    :value="$post->content"
/>
```

Add `theme`, `locale`, `toolbar`, `height`, or `autosave` props as needed:

```blade
<x-editor
    name="content"
    :value="$post->content"
    theme="dark"
    locale="uk"
    :height="600"
    autosave
/>
```

### 2. Plain `<textarea>` + JS

```html
<textarea id="editor"></textarea>
<script type="module">
    import Editor from '/vendor/inkforge-editor/js/inkforge-editor.esm.js';
    Editor.init('#editor');
</script>
```

### 3. Bundler import (Vite/Webpack)

```js
import Editor from '@inkforge/editor';
import '@inkforge/editor/style.css';

Editor.init('#editor', { theme: 'auto', locale: 'en' });
```

## Framework integration examples

### Livewire

```blade
<div wire:ignore>
    <textarea id="editor">{{ $content }}</textarea>
</div>

<script type="module">
    import Editor from '@inkforge/editor';

    document.addEventListener('livewire:navigated', () => {
        const editor = Editor.init('#editor', {
            uploadUrl: @json(route('inkforge-editor.upload.image')),
        });

        editor.on('change', (html) => {
            @this.set('content', html);
        });
    });
</script>
```

`wire:ignore` keeps Livewire's DOM diffing from fighting the editor's own
DOM mutations; `editor.on('change', ...)` pushes content back into the
component's state.

### Alpine.js

```blade
<div x-data="{
    content: @entangle('content'),
    editor: null,
    init() {
        import('@inkforge/editor').then(({ default: Editor }) => {
            this.editor = Editor.init(this.$refs.textarea, { theme: 'light' });
            this.editor.on('change', (html) => { this.content = html; });
        });
    },
}">
    <textarea x-ref="textarea">{{ $content }}</textarea>
</div>
```

### Vanilla JavaScript (no Laravel view layer)

```html
<textarea id="editor"></textarea>
<script type="module">
    import Editor from '@inkforge/editor';

    const editor = Editor.init('#editor', {
        toolbar: [
            ['undo', 'redo'],
            ['bold', 'italic', 'underline'],
            ['link', 'image', 'table'],
        ],
    });

    document.getElementById('save-btn').addEventListener('click', () => {
        console.log(editor.getHTML());
    });
</script>
```

### Vue 3

```vue
<template>
  <textarea ref="textarea" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Editor from '@inkforge/editor';

const textarea = ref(null);
let editor;

onMounted(() => {
  editor = Editor.init(textarea.value, { theme: 'auto' });
});

onBeforeUnmount(() => editor?.destroy());
</script>
```

### React

```jsx
import { useEffect, useRef } from 'react';
import Editor from '@inkforge/editor';

export default function InkForgeEditor({ options = {} }) {
    const textareaRef = useRef(null);

    useEffect(() => {
        const editor = Editor.init(textareaRef.current, options);
        return () => editor.destroy();
    }, []);

    return <textarea ref={textareaRef} />;
}
```

### Bootstrap / Tailwind

InkForge ships its own scoped `.ife-*` classes and CSS variables (see
[`resources/css/inkforge-editor.css`](resources/css/inkforge-editor.css)), so
it drops into either design system without class collisions. Note/callout
blocks render as `<div class="note note-info">…</div>`, which maps cleanly
onto Bootstrap's alert color palette or a Tailwind `@apply` equivalent.

## Configuration reference

See [`config/inkforge-editor.php`](config/inkforge-editor.php) for the full,
commented list of options: `theme`, `locale`, `toolbar`, `plugins`,
`history`, `autosave`, `sanitizer`, `upload`.

## JavaScript API

```js
editor.getHTML();                 // sanitized HTML string
editor.setHTML(html);              // replace content
editor.insertHTML(html);           // insert at caret
editor.getText();                  // plain text
editor.undo();
editor.redo();
editor.clear();
editor.focus();
editor.destroy();
editor.module('table').insertTable(3, 3, true);
editor.module('link').open();
editor.module('markdown').export();
editor.module('markdown').import('# Hello');
```

### Events

```js
editor.on('init', (editor) => {});
editor.on('focus', (editor) => {});
editor.on('blur', (editor) => {});
editor.on('change', (html) => {});
editor.on('selectionchange', (editor) => {});
editor.on('undo', () => {});
editor.on('redo', () => {});
editor.on('paste', ({ html, text }) => {});
editor.on('drop', (event) => {});
editor.on('save', (html) => {}); // fired on Ctrl+S
editor.on('destroy', (editor) => {});
```

### Plugin API

```js
import Editor from '@inkforge/editor';

Editor.registerPlugin('word-count', (editor) => {
    const counter = document.createElement('div');
    counter.className = 'word-count';
    editor.wrapper.appendChild(counter);

    const update = () => {
        counter.textContent = `${editor.getText().trim().split(/\s+/).filter(Boolean).length} words`;
    };
    const unsubscribe = editor.on('change', update);
    update();

    return {
        destroy() {
            unsubscribe();
            counter.remove();
        },
    };
});
```

Built-in modules (`link`, `image`, `table`, `codeView`, `fullscreen`, `find`,
`note`, `media`, `markdown`) are registered through this exact same API, so
you can disable any of them via `disabledPlugins: ['note']` in the editor
options if you don't need them.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + S` | Emit `save` event |
| `Ctrl/Cmd + K` | Insert/edit link *(bindable via the `link` toolbar button)* |
| `Ctrl/Cmd + A/C/V/X` | Native select all / copy / paste / cut |

## Security

- All output from `editor.getHTML()` and all pasted content passes through
  a whitelist-based `Sanitizer` (tags, attributes, URL schemes, inline
  `style` expressions).
- Server-side, `UploadController` validates uploaded files by MIME type and
  size before storing them via Laravel's filesystem abstraction.
- We recommend also sanitizing on save server-side if you accept HTML from
  untrusted users — see `config('inkforge-editor.sanitizer')` for a whitelist
  you can reuse with a PHP HTML purifier of your choice.

## Demo

A minimal Laravel demo app lives in [`/demo`](demo) — see
[`demo/README.md`](demo/README.md) to run it locally.

## Testing

```bash
composer test          # Pest (PHP)
composer analyse        # PHPStan
composer format -- --test  # Pint (formatting check)

cd resources/js
npm run test            # Vitest (JS)
npm run lint             # ESLint
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md)
first — in particular, the "no editor dependencies" ground rule.

## License

InkForge Editor is open-sourced software licensed under the
[MIT license](LICENSE). See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
for icon attribution.
