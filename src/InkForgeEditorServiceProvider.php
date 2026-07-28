<?php

declare(strict_types=1);

namespace InkForge\Editor;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;
use InkForge\Editor\Http\Controllers\UploadController;

final class InkForgeEditorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/inkforge-editor.php', 'inkforge-editor');

        $this->app->singleton('inkforge-editor', function ($app) {
            return new InkForgeEditor($app['config']->get('inkforge-editor', []));
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
            __DIR__.'/../config/inkforge-editor.php' => config_path('inkforge-editor.php'),
        ], 'inkforge-editor-config');

        $this->publishes([
            __DIR__.'/../resources/views' => resource_path('views/vendor/inkforge-editor'),
        ], 'inkforge-editor-views');

        $this->publishes([
            __DIR__.'/../resources/js' => public_path('vendor/inkforge-editor/js'),
            __DIR__.'/../resources/css' => public_path('vendor/inkforge-editor/css'),
        ], 'inkforge-editor-assets');

        $this->publishes([
            __DIR__.'/../resources/lang' => $this->app->langPath('vendor/inkforge-editor'),
        ], 'inkforge-editor-lang');
    }

    private function registerViews(): void
    {
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'inkforge-editor');
    }

    private function registerTranslations(): void
    {
        $this->loadTranslationsFrom(__DIR__.'/../resources/lang', 'inkforge-editor');
    }

    private function registerRoutes(): void
    {
        $this->app['router']
            ->group([
                'prefix' => config('inkforge-editor.upload.route_prefix', 'inkforge-editor'),
                'middleware' => config('inkforge-editor.upload.middleware', ['web']),
            ], function ($router): void {
                $router->post('/upload/image', [UploadController::class, 'image'])
                    ->name('inkforge-editor.upload.image');
            });
    }

    private function registerBladeComponent(): void
    {
        Blade::component('inkforge-editor::components.editor', 'editor');
    }
}
