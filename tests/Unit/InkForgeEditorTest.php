<?php

declare(strict_types=1);

use InkForge\Editor\InkForgeEditor;

it('returns the configured value via get() with dot notation', function () {
    $editor = new InkForgeEditor([
        'theme' => 'dark',
        'upload' => ['max_size_kb' => 2048],
    ]);

    expect($editor->get('theme'))->toBe('dark')
        ->and($editor->get('upload.max_size_kb'))->toBe(2048)
        ->and($editor->get('missing.key', 'fallback'))->toBe('fallback');
});

it('merges overrides into the base config via buildOptions()', function () {
    $editor = new InkForgeEditor([
        'theme' => 'light',
        'toolbar' => [['bold', 'italic']],
    ]);

    $options = $editor->buildOptions(['theme' => 'dark']);

    expect($options['theme'])->toBe('dark')
        ->and($options['toolbar'])->toBe([['bold', 'italic']]);
});

it('exposes a semantic version string', function () {
    $editor = new InkForgeEditor();

    expect($editor->version())->toMatch('/^\d+\.\d+\.\d+$/');
});
