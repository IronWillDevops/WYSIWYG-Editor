<?php

declare(strict_types=1);

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

it('uploads a valid image and returns its public URL', function () {
    $file = UploadedFile::fake()->image('photo.jpg', 800, 600)->size(500);

    $response = $this->post(route('inkforge-editor.upload.image'), ['file' => $file]);

    $response->assertOk()->assertJson(['success' => true]);
    $path = $response->json('path');
    Storage::disk('public')->assertExists($path);
});

it('rejects files exceeding the configured max size', function () {
    config(['inkforge-editor.upload.max_size_kb' => 100]);
    $file = UploadedFile::fake()->image('too-big.jpg')->size(500);

    $response = $this->post(route('inkforge-editor.upload.image'), ['file' => $file]);

    $response->assertStatus(422);
});

it('rejects disallowed mime types', function () {
    $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $response = $this->post(route('inkforge-editor.upload.image'), ['file' => $file]);

    $response->assertStatus(422);
});

it('rejects requests without a file', function () {
    $response = $this->post(route('inkforge-editor.upload.image'), []);

    $response->assertStatus(422);
});
