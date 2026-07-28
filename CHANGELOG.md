# Changelog

All notable changes to InkForge Editor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Superscript/subscript no longer nest a new wrapper on every click instead of toggling off.
- Numbered and bulleted lists are now created/removed with a dedicated DOM-based implementation instead of the unreliable `execCommand('insertUnorderedList'/'insertOrderedList')`, which could silently no-op or fail to toggle off depending on the browser.

### Added

- "Clear formatting" toolbar button, which also resets any leftover inline text/background color.
- Editing of already-inserted images: clicking (or double-clicking) an image now offers an "Edit image" dialog pre-filled with its current URL/alt/caption/alignment, plus a "Remove image" action, instead of only being able to insert new ones.
- Double-click-to-edit for existing links.
- A contextual table toolbar that appears whenever the caret is inside a table, exposing add/delete row, add/delete column, merge/split cell, cell background color, table alignment and delete table — the underlying methods already existed but had no way to be triggered from the UI.
- Default visual styling for `<ul>`/`<ol>`/`<li>`, `<blockquote>`, inline `<code>` and `<pre>` inside the editor content area (previously unstyled, relying entirely on the browser's bare defaults).

### Planned

- Image cropping UI (currently only resize via Alt+drag)
- Guided video/audio embed wizard with live preview
- Emoji picker panel (currently inserts a single default emoji)
- Special characters picker panel (currently inserts a sample entity)
- Browser spellcheck UI toggle in the toolbar
- Additional locales beyond en/uk/ru
- Vue and React wrapper components (framework-agnostic usage is documented today)

## [1.0.0] - 2026-07-28

### Added

- Initial public release of **InkForge Editor**.
- Dependency-free core engine (`Core`, `Selection`, `History`, `Commands`, `Sanitizer`, `EventBus`) built on native `contenteditable`, ES6 modules, HTML5 and CSS3 — no TinyMCE/CKEditor/Quill/Tiptap/EditorJS/Froala/Summernote code.
- Configurable toolbar with SVG icons, light/dark/auto themes, and per-button enable/disable.
- Formatting: bold, italic, underline, strikethrough, superscript, subscript, block formats (P/H1-H6/blockquote/pre), font family, font size, line height, text/background color.
- Alignment (left/center/right/justify) and indent/outdent.
- Lists: ordered, unordered, checklist.
- Full link management: insert/edit/remove with URL, text, title, target, and rel flags (nofollow/noopener/noreferrer).
- Full table editor: insert, delete, merge/split cells, add/remove rows and columns, cell background color, table alignment.
- Image handling: drag & drop, upload (via Laravel API), URL, paste, Alt+drag resize, alignment, caption, alt text, lazy loading.
- Video/audio embedding: YouTube, Vimeo, raw iframe, HTML5 `<video>`/`<audio>`.
- Note/callout blocks: info, warning, danger, success, quote, tip.
- Source code view with a lightweight HTML pretty-printer.
- Markdown import/export module.
- Find & Replace with case-sensitive and regular-expression matching, plus "highlight all".
- Undo/redo history with a configurable step limit (default 1000) and debounce.
- Autosave to `localStorage` on a configurable interval.
- Keyboard shortcuts: Ctrl+B/I/U, Ctrl+Z/Y, Ctrl+S, plus native browser shortcuts for copy/cut/paste/select all.
- Fullscreen mode via the native Fullscreen API with a CSS fallback.
- Public plugin system via `Editor.registerPlugin()` — built-in modules use the same API as third-party plugins.
- Event system: `init`, `focus`, `blur`, `change`, `selectionchange`, `undo`, `redo`, `paste`, `drop`, `save`, `destroy`.
- HTML sanitizer (XSS protection) applied to paste and output, with a matching Laravel-side config whitelist.
- Localization: English, Українська, Русский, with a simple runtime registry for adding more.
- Laravel package: service provider, publishable config, Blade component `<x-editor>`, image upload controller/route.
- Plain JavaScript, Blade, Livewire, and Alpine.js integration examples in `/docs`.
- Demo Laravel application in `/demo`.
- PHPUnit/Pest test suite and Vitest test suite; GitHub Actions CI (PHPStan, Pint, Pest, ESLint, Vitest, build) and a tag-triggered release workflow.

[Unreleased]: https://github.com/inkforge/laravel-editor/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/inkforge/laravel-editor/releases/tag/v1.0.0
