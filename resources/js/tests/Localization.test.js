import { describe, it, expect, beforeEach } from 'vitest';
import Localization from '../src/i18n/Localization.js';

describe('Localization', () => {
    it('returns english translation for known keys', () => {
        expect(Localization.t('en', 'bold')).toBe('Bold');
    });

    it('falls back to english when locale is missing', () => {
        expect(Localization.t('de', 'bold')).toBe('Bold');
    });

    it('returns the key itself when no translation exists', () => {
        expect(Localization.t('en', 'nonexistent_key')).toBe('nonexistent_key');
    });

    it('registers a new locale and uses its translations', () => {
        Localization.register('fr', { bold: 'Gras' });
        expect(Localization.t('fr', 'bold')).toBe('Gras');
    });

    it('available() returns all registered locales', () => {
        const locales = Localization.available();
        expect(locales).toContain('en');
        expect(locales).toContain('uk');
        expect(locales).toContain('ru');
    });

    it('returns fallback chain: locale -> en -> key', () => {
        expect(Localization.t('fr', 'undo')).toBe('Undo');
    });
});
