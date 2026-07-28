import { describe, it, expect } from 'vitest';
import Sanitizer from '../src/core/Sanitizer.js';

describe('Sanitizer', () => {
    const sanitizer = new Sanitizer();

    it('strips <script> tags entirely', () => {
        const result = sanitizer.sanitize('<p>hello</p><script>alert(1)</script>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('<p>hello</p>');
    });

    it('removes inline event handler attributes', () => {
        const result = sanitizer.sanitize('<img src="x.png" onerror="alert(1)">');
        expect(result).not.toContain('onerror');
    });

    it('blocks javascript: URLs in href/src', () => {
        const result = sanitizer.sanitize('<a href="javascript:alert(1)">click</a>');
        expect(result).not.toContain('javascript:');
    });

    it('keeps safe http(s) links intact', () => {
        const result = sanitizer.sanitize('<a href="https://example.com">link</a>');
        expect(result).toContain('href="https://example.com"');
    });

    it('unwraps disallowed tags while preserving their text content', () => {
        const result = sanitizer.sanitize('<marquee>hello</marquee>');
        expect(result).not.toContain('<marquee>');
        expect(result).toContain('hello');
    });

    it('strips unknown attributes but keeps whitelisted ones', () => {
        const result = sanitizer.sanitize('<p class="ok" onclick="bad()" data-x="y">text</p>');
        expect(result).toContain('class="ok"');
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('data-x');
    });

    it('removes CSS expression() from style attributes', () => {
        const result = sanitizer.sanitize('<div style="width:expression(alert(1))">x</div>');
        expect(result).not.toContain('expression');
    });
});
