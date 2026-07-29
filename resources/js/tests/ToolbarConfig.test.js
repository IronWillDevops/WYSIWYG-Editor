import { describe, it, expect } from 'vitest';
import ToolbarConfig from '../src/toolbar/ToolbarConfig.js';
import Icons from '../src/icons/Icons.js';

describe('ToolbarConfig', () => {
    it('defines all expected button IDs', () => {
        const ids = Object.keys(ToolbarConfig);
        expect(ids).toContain('undo');
        expect(ids).toContain('redo');
        expect(ids).toContain('bold');
        expect(ids).toContain('italic');
        expect(ids).toContain('underline');
        expect(ids).toContain('strike');
        expect(ids).toContain('alignLeft');
        expect(ids).toContain('alignCenter');
        expect(ids).toContain('alignRight');
        expect(ids).toContain('alignJustify');
        expect(ids).toContain('link');
        expect(ids).toContain('find');
        expect(ids).toContain('sourceCode');
        expect(ids).toContain('fullscreen');
    });

    it('every button has a non-empty label', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            expect(def.label, `Button "${id}" missing label`).toBeTruthy();
        });
    });

    it('every button has a valid type', () => {
        const validTypes = ['command', 'action', 'select', 'color'];
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            expect(validTypes, `Button "${id}" has invalid type "${def.type}"`).toContain(def.type);
        });
    });

    it('command buttons have a command property', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'command') {
                expect(def.command, `Command button "${id}" missing command`).toBeTruthy();
            }
        });
    });

    it('action buttons have an action function', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'action') {
                expect(typeof def.action, `Action button "${id}" missing action`).toBe('function');
            }
        });
    });

    it('select buttons have options and onChange', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'select') {
                expect(Array.isArray(def.options), `Select "${id}" missing options`).toBe(true);
                expect(typeof def.onChange, `Select "${id}" missing onChange`).toBe('function');
            }
        });
    });

    it('color buttons have a command', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.type === 'color') {
                expect(def.command, `Color button "${id}" missing command`).toBeTruthy();
            }
        });
    });

    it('buttons with shortcut have it defined as string', () => {
        Object.entries(ToolbarConfig).forEach(([id, def]) => {
            if (def.shortcut) {
                expect(typeof def.shortcut).toBe('string');
                expect(def.shortcut.length).toBeGreaterThan(0);
            }
        });
    });

    it('bold button has Ctrl+B shortcut', () => {
        expect(ToolbarConfig.bold.shortcut).toBe('Ctrl+B');
    });

    it('undo button has Ctrl+Z shortcut', () => {
        expect(ToolbarConfig.undo.shortcut).toBe('Ctrl+Z');
    });

    it('link button has Ctrl+K shortcut', () => {
        expect(ToolbarConfig.link.shortcut).toBe('Ctrl+K');
    });

    it('find button has Ctrl+F shortcut', () => {
        expect(ToolbarConfig.find.shortcut).toBe('Ctrl+F');
    });

    it('alignment buttons do not have shortcut', () => {
        expect(ToolbarConfig.alignLeft.shortcut).toBeUndefined();
        expect(ToolbarConfig.alignCenter.shortcut).toBeUndefined();
        expect(ToolbarConfig.alignRight.shortcut).toBeUndefined();
        expect(ToolbarConfig.alignJustify.shortcut).toBeUndefined();
    });
});

describe('Icons', () => {
    it('exports icon SVGs for all toolbar buttons', () => {
        expect(Icons.bold).toContain('<svg');
        expect(Icons.italic).toContain('<svg');
        expect(Icons.underline).toContain('<svg');
        expect(Icons.alignLeft).toContain('<svg');
        expect(Icons.alignCenter).toContain('<svg');
        expect(Icons.alignRight).toContain('<svg');
        expect(Icons.alignJustify).toContain('<svg');
        expect(Icons.undo).toContain('<svg');
        expect(Icons.redo).toContain('<svg');
        expect(Icons.link).toContain('<svg');
        expect(Icons.find).toContain('<svg');
    });

    it('all icons are strings containing svg', () => {
        Object.values(Icons).forEach((icon, index) => {
            const keys = Object.keys(Icons);
            expect(typeof icon, `Icon "${keys[index]}" is not a string`).toBe('string');
            expect(icon, `Icon "${keys[index]}" does not contain <svg`).toContain('<svg');
        });
    });
});
