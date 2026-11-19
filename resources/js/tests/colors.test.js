import { describe, it, expect } from 'vitest';
import {
    DEFAULT_TEXT_COLORS,
    DEFAULT_BG_COLORS,
    normalizeColor,
    isDefaultTextColor,
    isDefaultBgColor,
} from '../src/utils/colors.js';

describe('colors utility', () => {
    it('normalizeColor expands 3-digit hex shorthand', () => {
        expect(normalizeColor('#000')).toBe('#000000');
        expect(normalizeColor('#FFF')).toBe('#ffffff');
        expect(normalizeColor('#abc')).toBe('#aabbcc');
    });

    it('normalizeColor lowercases and trims values', () => {
        expect(normalizeColor('  BLACK ')).toBe('black');
        expect(normalizeColor('#FF0000')).toBe('#ff0000');
    });

    it('isDefaultTextColor recognizes black variants', () => {
        expect(isDefaultTextColor('black')).toBe(true);
        expect(isDefaultTextColor('#000')).toBe(true);
        expect(isDefaultTextColor('#000000')).toBe(true);
        expect(isDefaultTextColor('rgb(0,0,0)')).toBe(true);
        expect(isDefaultTextColor('rgb(0, 0, 0)')).toBe(true);
    });

    it('isDefaultTextColor rejects non-default colors', () => {
        expect(isDefaultTextColor('#ff0000')).toBe(false);
        expect(isDefaultTextColor('red')).toBe(false);
        expect(isDefaultTextColor('#1f2328')).toBe(false);
    });

    it('isDefaultBgColor recognizes white variants', () => {
        expect(isDefaultBgColor('white')).toBe(true);
        expect(isDefaultBgColor('#fff')).toBe(true);
        expect(isDefaultBgColor('#ffffff')).toBe(true);
        expect(isDefaultBgColor('rgb(255, 255, 255)')).toBe(true);
    });

    it('isDefaultBgColor rejects non-default backgrounds', () => {
        expect(isDefaultBgColor('#ffff00')).toBe(false);
        expect(isDefaultBgColor('yellow')).toBe(false);
    });

    it('exposes the expected constant sets', () => {
        expect(DEFAULT_TEXT_COLORS.has('black')).toBe(true);
        expect(DEFAULT_TEXT_COLORS.has('#000000')).toBe(true);
        expect(DEFAULT_BG_COLORS.has('white')).toBe(true);
        expect(DEFAULT_BG_COLORS.has('#ffffff')).toBe(true);
    });
});
