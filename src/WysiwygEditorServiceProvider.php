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

        $this->publishes([
            __DIR__.'/../resources/js' => public_path('vendor/wysiwyg-editor/js'),
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
