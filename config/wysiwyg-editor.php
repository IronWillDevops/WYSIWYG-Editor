<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Theme
    |--------------------------------------------------------------------------
    |
    | Supported: "light", "dark", "auto" (follows prefers-color-scheme).
    |
    */
    'theme' => env('WYSIWYG_EDITOR_THEME', 'auto'),

    /*
    |--------------------------------------------------------------------------
    | Locale
    |--------------------------------------------------------------------------
    |
    | Supported out of the box: "en", "uk", "ru".
    |
    */
    'locale' => env('WYSIWYG_EDITOR_LOCALE', 'en'),

    /*
    |--------------------------------------------------------------------------
    | Toolbar
    |--------------------------------------------------------------------------
    |
    | Ordered list of toolbar groups. Set to false/omit a button to hide it.
    | The full list of available button ids lives in resources/js/src/toolbar.
    |
    */
    'toolbar' => [
        ['undo', 'redo'],
        ['blockFormat', 'fontFamily', 'fontSize'],
        ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'],
        ['forecolor', 'backcolor', 'removeFormat'],
        ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
        ['bulletList', 'orderedList', 'checklist', 'indent', 'outdent'],
        ['link', 'unlink', 'image', 'video', 'audio', 'table', 'hr'],
        ['blockquote', 'codeInline', 'codeBlock', 'note'],
        ['emoji', 'specialChars'],
        ['find', 'sourceCode', 'fullscreen'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Plugins
    |--------------------------------------------------------------------------
    |
    | Additional plugin identifiers to auto-register, e.g. custom bundles.
    |
    */
    'plugins' => [],

    /*
    |--------------------------------------------------------------------------
    | History
    |--------------------------------------------------------------------------
    */
    'history' => [
        'max_steps' => 1000,
        'debounce_ms' => 300,
    ],

    /*
    |--------------------------------------------------------------------------
    | Autosave
    |--------------------------------------------------------------------------
    */
    'autosave' => [
        'enabled' => false,
        'interval_ms' => 15000,
        'storage_key' => 'wysiwyg-editor-autosave',
    ],

    /*
    |--------------------------------------------------------------------------
    | Sanitizer
    |--------------------------------------------------------------------------
    |
    | Applied both client-side (paste/output) and can be mirrored server-side
    | before persisting content.
    |
    */
    'sanitizer' => [
        'allowed_tags' => [
            'p', 'br', 'div', 'span', 'a', 'strong', 'em', 'u', 's', 'sup', 'sub',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
            'img', 'figure', 'figcaption', 'video', 'audio', 'source', 'iframe', 'hr',
        ],
        'allowed_attributes' => [
            '*' => ['class', 'style', 'id'],
            'a' => ['href', 'target', 'rel', 'title'],
            'img' => ['src', 'alt', 'title', 'width', 'height', 'loading'],
            'iframe' => ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
            'video' => ['src', 'controls', 'width', 'height', 'poster'],
            'audio' => ['src', 'controls'],
            'source' => ['src', 'type'],
        ],
        'allowed_url_schemes' => ['http', 'https', 'mailto', 'tel'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Image upload
    |--------------------------------------------------------------------------
    */
    'upload' => [
        'route_prefix' => 'wysiwyg-editor',
        'middleware' => ['web'],
        'disk' => env('WYSIWYG_EDITOR_UPLOAD_DISK', 'public'),
        'path' => 'wysiwyg-editor/uploads',
        'max_size_kb' => 5120,
        'allowed_mimes' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    ],

];
