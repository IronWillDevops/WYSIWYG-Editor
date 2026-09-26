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
