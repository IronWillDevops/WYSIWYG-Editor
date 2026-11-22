import { expect, vi } from 'vitest';
import BUILTIN_LOADERS from '../src/modules/register.js';

/**
 * Waits until every built-in module registered by src/modules/register.js
 * has finished its async load into the editor. Editors start loading their
 * plugins in the constructor without exposing the promise, so tests that
 * assert on module presence (or destroy the editor) poll the public
 * module() accessor instead of triggering a second, duplicating load.
 * @param {import('../src/core/Editor.js').default} editor
 * @param {string[]} [disabled] plugin names intentionally not loaded
 */
export async function waitForBuiltinPlugins(editor, disabled = []) {
    await vi.waitFor(() => {
        Object.keys(BUILTIN_LOADERS)
            .filter((name) => !disabled.includes(name))
            .forEach((name) => {
                expect(editor.module(name), `built-in module "${name}" is missing`).toBeDefined();
            });
    });
}
