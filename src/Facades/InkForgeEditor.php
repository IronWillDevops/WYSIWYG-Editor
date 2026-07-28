<?php

declare(strict_types=1);

namespace InkForge\Editor\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array<string, mixed> config()
 * @method static mixed get(string $key, mixed $default = null)
 * @method static array<string, mixed> buildOptions(array $overrides = [])
 * @method static string version()
 */
final class InkForgeEditor extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'inkforge-editor';
    }
}
