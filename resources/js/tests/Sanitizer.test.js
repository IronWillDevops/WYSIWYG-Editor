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

    it('keeps CSS-based inline formatting produced by styleWithCSS execCommand output', () => {
        const result = sanitizer.sanitize('<span style="font-weight: bold;">bold text</span>');
        expect(result).toContain('font-weight');
        expect(result).toContain('bold text');
    });

    it('preserves colspan/rowspan on table cells (merged cells)', () => {
        const result = sanitizer.sanitize('<table><tr><td colspan="2" rowspan="1">x</td></tr></table>');
        expect(result).toContain('colspan="2"');
    });

    it('strips <style> tags', () => {
        const result = sanitizer.sanitize('<p>text</p><style>body{}</style>');
        expect(result).not.toContain('<style>');
    });

    it('strips <noscript> tags', () => {
        const result = sanitizer.sanitize('<noscript>fallback</noscript><p>ok</p>');
        expect(result).not.toContain('noscript');
    });

    it('allows safe mailto: and tel: URLs', () => {
        const mailto = sanitizer.sanitize('<a href="mailto:test@example.com">email</a>');
        expect(mailto).toContain('mailto:test@example.com');

        const tel = sanitizer.sanitize('<a href="tel:+12345">phone</a>');
        expect(tel).toContain('tel:+12345');
    });

    it('blocks javascript: in CSS url()', () => {
        const result = sanitizer.sanitize('<div style="background:url(javascript:alert(1))">x</div>');
        expect(result).not.toContain('javascript');
    });

    it('allows fragment-only and root-relative URLs', () => {
        const frag = sanitizer.sanitize('<a href="#section">link</a>');
        expect(frag).toContain('href="#section"');

        const rel = sanitizer.sanitize('<a href="/path">link</a>');
        expect(rel).toContain('href="/path"');
    });

    it('accepts custom allowed tags via constructor options', () => {
        const custom = new Sanitizer({ allowedTags: ['p', 'custom-tag'] });
        const result = custom.sanitize('<p>keep</p><custom-tag>custom</custom-tag><span>gone</span>');
        expect(result).toContain('<p>keep</p>');
        expect(result).toContain('<custom-tag>');
        expect(result).not.toContain('span');
    });

    it('removes disallowed URL schemes', () => {
        const result = sanitizer.sanitize('<a href="ftp://example.com">ftp</a>');
        expect(result).not.toContain('ftp:');
    });
});
