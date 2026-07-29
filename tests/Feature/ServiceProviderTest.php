<?php

declare(strict_types=1);

use InkForge\Editor\Facades\InkForgeEditor;

it('merges the package config under the inkforge-editor key', function () {
    expect(config('inkforge-editor.theme'))->toBe('auto')
        ->and(config('inkforge-editor.locale'))->toBe('en')
        ->and(config('inkforge-editor.history.max_steps'))->toBe(1000);
});

it('registers the upload route', function () {
    expect(route('inkforge-editor.upload.image'))->toContain('/inkforge-editor/upload/image');
});

it('resolves the InkForgeEditor facade to the bound singleton', function () {
    expect(InkForgeEditor::version())->toBeString()
        ->and(InkForgeEditor::get('locale'))->toBe('en');
});

it('renders the <x-editor> Blade component without errors', function () {
    $html = Blade::render('<x-editor name="content" :value="\'<p>hi</p>\'" />');

    expect($html)->toContain('name="content"')
        ->and($html)->toContain('&lt;p&gt;hi&lt;/p&gt;');
});
