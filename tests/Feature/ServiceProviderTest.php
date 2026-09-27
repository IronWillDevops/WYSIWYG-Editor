<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Wysiwyg\Editor\Facades\WysiwygEditor;
use Wysiwyg\Editor\WysiwygEditorServiceProvider;

it('merges the package config under the wysiwyg-editor key', function () {
    expect(config('wysiwyg-editor.theme'))->toBe('auto')
        ->and(config('wysiwyg-editor.locale'))->toBe('en')
        ->and(config('wysiwyg-editor.history.max_steps'))->toBe(1000);
});

it('registers the upload route', function () {
    expect(route('wysiwyg-editor.upload.image'))->toContain('/wysiwyg-editor/upload/image');
});

it('resolves the WysiwygEditor facade to the bound singleton', function () {
    expect(WysiwygEditor::version())->toBeString()
        ->and(WysiwygEditor::get('locale'))->toBe('en');
});

it('renders the <x-editor> Blade component without errors', function () {
    $html = Blade::render('<x-editor name="content" :value="\'<p>hi</p>\'" />');

    expect($html)->toContain('name="content"')
        ->and($html)->toContain('&lt;p&gt;hi&lt;/p&gt;');
});

it('sizes the editor from the config height by default', function () {
    expect(config('wysiwyg-editor.height'))->toBe(420);

    $html = Blade::render('<x-editor name="content" />');

    expect($html)->toContain('"height":420');
});

it('takes the editor height from the config when the app sets one', function () {
    config(['wysiwyg-editor.height' => '640px']);

    expect(Blade::render('<x-editor name="content" />'))->toContain('"height":"640px"');
});

it('lets the height prop override the config height', function () {
    config(['wysiwyg-editor.height' => 640]);

    expect(Blade::render('<x-editor name="content" :height="300" />'))->toContain('"height":300');
});

it('publishes the build output at the path the component loads it from', function () {
    // The paths the component actually asks the browser for.
    $html = Blade::render('<x-editor name="content" />');

    expect($html)->toContain('vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js')
        ->and($html)->toContain('vendor/wysiwyg-editor/css/wysiwyg-editor.css');

    $published = ServiceProvider::pathsToPublish(WysiwygEditorServiceProvider::class, 'wysiwyg-editor-assets');
    $sources = array_map(realpath(...), array_keys($published));
    $dist = __DIR__.'/../../resources/js/dist';

    // `asset()` is relative to the public root, so the ESM has to sit at the root
    // of a published source — and the module's own relative imports (the
    // per-module chunks) resolve only if they are published beside it. That is
    // the build output published *as* the asset root; publishing the whole
    // `resources/js` tree instead put the bundle one directory too deep (a path
    // nothing ever loaded) and copied `node_modules` into public/ along the way.
    expect($sources)->toContain(realpath($dist))
        ->and($sources)->not->toContain(realpath(__DIR__.'/../../resources/js'))
        ->and(array_values($published))->toContain(public_path('vendor/wysiwyg-editor/js'))
        ->and(is_file($dist.'/wysiwyg-editor.esm.js'))->toBeTrue();
});
