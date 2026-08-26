<?php

declare(strict_types=1);

namespace Wysiwyg\Editor\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array<string, mixed> config()
 * @method static mixed get(string $key, mixed $default = null)
 * @method static array<string, mixed> buildOptions(array $overrides = [])
 * @method static string version()
 */
final class WysiwygEditor extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'wysiwyg-editor';
    }
}
