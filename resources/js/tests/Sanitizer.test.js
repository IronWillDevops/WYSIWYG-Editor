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

    describe('legacy formatting tags preserved', () => {
        it('preserves <b> tags from execCommand fallback', () => {
            const result = sanitizer.sanitize('<p><b>bold</b></p>');
            expect(result).toContain('<b>');
            expect(result).toContain('bold');
        });

        it('preserves <i> tags from execCommand fallback', () => {
            const result = sanitizer.sanitize('<p><i>italic</i></p>');
            expect(result).toContain('<i>');
            expect(result).toContain('italic');
        });

        it('preserves <strike> tags from execCommand fallback', () => {
            const result = sanitizer.sanitize('<p><strike>strikethrough</strike></p>');
            expect(result).toContain('<strike>');
            expect(result).toContain('strikethrough');
        });

        it('preserves <font> tags with color attribute', () => {
            const result = sanitizer.sanitize('<p><font color="red">colored</font></p>');
            expect(result).toContain('<font');
            expect(result).toContain('color="red"');
            expect(result).toContain('colored');
        });

        it('preserves <font> tags with size attribute', () => {
            const result = sanitizer.sanitize('<p><font size="5">sized</font></p>');
            expect(result).toContain('<font');
            expect(result).toContain('size="5"');
        });

        it('preserves <font> tags with face attribute', () => {
            const result = sanitizer.sanitize('<p><font face="Arial">styled</font></p>');
            expect(result).toContain('<font');
            expect(result).toContain('face="Arial"');
        });
    });

    describe('round-trip idempotency', () => {
        it('produces same output on second sanitize pass', () => {
            const html = '<p>hello <span style="font-weight: bold;">world</span></p>';
            const first = sanitizer.sanitize(html);
            const second = sanitizer.sanitize(first);
            expect(second).toBe(first);
        });

        it('preserves formatting through double sanitize', () => {
            const html = '<p><strong>bold</strong> <em>italic</em> <u>underline</u></p>';
            const result = sanitizer.sanitize(sanitizer.sanitize(html));
            expect(result).toContain('<strong>');
            expect(result).toContain('<em>');
            expect(result).toContain('<u>');
        });

        it('preserves legacy tags through double sanitize', () => {
            const html = '<p><b>bold</b> <i>italic</i></p>';
            const result = sanitizer.sanitize(sanitizer.sanitize(html));
            expect(result).toContain('<b>');
            expect(result).toContain('<i>');
        });
    });

    describe('double-escaped entity decoding', () => {
        it('decodes entity-encoded span tags into rendered HTML', () => {
            const result = sanitizer.sanitize('&lt;span style="font-weight: bold;"&gt;Welcome&lt;/span&gt;');
            expect(result).toContain('<span');
            expect(result).toContain('Welcome');
            expect(result).not.toContain('&lt;span');
        });

        it('decodes entity-encoded paragraph tags', () => {
            const result = sanitizer.sanitize('&lt;p&gt;Hello&lt;/p&gt;');
            expect(result).toContain('<p>');
            expect(result).toContain('Hello');
            expect(result).not.toContain('&lt;p&gt;');
        });

        it('decodes entity-encoded tags even when raw HTML tags are present', () => {
            const input = '<p>text &lt;strong&gt;bold&lt;/strong&gt; more</p>';
            const result = sanitizer.sanitize(input);
            expect(result).toContain('<strong>');
            expect(result).toContain('bold');
            expect(result).not.toContain('&lt;strong');
        });

        it('decodes mixed raw and entity-encoded tags from DB', () => {
            const input = 'Hello &lt;p&gt;&lt;strong&gt;World&lt;/strong&gt;&lt;/p&gt;';
            const result = sanitizer.sanitize(input);
            expect(result).toContain('<strong>');
            expect(result).toContain('World');
            expect(result).not.toContain('&lt;p');
        });

        it('does not decode when content has no entities', () => {
            const input = '<p>plain text</p>';
            const result = sanitizer.sanitize(input);
            expect(result).toContain('<p>');
            expect(result).toContain('plain text');
        });

        it('decodes full document of entity-encoded HTML', () => {
            const encoded = '&lt;h1&gt;Title&lt;/h1&gt;&lt;p&gt;&lt;span style="font-weight: bold;"&gt;Bold text&lt;/span&gt;&lt;/p&gt;';
            const result = sanitizer.sanitize(encoded);
            expect(result).toContain('<h1>');
            expect(result).toContain('<span');
            expect(result).toContain('Bold text');
            expect(result).not.toContain('&lt;h1');
        });
    });

    describe('security', () => {
        it('blocks data: URLs in href', () => {
            const result = sanitizer.sanitize('<a href="data:text/html,<script>alert(1)</script>">click</a>');
            expect(result).not.toContain('data:');
        });

        it('blocks data: URLs in img src', () => {
            const result = sanitizer.sanitize('<img src="data:image/svg+xml,<script>alert(1)</script>">');
            expect(result).not.toContain('data:');
        });

        it('blocks vbscript: URLs', () => {
            const result = sanitizer.sanitize('<a href="vbscript:msgbox(1)">click</a>');
            expect(result).not.toContain('vbscript:');
        });

        it('blocks javascript: in CSS url() via style attribute', () => {
            const result = sanitizer.sanitize('<div style="background-image: url(javascript:alert(1))">text</div>');
            expect(result).not.toContain('javascript:');
        });

        it('removes <meta> tags to prevent meta refresh', () => {
            const result = sanitizer.sanitize('<meta http-equiv="refresh" content="0;url=http://evil.com">');
            expect(result).not.toContain('<meta');
        });

        it('unwraps <foreignObject> inside SVG', () => {
            const result = sanitizer.sanitize('<svg><foreignObject><div>text</div></foreignObject></svg>');
            expect(result).not.toContain('foreignObject');
            expect(result).toContain('<div>text</div>');
        });

        it('removes <base> tag to prevent base hijack', () => {
            const result = sanitizer.sanitize('<base href="http://evil.com">');
            expect(result).not.toContain('<base');
        });

        it('blocks javascript: in CSS expression() via style attribute', () => {
            const result = sanitizer.sanitize('<div style="color: expression(alert(1))">x</div>');
            expect(result).not.toContain('expression');
        });
    });

    describe('theme-neutral color normalization', () => {
        // The editor must not persist default/neutral colors (black text, white
        // background) into article HTML, because a site's dark theme cannot
        // override inline styles. Genuinely non-default colors the author chose
        // (red, yellow, green, ...) must be preserved.

        it('removes the default black text color written by a default foreColor selection', () => {
            const result = sanitizer.sanitize('<p><span style="color: rgb(0, 0, 0)">Text</span></p>');
            expect(result).not.toContain('color');
        });

        it('removes #000000 and #000 text color', () => {
            expect(sanitizer.sanitize('<p style="color: #000000;">Text</p>')).toBe('<p>Text</p>');
            expect(sanitizer.sanitize('<span style="color: #000;">Text</span>')).toBe('<span>Text</span>');
        });

        it('removes plain `black` text color', () => {
            expect(sanitizer.sanitize('<p style="color: black;">Text</p>')).toBe('<p>Text</p>');
        });

        it('removes the default white background-color written by a default backColor selection', () => {
            const result = sanitizer.sanitize('<p style="background-color: #ffffff;">Text</p>');
            expect(result).toBe('<p>Text</p>');
        });

        it('removes a white background shorthand when it is a solid color', () => {
            expect(sanitizer.sanitize('<span style="background: #ffffff;">Text</span>')).toBe('<span>Text</span>');
            expect(sanitizer.sanitize('<span style="background: rgb(255, 255, 255);">Text</span>')).toBe('<span>Text</span>');
        });

        it('preserves a genuinely user-chosen non-default text color', () => {
            const result = sanitizer.sanitize('<p><span style="color: #ff0000;">Red text</span></p>');
            expect(result).toContain('color: #ff0000');
        });

        it('preserves a genuinely user-chosen non-default background color', () => {
            const result = sanitizer.sanitize('<p><span style="background-color: #ffff00;">Highlight</span></p>');
            expect(result).toContain('background-color');
        });

        it('preserves non-default colors when mixed with a default one', () => {
            const result = sanitizer.sanitize('<span style="color: #ff0000; background-color: #ffffff;">Text</span>');
            expect(result).not.toContain('background-color');
            expect(result).toContain('color');
            expect(result).toContain('#ff0000');
        });

        it('removes only the empty style attribute when all declarations are stripped', () => {
            expect(sanitizer.sanitize('<span style="color: black; background-color: white;">Text</span>')).toBe('<span>Text</span>');
        });

        it('does not strip a background shorthand that contains an image or gradient', () => {
            const result = sanitizer.sanitize('<span style="background: url(image.png) no-repeat;">Text</span>');
            expect(result).toContain('background');
        });

        it('preserves other inline styling (bold) while stripping default color', () => {
            const result = sanitizer.sanitize('<p style="color: black;"><strong>Bold</strong></p>');
            expect(result).not.toContain('color: black');
            expect(result).toContain('<strong>Bold</strong>');
        });

        it('cleans old articles with hardcoded default colors on load/resave', () => {
            const oldHtml = '<h2 style="color: #000000;">Title</h2><p style="background-color: white;">Body</p>';
            const result = sanitizer.sanitize(oldHtml);
            expect(result).not.toContain('#000000');
            expect(result).not.toContain('background-color');
            expect(result).toContain('<h2>Title</h2>');
            expect(result).toContain('<p>Body</p>');
        });
    });
});
