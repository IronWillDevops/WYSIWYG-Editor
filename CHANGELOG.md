# Changelog

All notable changes to WYSIWYG Editor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The toolbar and status bar no longer "run away" after a large paste (or any long document): the editing area keeps its own scrollbar and the bars stay pinned to it. "Clear formatting" is what took the editor's layout with it — a select-all made the editing surface itself the root of the formatting sweep, and the sweep stripped the whole `style` attribute off it, which is where the editor's `min-height`/`max-height` live. The content area was then unbounded: large content grew the editor instead of scrolling inside it, the page became the only scroll area, the toolbar and status bar travelled with it and the editor never showed a scrollbar of its own. The formatting sweep no longer treats the editing surface as a candidate (the colour "clear" action is fixed the same way), and `Editor.applyHeight()` now remembers the bounds it applied so `Editor.ensureHeightBounds()` re-asserts them on every change — anything that rewrites that style attribute (a plugin, a host page's own script) can therefore no longer leave the editor unbounded for longer than a single edit.
- A long unbreakable run of text (a URL, a base64 blob, minified code) no longer stretches the editor out of its host box, pushing the toolbar and the status bar off-screen and the content area's scrollbar out of reach. The shared content stylesheet wraps long runs with `overflow-wrap: break-word`, which does not change a box's intrinsic (min-content) width, so inside a flex, grid or auto-width table-cell parent the editor grew to the full length of that text. The wrapper element rendered by the `<x-editor>` component and `.ife-wrapper` itself are now bounded (`min-width: 0; max-width: 100%`), and the editing surface uses `overflow-wrap: anywhere` — the same line breaks, at any given width, with a one-character min-content width. Published posts render `.ife-content` on their own and keep `break-word`.
- The editing area keeps its own scrollbar after leaving fullscreen and the toolbar and status bar stay pinned to the editor. The fullscreen module snapshotted the content area's inline `min-height`/`max-height` on enter and wrote that snapshot back on exit, but leaving fullscreen runs the exit path twice (its own `exit()` plus the native `fullscreenchange` event), so the second run restored the already-cleared snapshot and wiped the bounds for good. The content area was then unbounded: large content (a big paste, a long document) grew the editor instead of scrolling inside it, the page became the only scroll area and the toolbar and status bar travelled with it. The editor is now the single owner of its bounds — `Editor.applyHeight()` derives them from the `height` option, which the fullscreen module asks for on enter and on exit — so no number of round trips, nor a native Esc, can leave the editor unbounded. The `height` option is also read as a full CSS length now (`"600"`, `"600px"`, `"40rem"`, `"75vh"`), while a value that cannot size a box (missing, `null`, a relative length such as `"100%"`, a non-positive or non-finite number) falls back to the default height instead of emitting a declaration the browser drops, which left the content area unbounded in the same way.
- The text colour now stays visibly live while you pick it. Because the in-page picker keeps the selection active, the themed `::selection` colour (white text in dark mode) painted over the chosen colour for as long as the text was selected, so the text looked white-on-blue the whole time you dragged the picker even though the colour was being applied. While a picker is open the editor now inherits the selected text's own colour under the selection (`ife-color-picking`), so the live colour is visible as you drag; the selection highlight remains, and ordinary selection outside the picker is unchanged.
- Live recolouring now keeps a text colour applied without dropping a background colour (and vice versa). Applying a foreground colour to text that already carried a background used to fold the colour onto a fresh nested span every time, growing the markup; applying a foreground over text that already had both used to drop the background entirely (the split re-wrap carried only the new foreground). Foreground and background now fold onto the same span and re-colouring preserves any sibling inline styles, so changing the text colour live never destroys an existing highlight.
- The in-page colour picker's saturation/brightness square now matches where you click: it previously rendered a gradient whose white-end collided with the click-to-colour mapping, so the top-right of the square (where the vivid/full colour is expected) produced a near-white colour instead of the pure hue. Switched the square to the hue-saturation-value ("SV") model — left = white, right = the pure hue, bottom = black, top = the vivid colour — so clicking any spot now yields the colour shown at that spot.
- The custom in-page colour picker (introduced for the live-recolouring picker) now tracks drags on touch devices too: the square and hue strip set `touch-action: none` so pointer movement isn't swallowed by the browser's native pan/scroll gestures.
- Replaced the native `<input type="color">` (which opens an OS-level dialog that steals editor focus — dropping the visible selection and blocking live recolouring) with a fully custom in-page colour picker. Selecting text and then clicking the colour button no longer clears the selection: the picker is a popover that lives inside the page and never moves focus, so the editor keeps its selection highlight, and every hue/saturation-lightness drag, preset swatch click and hex entry recolours the selected text/background live on all OSes and browsers. Text and background each get their own picker, presets apply their exact colour, and an explicit "clear" control removes the colour (and `Commands.clearColor()` now preserves the selection by re-selecting the cleared range by offsets, matching `applyColor`).
- Text color now updates live while dragging in the native colour picker, matching the background-color picker, instead of only applying when the dialog closes. Two compounding causes fixed: while a colour dialog is open the browser owns `input.value`, so the toolbar no longer rewrites it on selection changes (which forced the dialog to commit the current pick and stop firing live `input` events); and the text picker treated its default black (`#000000`) as "no colour" on every intermediate `input`, so dragging through the saturation/luminance square cleared the text mid-drag and only a definite colour "stuck" on release. The live `input` path now applies the colour unconditionally (exactly like the background picker), while the neutral-clearing rule still runs on the committed `change`, so picking a default black text colour still clears it for theme-agnostic output.
- Applying a block format (headings H1-H6 / paragraph) no longer silently does nothing when the caret is in content that has no enclosing block wrapper (e.g. plain text living directly under the editor root). `formatBlock()` now wraps the caret's whole line — or only the selected run — into the target block, and block detection no longer depends on a block being a direct child of the root.
- Choosing a heading (or paragraph) from the block-format dropdown is no longer a no-op. The `change` handler now applies the format the user picked rather than the block tag that a selectionchange-driven toolbar resync rewrites onto the dropdown before the command runs.
- Restoring the saved selection no longer gets corrupted by the first formatting command: `Selection.restore()` now applies a clone of the saved range so repeated operations (repeat color drags, applying a heading, ...) don't silently no-op on an emptied selection.
- Text/background color now applies to the whole selection reliably and survives re-application: `Commands.applyColor()` replaces the unreliable `execCommand('foreColor'/'hiliteColor')` (which could no-op on whole-block/large selections and collapses the live selection) with a DOM-based, idempotent, non-collapsing span wrapper.
- Live recolouring while selecting: after picking a text or background color, dragging a selection handle tints each newly-selected portion with that color as you drag — no need to re-open the picker.
- The colour picker now updates the selected text/background LIVE as you change the colour, instead of applying only the first colour you click. Fixes two compounding causes: `Selection` saved the selection as a live `Range`, which real browsers collapse/re-target as colouring re-wraps the text (so the next pick silently no-oped), and the picker's `input` handler called a focusing `restore()` which dismissed the native colour dialog on the first pick. Saving/restoring by stable character offsets and recolouring spans in place (instead of nesting a new span) fix both; dragging a handle again recolours the grown selection.
- The selection highlight inside the editor is now clearly visible and theme-aware: `::selection` no longer falls back to the browser's default (hard to see white-on-blue) and adapts to the editor's dark theme via new `--ife-selection-bg` / `--ife-selection-fg` variables.
- Superscript/subscript no longer nest a new wrapper on every click instead of toggling off.
- Numbered and bulleted lists are now created/removed with a dedicated DOM-based implementation instead of the unreliable `execCommand('insertUnorderedList'/'insertOrderedList')`, which could silently no-op or fail to toggle off depending on the browser.

### Added

- Manual height resize: a grip on the editor's bottom edge (mouse, touch, or the arrow keys once it is focused) changes the height of the editing area. The grip writes the same `height` option and goes through `Editor.applyHeight()`, so there is no second height mechanism: the toolbar and status bar keep their places, the content area keeps scrolling inside itself, and a resized height survives a fullscreen round trip. It is hidden in fullscreen (the editor fills the window by definition) and while the source view is open (that textarea keeps its own native `resize: vertical`), so there is exactly one resize affordance per surface.
- The editor height is configurable in `config/wysiwyg-editor.php` (`height`, `WYSIWYG_EDITOR_HEIGHT`, default `420`) and read by the `height` prop of the `<x-editor>` component, like `theme` and `locale` already were; the prop still overrides it per instance.
- "Clear formatting" toolbar button, which also resets any leftover inline text/background color.
- Comprehensive test coverage: `Selection`, `Commands`, `Localization`, `Dialog`, `CodeViewModule` test suites; extended `MarkdownModule` and `Sanitizer` tests with blockquotes, code blocks, HR, custom config, and URL scheme validation.
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

- Initial public release of **WYSIWYG Editor**.
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

[Unreleased]: https://github.com/wysiwyg/laravel-editor/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/wysiwyg/laravel-editor/releases/tag/v1.0.0
