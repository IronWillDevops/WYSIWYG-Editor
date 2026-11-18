<?php

declare(strict_types=1);

namespace Wysiwyg\Editor\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class UploadController extends Controller
{
    public function image(Request $request): JsonResponse
    {
        $maxSizeKb = (int) config('wysiwyg-editor.upload.max_size_kb', 5120);

        $allowedMimes = config('wysiwyg-editor.upload.allowed_mimes', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        if (is_string($allowedMimes)) {
            $allowedMimes = explode(',', $allowedMimes);
        }

        $allowedMimes = array_values(array_filter(
            is_array($allowedMimes) ? $allowedMimes : [],
            static fn (mixed $mime): bool => is_string($mime) && trim($mime) !== ''
        ));
        $allowedMimes = array_map('trim', $allowedMimes);

        try {
            $validated = $request->validate([
                'file' => ['required', 'file', 'image', 'mimes:'.implode(',', $allowedMimes), "max:{$maxSizeKb}"],
            ]);
        } catch (ValidationException $exception) {
            // The editor's JavaScript client posts without an Accept header, so
            // answer with JSON unconditionally instead of a redirect to HTML.
            return response()->json([
                'success' => false,
                'message' => Arr::first(Arr::flatten($exception->errors())),
                'errors' => $exception->errors(),
            ], 422);
        }

        $disk = (string) config('wysiwyg-editor.upload.disk', 'public');
        $directory = trim((string) config('wysiwyg-editor.upload.path', 'wysiwyg-editor/uploads'), '/');

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $validated['file'];

        $filename = sprintf(
            '%s-%s.%s',
            now()->format('Ymd-His'),
            Str::random(12),
            $file->guessExtension()
        );

        $path = $file->storeAs($directory, $filename, $disk);

        if ($path === false) {
            return response()->json([
                'success' => false,
                'message' => __('wysiwyg-editor::editor.upload_failed'),
            ], 422);
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $storage */
        $storage = Storage::disk($disk);

        return response()->json([
            'success' => true,
            'url' => $storage->url($path),
            'path' => $path,
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ]);
    }
}
