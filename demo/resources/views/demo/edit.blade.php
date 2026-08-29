<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>WYSIWYG Editor — Demo</title>
</head>
<body style="max-width:900px;margin:40px auto;font-family:system-ui,sans-serif;">
    <h1>WYSIWYG Editor demo</h1>

    @if (session('status'))
        <p style="color:#1a7f37;">{{ session('status') }}</p>
    @endif

    <form method="POST" action="{{ route('demo.update') }}">
        @csrf

        <x-editor
            name="content"
            id="content"
            :value="$content"
            theme="auto"
            locale="en"
            :height="500"
            autosave
        />

        <button type="submit" style="margin-top:16px;padding:8px 20px;">
            Save
        </button>

        <a href="{{ route('demo.post') }}" style="margin-left:12px;">View published post &rarr;</a>
    </form>
</body>
</html>
