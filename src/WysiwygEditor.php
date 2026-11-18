<?php

declare(strict_types=1);

namespace Wysiwyg\Editor;

final class WysiwygEditor
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private readonly array $config = [])
    {
    }

    /**
     * @return array<string, mixed>
     */
    public function config(): array
    {
        return $this->config;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return data_get($this->config, $key, $default);
    }

    /**
     * Build a JSON-safe options array by merging per-instance overrides
     * onto the package defaults.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function buildOptions(array $overrides = []): array
    {
        /** @var array<string, mixed> $options */
        $options = self::mergeOptions($this->config, $overrides);

        return $options;
    }

    /**
     * Recursively merge overrides onto a base options array.
     *
     * Sequential lists (toolbar groups, sanitizer whitelists, mime lists, ...)
     * are replaced as a whole so an override fully supersedes the default
     * instead of being merged index-by-index, while string-keyed maps are
     * merged recursively.
     *
     * @param  array<array-key, mixed>  $base
     * @param  array<array-key, mixed>  $overrides
     * @return array<array-key, mixed>
     */
    public static function mergeOptions(array $base, array $overrides): array
    {
        foreach ($overrides as $key => $value) {
            $current = $base[$key] ?? null;

            if (is_array($value) && is_array($current)) {
                $base[$key] = array_is_list($value) && array_is_list($current)
                    ? $value
                    : self::mergeOptions($current, $value);
            } else {
                $base[$key] = $value;
            }
        }

        return $base;
    }

    public function version(): string
    {
        return '1.0.0';
    }
}
