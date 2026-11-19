<?php

declare(strict_types=1);

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

it('publishes the compiled dist build to the public vendor paths', function () {
    $paths = ServiceProvider::pathsToPublish(WysiwygEditorServiceProvider::class, 'wysiwyg-editor-assets');

    $sources = array_map(
        static fn (string $path): string => realpath($path) ?: $path,
        array_keys($paths)
    );

    expect($sources)->toContain(realpath(__DIR__.'/../../resources/js/dist'))
        ->and($sources)->not->toContain(realpath(__DIR__.'/../../resources/js'))
        ->and(array_values($paths))->toContain(public_path('vendor/wysiwyg-editor/js'))
        ->and(array_values($paths))->toContain(public_path('vendor/wysiwyg-editor/css'));

    foreach ($sources as $source) {
        expect($source)->not->toContain('/node_modules');
    }
});
