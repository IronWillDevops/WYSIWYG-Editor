import { describe, it, expect } from 'vitest';
import MarkdownModule from '../src/modules/MarkdownModule.js';

describe('MarkdownModule', () => {
    let content = '';
    const module = new MarkdownModule({
        getHTML: () => content,
        setHTML: (html) => { content = html; },
    });

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

    it('converts blockquote to markdown', () => {
        const result = module.htmlToMarkdown('<blockquote>quote text</blockquote>').trim();
        expect(result).toBe('> quote text');
    });

    it('converts markdown blockquote to HTML', () => {
        expect(module.markdownToHtml('> quote text')).toBe('<blockquote>quote text</blockquote>');
    });

    it('converts code blocks to markdown', () => {
        const result = module.htmlToMarkdown('<pre><code>code block</code></pre>').trim();
        expect(result).toBe('```\ncode block\n```');
    });

    it('converts inline code to markdown', () => {
        const result = module.htmlToMarkdown('<p>use <code>var</code></p>').trim();
        expect(result).toBe('use `var`');
    });

    it('converts horizontal rule to markdown', () => {
        expect(module.htmlToMarkdown('<hr>').trim()).toBe('---');
    });

    it('converts markdown horizontal rule to HTML', () => {
        expect(module.markdownToHtml('---')).toBe('<hr>');
    });

    it('import() sets editor content via setHTML', () => {
        content = '';
        module.import('# Hello');
        expect(content).toBe('<h1>Hello</h1>');
    });

    it('export() returns trimmed markdown from editor content', () => {
        content = '<h1>Title</h1>';
        const md = module.export();
        expect(md).toBe('# Title');
    });

    it('converts nested inline formatting inside paragraphs', () => {
        const html = '<p><strong>bold</strong> and <em>italic</em></p>';
        expect(module.htmlToMarkdown(html).trim()).toBe('**bold** and *italic*');
    });

    it('converts headings of all levels', () => {
        expect(module.htmlToMarkdown('<h2>H2</h2>').trim()).toBe('## H2');
        expect(module.htmlToMarkdown('<h3>H3</h3>').trim()).toBe('### H3');
        expect(module.htmlToMarkdown('<h6>H6</h6>').trim()).toBe('###### H6');
    });
});
