<?php

declare(strict_types=1);

namespace InkForge\Editor;

final class InkForgeEditor
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
     * Build a JSON-safe options array for the given toolbar preset,
     * merging package defaults with per-instance overrides.
     *
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    public function buildOptions(array $overrides = []): array
    {
        return array_replace_recursive($this->config, $overrides);
    }

    public function version(): string
    {
        return '1.0.0';
    }
}
