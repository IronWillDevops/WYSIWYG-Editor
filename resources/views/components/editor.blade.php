@props([
    'name' => 'content',
    'id' => null,
    'value' => '',
    'theme' => config('wysiwyg-editor.theme', 'auto'),
    'locale' => config('wysiwyg-editor.locale', app()->getLocale()),
    'toolbar' => null,
    'height' => 420,
    'autosave' => null,
    'disabledPlugins' => null,
    'sanitizer' => null,
    'history' => null,
    'uploadUrl' => null,
    'options' => [],
])

@php
    $elementId = $id ?? $name . '-' . uniqid();

    $supportedLocales = ['en', 'uk', 'ru'];
    if (! in_array($locale, $supportedLocales, true)) {
        $configLocale = config('wysiwyg-editor.locale', 'en');
        $locale = in_array($configLocale, $supportedLocales, true) ? $configLocale : 'en';
    }

    $uploadUrl = $uploadUrl ?? (app('router')->has('wysiwyg-editor.upload.image')
        ? route('wysiwyg-editor.upload.image')
        : null);

    $autosaveOptions = null;
    if (is_array($autosave)) {
        $autosaveOptions = array_merge(config('wysiwyg-editor.autosave', []), ['enabled' => true], $autosave);
    } elseif ($autosave) {
        $autosaveOptions = array_merge(config('wysiwyg-editor.autosave', []), ['enabled' => true]);
    }

    $mergedOptions = \Wysiwyg\Editor\Facades\WysiwygEditor::buildOptions(array_filter([
        'theme' => $theme,
        'locale' => $locale,
        'toolbar' => $toolbar,
        'height' => $height,
        'autosave' => $autosaveOptions,
        'disabledPlugins' => $disabledPlugins,
        'sanitizer' => $sanitizer,
        'history' => $history,
        'uploadUrl' => $uploadUrl,
    ], static fn ($v) => $v !== null));

    $mergedOptions = \Wysiwyg\Editor\Facades\WysiwygEditor::mergeOptions($mergedOptions, $options);

    // The JavaScript Sanitizer consumes camelCase keys while the published
    // config uses snake_case; translate so a custom whitelist really applies.
    if (isset($mergedOptions['sanitizer']) && is_array($mergedOptions['sanitizer'])) {
        $sanitizerAliases = [
            'allowed_tags' => 'allowedTags',
            'allowed_attributes' => 'allowedAttributes',
            'allowed_url_schemes' => 'allowedUrlSchemes',
        ];
        $sanitizerOptions = [];
        foreach ($mergedOptions['sanitizer'] as $sanitizerKey => $sanitizerValue) {
            $sanitizerOptions[$sanitizerAliases[$sanitizerKey] ?? $sanitizerKey] = $sanitizerValue;
        }
        $mergedOptions['sanitizer'] = $sanitizerOptions;
    }
@endphp

<div {{ $attributes->only('class') }} data-wysiwyg-editor-wrapper>
    <textarea
        name="{{ $name }}"
        id="{{ $elementId }}"
        style="display:none"
    >{{ $value }}</textarea>
</div>

@once
    <link rel="stylesheet" href="{{ asset('vendor/wysiwyg-editor/css/wysiwyg-editor.css') }}">
@endonce

@once('wysiwyg-editor-module')
    <script>
        window.__wysiwygQueue = [];
    </script>
    <script type="module">
        import Editor from "{{ asset('vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js') }}";
        (window.__wysiwygQueue || []).forEach(function (args) {
            Editor.init(args[0], args[1]);
        });
        window.WysiwygEditor = Editor;
    </script>
@endonce

<script>
    (function (args) {
        if (window.WysiwygEditor) {
            window.WysiwygEditor.init(args[0], args[1]);
            return;
        }
        window.__wysiwygQueue = window.__wysiwygQueue || [];
        window.__wysiwygQueue.push(args);
    })([
        @json('#' . $elementId),
        @json($mergedOptions)
    ]);
</script>
