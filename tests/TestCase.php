<?php

declare(strict_types=1);

namespace Wysiwyg\Editor\Tests;

use Orchestra\Testbench\TestCase as Orchestra;
use Wysiwyg\Editor\WysiwygEditorServiceProvider;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [
            WysiwygEditorServiceProvider::class,
        ];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode('abcdefghijklmnopqrstuvwxyz012345'));

        $app['config']->set('filesystems.disks.public', [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => '/storage',
            'visibility' => 'public',
        ]);
    }
}
