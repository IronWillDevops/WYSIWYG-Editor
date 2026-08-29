<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WYSIWYG Editor — Published post</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- Only the shared content stylesheet. No editor-UI CSS is loaded. --}}
    <link rel="stylesheet" href="{{ asset('vendor/wysiwyg-editor/css/wysiwyg-content.css') }}">
</head>
<body style="max-width:760px;margin:40px auto;font-family:system-ui,sans-serif;color:#1f2328;">
    <h1>Published post</h1>

    <div class="ife-content max-w-none">
        {!! $content !!}
    </div>

    <p><a href="{{ route('demo.edit') }}">&larr; Back to editor</a></p>
</body>
</html>
