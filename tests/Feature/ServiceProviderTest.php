<?php

declare(strict_types=1);

use Wysiwyg\Editor\Facades\WysiwygEditor;

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
