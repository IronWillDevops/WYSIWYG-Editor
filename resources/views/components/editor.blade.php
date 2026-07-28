@props([
    'name' => 'content',
    'id' => null,
    'value' => '',
    'theme' => config('inkforge-editor.theme', 'auto'),
    'locale' => config('inkforge-editor.locale', 'en'),
    'toolbar' => null,
    'height' => 420,
    'autosave' => null,
    'options' => [],
])

@php
    $elementId = $id ?? $name.'-'.uniqid();
    $mergedOptions = \InkForge\Editor\Facades\InkForgeEditor::buildOptions(array_filter([
        'theme' => $theme,
        'locale' => $locale,
        'toolbar' => $toolbar,
        'height' => $height,
        'autosave' => $autosave ? array_merge(config('inkforge-editor.autosave', []), ['enabled' => true]) : null,
    ], static fn ($v) => $v !== null));
    $mergedOptions = array_replace_recursive($mergedOptions, $options);
    $uploadUrl = route('inkforge-editor.upload.image');
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

<script type="module">
    import Editor from "{{ asset('vendor/inkforge-editor/js/inkforge-editor.esm.js') }}";

    Editor.init('#{{ $elementId }}', Object.assign(
        { uploadUrl: @json($uploadUrl) },
        @json($mergedOptions)
    ));
</script>
