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
    if (!in_array($locale, $supportedLocales)) {
        $locale = config('wysiwyg-editor.locale', 'en');
    }

    $uploadUrl = $uploadUrl ?? (app('router')->has('wysiwyg-editor.upload.image')
        ? route('wysiwyg-editor.upload.image')
        : null);

    $mergedOptions = \Wysiwyg\Editor\Facades\WysiwygEditor::buildOptions(array_filter([
        'theme' => $theme,
        'locale' => $locale,
        'toolbar' => $toolbar,
        'height' => $height,
        'autosave' => $autosave ? array_merge(config('wysiwyg-editor.autosave', []), ['enabled' => true]) : null,
        'disabledPlugins' => $disabledPlugins,
        'sanitizer' => $sanitizer,
        'history' => $history,
        'uploadUrl' => $uploadUrl,
    ], static fn ($v) => $v !== null));

    $mergedOptions = array_replace_recursive($mergedOptions, $options);
@endphp

<div {{ $attributes->only('class') }} data-wysiwyg-editor-wrapper>
    <textarea
        name="{{ $name }}"
        id="{{ $elementId }}"
        style="display:none"
    >{!! preg_replace('/<\/textarea>/i', '&lt;/textarea&gt;', $value) !!}</textarea>
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
    window.__wysiwygQueue.push([
        @json('#' . $elementId),
        {!! json_encode($mergedOptions) !!}
    ]);
</script>
