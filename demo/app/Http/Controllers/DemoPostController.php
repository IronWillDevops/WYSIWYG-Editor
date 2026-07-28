<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class DemoPostController extends Controller
{
    public function edit(Request $request): View
    {
        $content = $request->session()->get('demo.content', <<<'HTML'
            <h1>Welcome to InkForge Editor</h1>
            <p>This is a live demo running inside a plain Laravel Blade view.
            Try formatting text, inserting a <strong>table</strong>, an
            <em>image</em>, or a <a href="https://github.com/inkforge/laravel-editor">link</a>.</p>
            HTML);

        return view('demo.edit', ['content' => $content]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate(['content' => ['nullable', 'string']]);
        $request->session()->put('demo.content', $validated['content'] ?? '');

        return redirect()->route('demo.edit')->with('status', 'Saved!');
    }
}
