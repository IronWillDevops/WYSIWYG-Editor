import en from './en.js';
import uk from './uk.js';
import ru from './ru.js';

/** @type {Map<string, Record<string, string>>} */
const locales = new Map([
    ['en', en],
    ['uk', uk],
    ['ru', ru],
]);

/**
 * Simple i18n registry. New languages can be added at runtime via
 * Localization.register('de', { bold: 'Fett', ... }).
 */
const Localization = {
    /**
     * @param {string} code
     * @param {Record<string, string>} strings
     */
    register(code, strings) {
        locales.set(code, strings);
    },

    /**
     * @param {string} locale
     * @param {string} key
     * @returns {string}
     */
    t(locale, key) {
        const dictionary = locales.get(locale) ?? locales.get('en');
        return dictionary[key] ?? locales.get('en')[key] ?? key;
    },

    available() {
        return [...locales.keys()];
    },
};

export default Localization;
