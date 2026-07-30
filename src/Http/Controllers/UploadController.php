<?php

declare(strict_types=1);

namespace InkForge\Editor\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class UploadController extends Controller
{
    public function image(Request $request): JsonResponse
    {
        $maxSizeKb = (int) config('inkforge-editor.upload.max_size_kb', 5120);
        $allowedMimes = implode(',', config('inkforge-editor.upload.allowed_mimes', ['jpg', 'jpeg', 'png', 'gif', 'webp']));

        $validated = $request->validate([
            'file' => ['required', 'file', 'image', "mimes:{$allowedMimes}", "max:{$maxSizeKb}"],
        ]);

        $disk = (string) config('inkforge-editor.upload.disk', 'public');
        $directory = trim((string) config('inkforge-editor.upload.path', 'inkforge-editor/uploads'), '/');

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
                'message' => __('inkforge-editor::editor.upload_failed'),
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
