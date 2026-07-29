# Contributing to InkForge Editor

First off, thank you for considering contributing! InkForge Editor is a
community-driven, dependency-free WYSIWYG editor for Laravel, and it grows
through issues, bug reports, docs fixes, and pull requests just like this one.

## Code of conduct

Be respectful, be constructive, assume good intent. Harassment or abusive
behavior of any kind is not tolerated.

## Ground rules

- **No editor dependencies.** The whole point of this project is a
  from-scratch editor. Pull requests that add TinyMCE, CKEditor, Quill,
  Tiptap, EditorJS, Froala, Summernote, or similar as a dependency will be
  closed. Native ES6+, HTML5, CSS3, and Laravel/PHP only.
- **PHP:** PSR-12, `declare(strict_types=1)` in every file, PHPStan level 6
  must pass, Laravel Pint must pass.
- **JavaScript:** ES6+ modules, no build-only syntax that isn't transpiled
  by the shipped Vite config, ESLint must pass.
- **Tests are required.** New behavior needs a Pest test (PHP) and/or a
  Vitest test (JS). Bug fixes should include a regression test.
- **Keep modules decoupled.** Business logic belongs in `resources/js/src/core`
  and `resources/js/src/modules`; the `Toolbar` should only wire UI to
  existing APIs, never contain formatting logic itself.

## Development setup

```bash
git clone https://github.com/inkforge/laravel-editor.git
cd laravel-editor
composer install
cd resources/js && npm install && cd ../..
```

Run the test suites:

```bash
# PHP
composer test
composer analyse
composer format -- --test

# JavaScript
cd resources/js
npm run lint
npm run test
npm run build
```

The `/demo` folder is a minimal Laravel app wired to the local package via a
composer path repository — use it to manually verify changes in a browser:

```bash
cd demo
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

## Submitting a pull request

1. Fork the repo and create a branch from `main`:
   `git checkout -b fix/short-description` or `feat/short-description`.
2. Make your change, with tests.
3. Run the full local check list above — CI runs the same checks and will
   fail the PR otherwise.
4. Update `CHANGELOG.md` under `[Unreleased]`.
5. Open the PR against `main` with a clear description of the problem and
   the fix/feature, including before/after screenshots or a short clip for
   any UI change.
6. Be responsive to review feedback — small, focused PRs get merged fastest.

### Test file conventions

- **PHP tests** live in `tests/Unit/` or `tests/Feature/`, using Pest.
- **JS tests** live in `resources/js/tests/` (one file per module under test).
  Core utilities may also have co-located `*.test.js` files next to the source.
  Use `describe`/`it` blocks; mock DOM via jsdom (available in the Vitest
  environment; no browser needed).

## Reporting bugs

Please include:

- InkForge Editor version, Laravel version, PHP version, browser + version.
- Minimal reproduction (a small Blade snippet or a link to a reduced repo).
- Expected vs. actual behavior.
- Console errors, if any.

## Proposing new modules/plugins

New built-in modules (under `resources/js/src/modules`) should be proposed
as an issue first so the API surface can be discussed — once agreed, they're
registered the same way third-party plugins are, via `Editor.registerPlugin()`.

## License

By contributing, you agree that your contributions will be licensed under
the project's [MIT License](LICENSE).
