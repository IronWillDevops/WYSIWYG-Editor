<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class DemoPostController extends Controller
{
    /**
     * Sample content shown before anything has been saved. Shared by the
     * editor and the published-post pages so "View published post" always
     * reflects exactly what the editor shows.
     */
    public const DEFAULT_CONTENT = <<<'HTML'
        <h1>Welcome to WYSIWYG Editor</h1>
        <p>This is a live demo running inside a plain Laravel Blade view.
        Try formatting text, inserting a <strong>table</strong>, an
        <em>image</em>, or a <a href="https://github.com/wysiwyg/laravel-editor">link</a>.</p>
        HTML;

    public function edit(Request $request): View
    {
        $content = $request->session()->get('demo.content', self::DEFAULT_CONTENT);

        return view('demo.edit', ['content' => $content]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate(['content' => ['nullable', 'string']]);
        $request->session()->put('demo.content', $validated['content'] ?? '');

        return redirect()->route('demo.edit')->with('status', 'Saved!');
    }

    public function show(Request $request): View
    {
        $content = $request->session()->get('demo.content', self::DEFAULT_CONTENT);

        return view('demo.post', ['content' => $content]);
    }
}
