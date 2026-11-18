<?php

declare(strict_types=1);

/**
 * Extract the [selector, options] payload <x-editor> embeds for its JS initializer.
 *
 * @return array{0: string, 1: array<string, mixed>}
 */
function editorInitializerPayload(string $html): array
{
    if (! preg_match('/\}\)\(\[([\s\S]*?)\]\);/u', $html, $matches)) {
        throw new RuntimeException('Editor initializer payload not found in rendered HTML.');
    }

    $payload = json_decode('['.$matches[1].']', true, 512, JSON_THROW_ON_ERROR);

    return $payload;
}

it('escapes the value so markup cannot break out of the textarea', function () {
    $html = Blade::render('<x-editor name="content" :value="\'</textarea ><script>alert(1)</script>\'" />');

    expect($html)->toContain('&lt;/textarea &gt;')
        ->and($html)->toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
        ->and($html)->not->toContain('</textarea >')
        ->and($html)->not->toContain('<script>alert(1)</script>');
});

it('replaces the toolbar entirely when a toolbar prop is passed', function () {
    $html = Blade::render('<x-editor name="content" :toolbar="[[\'bold\']]" />');

    expect(editorInitializerPayload($html)[1]['toolbar'])->toBe([['bold']]);
});

it('lets the options prop replace list values wholesale', function () {
    $html = Blade::render('<x-editor name="content" :options="[\'toolbar\' => [[\'undo\', \'redo\']]]" />');

    expect(editorInitializerPayload($html)[1]['toolbar'])->toBe([['undo', 'redo']]);
});

it('passes the sanitizer whitelist to the JavaScript sanitizer using camelCase keys', function () {
    config(['wysiwyg-editor.sanitizer.allowed_tags' => ['p', 'b']]);

    $html = Blade::render('<x-editor name="content" />');
    $sanitizer = editorInitializerPayload($html)[1]['sanitizer'];

    expect($sanitizer)->toHaveKey('allowedTags')
        ->toHaveKey('allowedAttributes')
        ->toHaveKey('allowedUrlSchemes')
        ->not->toHaveKey('allowed_tags')
        ->and($sanitizer['allowedTags'])->toBe(['p', 'b']);
});

it('falls back to a supported locale when the configured locale is invalid', function () {
    config(['wysiwyg-editor.locale' => 'fr']);

    $fromConfig = editorInitializerPayload(Blade::render('<x-editor name="content" />'))[1]['locale'];
    $fromProp = editorInitializerPayload(Blade::render('<x-editor name="content" locale="de" />'))[1]['locale'];

    expect($fromConfig)->toBe('en')
        ->and($fromProp)->toBe('en');
});

it('honours autosave overrides passed as an array', function () {
    $html = Blade::render('<x-editor name="content" :autosave="[\'interval_ms\' => 5000]" />');
    $autosave = editorInitializerPayload($html)[1]['autosave'];

    expect($autosave['enabled'])->toBeTrue()
        ->and($autosave['interval_ms'])->toBe(5000)
        ->and($autosave['storage_key'])->toBe('wysiwyg-editor-autosave');
});

it('exposes the upload route to the editor options', function () {
    $html = Blade::render('<x-editor name="content" />');

    expect(editorInitializerPayload($html)[1]['uploadUrl'])->toBe(route('wysiwyg-editor.upload.image'));
});

it('queues the editor while the module loads and initializes directly afterwards', function () {
    $html = Blade::render('<x-editor name="content" />');

    expect($html)->toContain('window.WysiwygEditor.init(args[0], args[1])')
        ->and($html)->toContain('window.__wysiwygQueue.push(args)');
});

it('encodes the options JSON so markup cannot break out of the script tag', function () {
    // Raw json_encode() leaves `</script>` intact, which closes the script
    // element even inside a JS string — @json() hex-escapes < and >.
    $html = Blade::render('<x-editor name="content" :options="[\'toolbar\' => [[\'</script><script>alert(1)\']]]" />');

    expect($html)->not->toContain('</script><script>alert(1)');

    expect(editorInitializerPayload($html)[1]['toolbar'])
        ->toBe([['</script><script>alert(1)']]);
});
