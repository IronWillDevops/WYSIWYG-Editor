<?php

declare(strict_types=1);

/**
 * The build output is committed to the repository, so the editor can be served
 * from a tag in this repository (jsDelivr) as well as published into `public/`.
 * Both only work when `resources/js/dist/` is complete and each bundle is
 * self-contained, and neither can be checked by looking at a host page: a page
 * that pins a tag keeps exactly what that tag shipped, so a dist that is
 * missing a file fails far away from the change that caused it.
 */
$dist = realpath(__DIR__.'/../../resources/js/dist');
$css = realpath(__DIR__.'/../../resources/css');

it('ships every file the documented CDN and bundler paths point at', function () use ($dist) {
    $readme = (string) file_get_contents(__DIR__.'/../../README.md');

    // Every `resources/js/dist/<file>` the README tells a page to load, read
    // from the README itself: a documented path that no longer resolves is the
    // failure, and it stays invisible until somebody follows the documentation.
    preg_match_all('#resources/js/dist/([A-Za-z0-9._-]+)#', $readme, $matches);
    $documented = array_values(array_unique($matches[1]));
    $missing = array_values(array_filter($documented, fn (string $file): bool => ! is_file($dist.'/'.$file)));

    expect($documented)->not->toBeEmpty()
        ->and($missing)->toBe([]);
});

it('ships every file the documented published paths point at', function () use ($dist, $css) {
    $readme = (string) file_get_contents(__DIR__.'/../../README.md');

    // The `<x-editor>` component, and every hand-written setup in the README,
    // load the editor from `public/vendor/wysiwyg-editor/` — `js/` is the build
    // output, `css/` the stylesheets, which is what `vendor:publish
    // --tag=wysiwyg-editor-assets` puts there. Both directories are spelled
    // the same way in the documentation, so both are resolved the same way here.
    preg_match_all('#vendor/wysiwyg-editor/(js|css)/([A-Za-z0-9._-]+)#', $readme, $matches, PREG_SET_ORDER);

    $documented = [];
    $missing = [];
    foreach ($matches as [, $group, $file]) {
        $documented["{$group}/{$file}"] = true;
        $source = $group === 'js' ? $dist.'/'.$file : $css.'/'.$file;
        if (! is_file($source)) {
            $missing["{$group}/{$file}"] = true;
        }
    }

    expect($documented)->not->toBeEmpty()
        ->and(array_keys($missing))->toBe([]);
});

it('documents no bare package specifier, because there is no package to import', function () {
    $readme = (string) file_get_contents(__DIR__.'/../../README.md');

    // This is a Composer package with no npm distribution and no `style.css` of
    // its own, so `import Editor from '@wysiwyg/editor'` resolves to nothing —
    // and a page that follows it runs the editor with no stylesheet at all,
    // which does not look like a broken import: the editor mounts, and it only
    // misbehaves once the content is tall enough to grow the box.
    preg_match_all('#[\'"]@wysiwyg/[^\'"]+[\'"]#', $readme, $matches);

    expect($matches[0])->toBe([]);
});

it('documents the stylesheet everywhere an editor is mounted', function () use ($dist) {
    $readme = (string) file_get_contents(__DIR__.'/../../README.md');

    // The bundles carry no CSS: `wysiwyg-editor.css` is a separate file,
    // published to its own directory and never imported by the script. It is
    // therefore a required companion and not an optional theme, and every setup
    // in the documentation has to load it. Without it the editor's box stops
    // being a bounded flex column, so nothing clips or scrolls: a multiline
    // paste then grows the editing area to the full height of the document, the
    // page becomes the only scroll area, and the toolbar and status bar scroll
    // out of view with it. That failure shows up long after the page has loaded
    // and reads as a content bug, not as a missing stylesheet, so it is held
    // here per documented setup: a section that mounts an editor has to name the
    // stylesheet. The Blade component needs no exemption because it mounts
    // through `<x-editor />` and never calls `init()` itself.
    $bundle = (string) file_get_contents($dist.'/wysiwyg-editor.esm.js');
    expect($bundle)->not->toContain('.css');

    $without = [];
    foreach (preg_split('#(?=^#{2,3} )#m', $readme) ?: [] as $section) {
        if (str_contains($section, '.init(') && ! str_contains($section, 'wysiwyg-editor.css')) {
            preg_match('#^#{2,3} (.+)#m', $section, $title);
            $without[] = $title[1] ?? '(preamble)';
        }
    }

    expect($without)->toBe([]);
});

it('ships a complete dist, so no bundle imports a file that is not there', function () use ($dist) {
    // The ESM entry imports its per-module chunks relatively, so a published
    // (or CDN-served) `dist/` only works while every one of them sits beside
    // it. Publishing the whole `resources/js` tree instead put the bundle a
    // directory too deep, where its own relative imports had nothing to
    // resolve against.
    $bundles = glob($dist.'/*.js') ?: [];
    $imports = [];

    foreach ($bundles as $bundle) {
        preg_match_all('#(?:from|import\()\s*"\./([^"]+)"#', (string) file_get_contents($bundle), $found);

        foreach ($found[1] as $imported) {
            $imports[basename($bundle).' -> '.$imported] = $imported;
        }
    }

    $missing = array_keys(array_filter($imports, fn (string $imported): bool => ! is_file($dist.'/'.$imported)));

    // The bundles have to be there for any of this to mean something — the
    // contract is about the files as they are shipped, not about how the build
    // happens to split them.
    expect($bundles)->not->toBeEmpty()
        ->and($missing)->toBe([]);
});

it('ships a self-contained UMD bundle exposing the documented global', function () use ($dist) {
    $umd = (string) file_get_contents($dist.'/wysiwyg-editor.umd.js');

    // A `<script src=...>`-only page (the CDN case) has no bundler to satisfy a
    // relative dynamic import, so the UMD build has to carry all of it.
    expect($umd)->not->toContain('import("./');

    // `WysiwygEditor` is the whole public surface of a script-tag install, so a
    // renamed `lib.name` in the Vite config would break every such page.
    expect($umd)->toContain('.WysiwygEditor=')
        ->and($umd)->toContain('destroyAll')
        ->and($umd)->toContain('registerPlugin');
});
