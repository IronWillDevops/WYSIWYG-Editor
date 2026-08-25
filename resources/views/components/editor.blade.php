@props([
    'name' => 'content',
    'id' => null,
    'value' => '',
    'theme' => config('inkforge-editor.theme', 'auto'),
    'locale' => config('inkforge-editor.locale', app()->getLocale()),
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
        $locale = config('inkforge-editor.locale', 'en');
    }

    $uploadUrl = $uploadUrl ?? (app('router')->has('inkforge-editor.upload.image')
        ? route('inkforge-editor.upload.image')
        : null);

    $mergedOptions = \InkForge\Editor\Facades\InkForgeEditor::buildOptions(array_filter([
        'theme' => $theme,
        'locale' => $locale,
        'toolbar' => $toolbar,
        'height' => $height,
        'autosave' => $autosave ? array_merge(config('inkforge-editor.autosave', []), ['enabled' => true]) : null,
        'disabledPlugins' => $disabledPlugins,
        'sanitizer' => $sanitizer,
        'history' => $history,
        'uploadUrl' => $uploadUrl,
    ], static fn ($v) => $v !== null));

    $mergedOptions = array_replace_recursive($mergedOptions, $options);
@endphp

<div {{ $attributes->only('class') }} data-inkforge-editor-wrapper>
    <textarea
        name="{{ $name }}"
        id="{{ $elementId }}"
        style="display:none"
    >{{ $value }}</textarea>
</div>

@once
    <link rel="stylesheet" href="{{ asset('vendor/inkforge-editor/css/inkforge-editor.css') }}">
@endonce

@once('inkforge-editor-module')
    <script>
        window.__inkforgeQueue = [];
    </script>
    <script type="module">
        import Editor from "{{ asset('vendor/inkforge-editor/js/inkforge-editor.esm.js') }}";
        (window.__inkforgeQueue || []).forEach(function (args) {
            Editor.init(args[0], args[1]);
        });
        window.InkForgeEditor = Editor;
    </script>
@endonce

<script>
    window.__inkforgeQueue.push([
        @json('#' . $elementId),
        {!! json_encode($mergedOptions) !!}
    ]);
</script>
