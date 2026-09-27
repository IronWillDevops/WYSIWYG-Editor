<?php

declare(strict_types=1);

namespace Wysiwyg\Editor;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use Wysiwyg\Editor\Http\Controllers\UploadController;

final class WysiwygEditorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/wysiwyg-editor.php', 'wysiwyg-editor');

        $this->app->singleton('wysiwyg-editor', function ($app) {
            return new WysiwygEditor($app['config']->get('wysiwyg-editor', []));
        });
    }

    public function boot(): void
    {
        $this->registerPublishing();
        $this->registerViews();
        $this->registerTranslations();
        $this->registerRoutes();
        $this->registerBladeComponent();
    }

    private function registerPublishing(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->publishes([
            __DIR__.'/../config/wysiwyg-editor.php' => config_path('wysiwyg-editor.php'),
        ], 'wysiwyg-editor-config');

        $this->publishes([
            __DIR__.'/../resources/views' => resource_path('views/vendor/wysiwyg-editor'),
        ], 'wysiwyg-editor-views');

        // The build's `dist` is published as the asset root, so the path the
        // <x-editor> component and the README reference
        // (`vendor/wysiwyg-editor/js/wysiwyg-editor.esm.js`) is the path that
        // exists, with the module's own imports — the hashed per-module chunks —
        // sitting next to it where those relative imports resolve. Publishing
        // the whole `resources/js` tree instead put the bundle one directory too
        // deep, and copied `node_modules` into `public/`.
        $this->publishes([
            __DIR__.'/../resources/js/dist' => public_path('vendor/wysiwyg-editor/js'),
            __DIR__.'/../resources/css' => public_path('vendor/wysiwyg-editor/css'),
        ], 'wysiwyg-editor-assets');

        $this->publishes([
            __DIR__.'/../resources/lang' => $this->app->langPath('vendor/wysiwyg-editor'),
        ], 'wysiwyg-editor-lang');
    }

    private function registerViews(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'wysiwyg-editor');
    }

    private function registerTranslations(): void
    {
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'wysiwyg-editor');
    }

    private function registerRoutes(): void
    {
        $this->app['router']
            ->group([
                'prefix' => config('wysiwyg-editor.upload.route_prefix', 'wysiwyg-editor'),
                'middleware' => config('wysiwyg-editor.upload.middleware', ['web']),
            ], function ($router): void {
                $router->post('/upload/image', [UploadController::class, 'image'])
                    ->name('wysiwyg-editor.upload.image');
            });
    }

    private function registerBladeComponent(): void
    {
        Blade::component('wysiwyg-editor::components.editor', 'editor');
    }
}
