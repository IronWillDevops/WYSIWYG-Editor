import { describe, it, expect } from 'vitest';
import MarkdownModule from '../src/modules/MarkdownModule.js';

describe('MarkdownModule', () => {
    const module = new MarkdownModule({ getHTML: () => '', setHTML: () => {} });

    it('converts headings to markdown', () => {
        expect(module.htmlToMarkdown('<h1>Title</h1>').trim()).toBe('# Title');
    });

    it('converts bold/italic/strike inline formatting', () => {
        const html = '<p><strong>bold</strong> <em>italic</em> <s>gone</s></p>';
        expect(module.htmlToMarkdown(html).trim()).toBe('**bold** *italic* ~~gone~~');
    });

    it('converts links and images', () => {
        expect(module.htmlToMarkdown('<a href="https://x.com">x</a>').trim()).toBe('[x](https://x.com)');
        expect(module.htmlToMarkdown('<img src="a.png" alt="alt">').trim()).toBe('![alt](a.png)');
    });

    it('converts unordered and ordered lists', () => {
        const ul = module.htmlToMarkdown('<ul><li>one</li><li>two</li></ul>').trim();
        expect(ul).toBe('- one\n- two');

        const ol = module.htmlToMarkdown('<ol><li>one</li><li>two</li></ol>').trim();
        expect(ol).toBe('1. one\n2. two');
    });

    it('parses markdown headings back into HTML', () => {
        expect(module.markdownToHtml('# Hello')).toBe('<h1>Hello</h1>');
    });

    it('parses markdown lists back into HTML', () => {
        expect(module.markdownToHtml('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
    });

    it('round-trips bold/italic inline syntax', () => {
        expect(module.markdownToHtml('**bold** and *italic*')).toBe('<p><strong>bold</strong> and <em>italic</em></p>');
    });
});
