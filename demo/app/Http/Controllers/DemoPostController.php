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
            <h1>Welcome to WYSIWYG Editor</h1>
            <p>This is a live demo running inside a plain Laravel Blade view.
            Try formatting text, inserting a <strong>table</strong>, an
            <em>image</em>, or a <a href="https://github.com/wysiwyg/laravel-editor">link</a>.</p>
            HTML);

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
        $content = $request->session()->get('demo.content', <<<'HTML'
            <h2>Welcome to WYSIWYG Editor</h2>
            <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
            <blockquote>Quote text</blockquote>
            <ul><li>Item one</li><li>Item two</li></ul>
            <ol><li>Item one</li><li>Item two</li></ol>
            <table class="ife-table">
                <thead><tr><th>Name</th><th>Value</th></tr></thead>
                <tbody><tr><td>Test</td><td>123</td></tr></tbody>
            </table>
            <pre><code>const test = true;</code></pre>
            HTML);

        return view('demo.post', ['content' => $content]);
    }
}
