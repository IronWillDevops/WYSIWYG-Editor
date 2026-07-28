/**
 * Lightweight, dependency-free Markdown <-> HTML conversion covering the
 * common subset: headings, bold/italic/strike, links, images, lists,
 * blockquotes, code (inline/block), and horizontal rules.
 */
export default class MarkdownModule {
    constructor(editor) {
        this.editor = editor;
    }

    /** @returns {string} */
    export() {
        return this.htmlToMarkdown(this.editor.getHTML()).trim();
    }

    /** @param {string} markdown */
    import(markdown) {
        const html = this.markdownToHtml(markdown);
        this.editor.setHTML(html);
    }

    /** @param {string} html */
    htmlToMarkdown(html) {
        const container = document.createElement('div');
        container.innerHTML = html;
        return this.nodeToMarkdown(container).replace(/\n{3,}/g, '\n\n');
    }

    /** @param {Node} node */
    nodeToMarkdown(node) {
        let output = '';
        node.childNodes.forEach((child) => {
            output += this.convertNode(child);
        });
        return output;
    }

    /** @param {Node} node */
    convertNode(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
        if (!(node instanceof HTMLElement)) return '';

        const inner = () => this.nodeToMarkdown(node);

        switch (node.tagName) {
            case 'H1': return `# ${inner()}\n\n`;
            case 'H2': return `## ${inner()}\n\n`;
            case 'H3': return `### ${inner()}\n\n`;
            case 'H4': return `#### ${inner()}\n\n`;
            case 'H5': return `##### ${inner()}\n\n`;
            case 'H6': return `###### ${inner()}\n\n`;
            case 'P': return `${inner()}\n\n`;
            case 'STRONG': case 'B': return `**${inner()}**`;
            case 'EM': case 'I': return `*${inner()}*`;
            case 'S': case 'STRIKE': return `~~${inner()}~~`;
            case 'A': return `[${inner()}](${node.getAttribute('href') ?? ''})`;
            case 'IMG': return `![${node.getAttribute('alt') ?? ''}](${node.getAttribute('src') ?? ''})`;
            case 'BLOCKQUOTE': return `> ${inner().trim().replace(/\n/g, '\n> ')}\n\n`;
            case 'CODE': return node.parentElement?.tagName === 'PRE' ? inner() : `\`${inner()}\``;
            case 'PRE': return `\`\`\`\n${inner()}\n\`\`\`\n\n`;
            case 'HR': return `---\n\n`;
            case 'BR': return '\n';
            case 'UL': return `${[...node.children].map((li) => `- ${this.nodeToMarkdown(li).trim()}`).join('\n')}\n\n`;
            case 'OL': return `${[...node.children].map((li, i) => `${i + 1}. ${this.nodeToMarkdown(li).trim()}`).join('\n')}\n\n`;
            default: return inner();
        }
    }

    /** @param {string} markdown */
    markdownToHtml(markdown) {
        const lines = markdown.split('\n');
        const htmlLines = [];
        let inList = null;

        lines.forEach((rawLine) => {
            const line = rawLine;

            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            const unordered = line.match(/^[-*]\s+(.*)$/);
            const ordered = line.match(/^\d+\.\s+(.*)$/);
            const quote = line.match(/^>\s?(.*)$/);

            if (heading) {
                this.closeList(htmlLines, inList);
                inList = null;
                const level = heading[1].length;
                htmlLines.push(`<h${level}>${this.inlineMarkdown(heading[2])}</h${level}>`);
                return;
            }

            if (unordered) {
                if (inList !== 'ul') {
                    this.closeList(htmlLines, inList);
                    htmlLines.push('<ul>');
                    inList = 'ul';
                }
                htmlLines.push(`<li>${this.inlineMarkdown(unordered[1])}</li>`);
                return;
            }

            if (ordered) {
                if (inList !== 'ol') {
                    this.closeList(htmlLines, inList);
                    htmlLines.push('<ol>');
                    inList = 'ol';
                }
                htmlLines.push(`<li>${this.inlineMarkdown(ordered[1])}</li>`);
                return;
            }

            if (quote) {
                this.closeList(htmlLines, inList);
                inList = null;
                htmlLines.push(`<blockquote>${this.inlineMarkdown(quote[1])}</blockquote>`);
                return;
            }

            if (line.trim() === '---') {
                this.closeList(htmlLines, inList);
                inList = null;
                htmlLines.push('<hr>');
                return;
            }

            this.closeList(htmlLines, inList);
            inList = null;
            if (line.trim() !== '') {
                htmlLines.push(`<p>${this.inlineMarkdown(line)}</p>`);
            }
        });

        this.closeList(htmlLines, inList);
        return htmlLines.join('\n');
    }

    closeList(htmlLines, inList) {
        if (inList) htmlLines.push(`</${inList}>`);
    }

    /** @param {string} text */
    inlineMarkdown(text) {
        return text
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/~~(.+?)~~/g, '<s>$1</s>')
            .replace(/`(.+?)`/g, '<code>$1</code>');
    }

    destroy() {}
}
