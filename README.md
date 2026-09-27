# WYSIWYG Editor

**A modern, dependency-free WYSIWYG HTML editor for Laravel.**
Built entirely from scratch with native JavaScript (ES6+), HTML5, and CSS3 —
no TinyMCE, CKEditor, Quill, Tiptap, EditorJS, Froala, Summernote, or any
other third-party editor under the hood.

[![CI](https://github.com/wysiwyg/laravel-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/wysiwyg/laravel-editor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/PHP-8.3%2B-777bb4)](composer.json)
[![Laravel](https://img.shields.io/badge/Laravel-11%20%7C%2012%20%7C%2013%20%7C%2014-ff2d20)](composer.json)

---

## Why Wysiwyg?

Most "Laravel editor" packages are thin wrappers around TinyMCE or CKEditor.
WYSIWYG Editor is the editor itself: a modular `contenteditable`-based engine with
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
- **Status bar** — live word & character counts, block-type and
  link/code/table context, always reachable. Long content never grows the
  editor: the `height` option sizes the editor's own box, the editing area
  takes whatever is left between the two bars and scrolls internally with its
  own scrollbar, so the toolbar and status bar stay pinned above and below it
  (also in fullscreen, and in the source view). The `height` option is the only
  thing that sizes the editor — it is never silently re-fitted to the viewport
  as the page scrolls — and a host box that is shorter than it wins over it: put
  the editor in a panel, a grid row or on a fixed-height `class` and the editing
  area scrolls in the room there is, with the status bar still at the bottom. A
  host that bounds itself with `max-height` and hides the overflow works the same
  way — the editor measures the room left inside the clip instead of being cut
  off by it, and follows it when the host is resized. The editor also never
  grows wider than the box that holds it: long unbreakable text (a URL, a
  base64 blob, minified code) wraps inside the content area instead of pushing
  the bars and the scrollbar off-screen.
- **Manual height resize** — a grip on the editor's bottom edge
  (mouse, touch or the arrow keys once focused) changes the height. It writes
  the same `height` option, so the toolbar, status bar and internal scrollbar
  keep working at the new size; the grip is hidden in fullscreen, where the
  editor fills the window by definition, and while the source view is open,
  which is the only other height affordance then.
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
composer require wysiwyg/laravel-editor
```

Publish the config (optional — sensible defaults ship out of the box):

```bash
php artisan vendor:publish --tag=wysiwyg-editor-config
```

Publish the compiled assets to your public directory (or reference them
directly from `vendor/wysiwyg/laravel-editor/resources` in your bundler):

```bash
php artisan vendor:publish --tag=wysiwyg-editor-assets
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

> **Escaping** — the initial value is printed with `{{ e($value, false) }}`:
> stored markup such as `<p>hi</p>` is rendered as literal text (never live
> HTML) until the editor mounts and replaces it, and already-encoded entities
> (`&amp;`) are not double-encoded, so published content round-trips cleanly.

### 2. Plain `<textarea>` + JS

```html
<link rel="stylesheet" href="/vendor/wysiwyg-editor/css/wysiwyg-editor.css">
<textarea id="editor"></textarea>
<script type="module">
    import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';
    Editor.init('#editor');
</script>
```

> **The stylesheet is part of the editor, not a theme.** The bundle carries no CSS:
> `wysiwyg-editor.css` is what makes the editor's box a bounded flex column with
> the toolbar and status bar pinned to it and the editing area scrolling inside
> it. Without it the editor still works, and the failure only shows up once the
> content is big enough — a multiline paste then grows the editing area to the
> full height of the document, the page becomes the only scroll area, and the
> toolbar and status bar scroll out of view with it. Always load the stylesheet
> from the same build as the script.

### 3. Bundler import (Vite/Webpack)

This is a Composer package, so there is nothing to install from a registry:
publish the assets (see [Installation](#installation)) and import them by path.
They live in `public/`, which Vite already serves, so the import is the same in
development and in the build.

```js
// resources/js/app.js
import '/vendor/wysiwyg-editor/css/wysiwyg-editor.css';
import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';

Editor.init('#editor', { theme: 'auto', locale: 'en' });
```

The stylesheet may equally be imported from a shim module, or linked from the
layout — the only rule is that it is loaded, and from the same build as the
script.

> `resources/js/package.json` also declares the npm specifiers `@wysiwyg/editor`
> and `@wysiwyg/editor/style.css`, for a build that vendors `resources/js`
> itself. Nothing is published to a registry under that name, so
> `npm install @wysiwyg/editor` does not resolve — import the published assets as
> above unless you are installing the build yourself.

### 4. CDN (jsDelivr) — no build step

The built bundles are committed to the repository, so a page can load them
straight from a CDN without installing or building anything:

```blade
@push('styles')
    <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/wysiwyg/laravel-editor@v1.0.0-dev.31/resources/js/dist/wysiwyg-editor.css">
@endpush

@push('scripts')
    <script defer
        src="https://cdn.jsdelivr.net/gh/wysiwyg/laravel-editor@v1.0.0-dev.31/resources/js/dist/wysiwyg-editor.umd.js">
    </script>
@endpush
```

```js
WysiwygEditor.init('#post-editor', { theme: 'auto' });
```

- The version in the URL is a **git tag**, and it is part of the URL on purpose:
  a tag is immutable, so the CDN caches it for good and every visitor gets the
  same build. The flip side is that the URL keeps serving *that* build forever —
  a page pinned to an old tag runs that old editor, because the editor's own
  layout rules (the height bounds that keep the content area scrolling *inside*
  the editor) travel in the bundle, not in your page. **Bump the tag on every
  upgrade**; a freshly pushed tag is served by the CDN within a minute or two.
- Load the stylesheet and the script from the **same** tag. They ship one
  contract — the box sizes the editor, the content area takes whatever the
  toolbar and status bar leave — and a mixed pair breaks in a way that reads as
  a content bug rather than a versioning one: a new script on an old stylesheet
  leaves the editing area unbounded (the box is not a flex column yet), so a
  long document grows the editor instead of scrolling inside it, the status bar
  is pushed out of the editor's own box, and the box shows no scrollbar.
- `wysiwyg-editor.umd.js` is self-contained and exposes the global
  `WysiwygEditor` (`init` / `get` / `destroyAll` / `registerPlugin`).
  `wysiwyg-editor.esm.js` is the same build as an ES module, and it imports its
  own per-module chunks next to it, so the whole `dist/` directory has to be
  reachable (a CDN serves that for you; with your own server, copy all of it).
- `wysiwyg-editor.css` carries the editor UI *and* the content styles. To render
  published content only, load `wysiwyg-content.css` instead.

## Framework integration examples

### Livewire

```blade
<div wire:ignore>
    <textarea id="editor">{{ $content }}</textarea>
</div>

{{-- Loaded once per page, like <x-editor> does. Required: without it the
     editor's box stops bounding its content and the bars scroll away. --}}
@once
    <link rel="stylesheet" href="{{ asset('vendor/wysiwyg-editor/css/wysiwyg-editor.css') }}">
@endonce

<script type="module">
    import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';

    document.addEventListener('livewire:navigated', () => {
        const editor = Editor.init('#editor', {
            uploadUrl: @json(route('wysiwyg-editor.upload.image')),
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
@once
    <link rel="stylesheet" href="{{ asset('vendor/wysiwyg-editor/css/wysiwyg-editor.css') }}">
@endonce

<div x-data="{
    content: @entangle('content'),
    editor: null,
    init() {
        import('/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js').then(({ default: Editor }) => {
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
<link rel="stylesheet" href="/vendor/wysiwyg-editor/css/wysiwyg-editor.css">
<textarea id="editor"></textarea>
<script type="module">
    import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';

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
import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';
import '/vendor/wysiwyg-editor/css/wysiwyg-editor.css';

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
import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';
import '/vendor/wysiwyg-editor/css/wysiwyg-editor.css';

export default function WysiwygEditor({ options = {} }) {
    const textareaRef = useRef(null);

    useEffect(() => {
        const editor = Editor.init(textareaRef.current, options);
        return () => editor.destroy();
    }, []);

    return <textarea ref={textareaRef} />;
}
```

### Bootstrap / Tailwind

WYSIWYG Editor ships its own scoped `.ife-*` classes and CSS variables (see
[`resources/css/wysiwyg-editor.css`](resources/css/wysiwyg-editor.css)), so
it drops into either design system without class collisions. Note/callout
blocks render as `<div class="note note-info">…</div>`, which maps cleanly
onto Bootstrap's alert color palette or a Tailwind `@apply` equivalent.

## Rendering published content

Editor-generated HTML is structured so the same content looks identical inside
the editor and when published. The styles that describe that HTML (headings,
tables, blockquotes, lists, code, images, note blocks) live in one place:

- [`resources/css/wysiwyg-content.css`](resources/css/wysiwyg-content.css) —
  the **single source of truth** for content/prose styles. It defines its own
  `--ife-*` fallbacks and styles every element generically under `.ife-content`.
- [`resources/css/wysiwyg-editor.css`](resources/css/wysiwyg-editor.css) —
  editor **UI only** (toolbar, dialogs, emoji picker, contexts menus, resize
  handles, status bar). It is never required to render a post and contains no
  content styles, so it cannot leak UI styles onto a normal page.

The editor imports both files; a published post needs only the content file.

Editor page (auto-loaded by `<x-editor>`):
```blade
<link rel="stylesheet" href="{{ asset('vendor/wysiwyg-editor/css/wysiwyg-editor.css') }}">
<script type="module" src="{{ asset('vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js') }}"></script>
```

Published post:
```blade
<link rel="stylesheet" href="{{ asset('vendor/wysiwyg-editor/css/wysiwyg-content.css') }}">

<div class="ife-content max-w-none">
    {!! $post->content?->content !!}
</div>
```

The `.ife-content` wrapper is what the content selectors target, so wrap post
HTML in the same class the editor uses. Because the content CSS ships its own
variable defaults it works with no JS and no wrapper, and it never conflicts
with Tailwind `max-w-none` or Preflight resets (`prose` is not required and
deliberately not injected). To reuse a site theme, set the `--ife-*` custom
properties on `.ife-content` (or an ancestor) exactly as the editor's
`.ife-wrapper` does for dark mode.

## Configuration reference

See [`config/wysiwyg-editor.php`](config/wysiwyg-editor.php) for the full,
commented list of options: `theme`, `locale`, `toolbar`, `height`, `plugins`,
`history`, `autosave`, `sanitizer`, `upload`.

`height` sets the height of the editor (`WYSIWYG_EDITOR_HEIGHT`, default `420`);
it accepts a pixel number or any CSS length that does not depend on a parent box
(`"600"`, `"600px"`, `"40rem"`, `"75vh"`). It sizes the editor's own box —
toolbar and status bar included — and the editing area takes the rest and
scrolls inside it, so larger content never grows the editor. A host box that is
shorter than `height` (a panel, a grid row, a `class` on the component) wins
over it and the editing area scrolls in whatever room there is — including a
host that only bounds itself with `max-height` and clips, which the editor
measures. The grip on the editor's bottom edge overrides the value per instance.

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
import Editor from '/vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js';

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
  untrusted users — see `config('wysiwyg-editor.sanitizer')` for a whitelist
  you can reuse with a PHP HTML purifier of your choice.

## Demo

A minimal Laravel demo app lives in [`/demo`](demo) — see
[`demo/README.md`](demo/README.md) to run it locally.

## Testing

```bash
composer test          # Pest (PHP) — 13+ tests across Unit & Feature
composer analyse        # PHPStan level 6
composer format -- --test  # Pint (formatting check)

cd resources/js
npm run test            # Vitest (JS) — 60+ tests across all core modules
npm run lint             # ESLint
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md)
first — in particular, the "no editor dependencies" ground rule.

## License

WYSIWYG Editor is open-sourced software licensed under the
[MIT license](LICENSE). See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
for icon attribution.
