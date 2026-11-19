<?php

declare(strict_types=1);

use Wysiwyg\Editor\WysiwygEditor;

it('returns the configured value via get() with dot notation', function () {
    $editor = new WysiwygEditor([
        'theme' => 'dark',
        'upload' => ['max_size_kb' => 2048],
    ]);

    expect($editor->get('theme'))->toBe('dark')
        ->and($editor->get('upload.max_size_kb'))->toBe(2048)
        ->and($editor->get('missing.key', 'fallback'))->toBe('fallback');
});

it('merges overrides into the base config via buildOptions()', function () {
    $editor = new WysiwygEditor([
        'theme' => 'light',
        'toolbar' => [['bold', 'italic']],
    ]);

    $options = $editor->buildOptions(['theme' => 'dark']);

    expect($options['theme'])->toBe('dark')
        ->and($options['toolbar'])->toBe([['bold', 'italic']]);
});

it('exposes a semantic version string', function () {
    $editor = new WysiwygEditor();

    expect($editor->version())->toMatch('/^\d+\.\d+\.\d+$/');
});

it('returns the full config array via config()', function () {
    $config = ['theme' => 'dark', 'upload' => ['max_size_kb' => 2048]];
    $editor = new WysiwygEditor($config);

    expect($editor->config())->toBe($config);
});

it('returns an empty array from config() when constructed without arguments', function () {
    $editor = new WysiwygEditor();

    expect($editor->config())->toBe([]);
});

it('replaces list values wholesale instead of merging them index-by-index', function () {
    $editor = new WysiwygEditor([
        'toolbar' => [['undo', 'redo'], ['bold', 'italic']],
        'upload' => ['disk' => 'public', 'allowed_mimes' => ['jpg', 'png']],
    ]);

    $options = $editor->buildOptions([
        'toolbar' => [['bold']],
        'upload' => ['allowed_mimes' => ['webp']],
    ]);

    expect($options['toolbar'])->toBe([['bold']])
        ->and($options['upload']['disk'])->toBe('public')
        ->and($options['upload']['allowed_mimes'])->toBe(['webp']);
});

it('merges associative overrides recursively via mergeOptions()', function () {
    $merged = WysiwygEditor::mergeOptions(
        ['history' => ['max_steps' => 1000, 'debounce_ms' => 300]],
        ['history' => ['debounce_ms' => 50]],
    );

    expect($merged['history'])->toBe(['max_steps' => 1000, 'debounce_ms' => 50]);
});
