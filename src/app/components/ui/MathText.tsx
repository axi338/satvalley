import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
    text?: string;
    className?: string;
    colorMode?: 'light' | 'dark' | 'inherit'; // 'light' for dark bgs (white text), 'dark' for light bgs (black text)
}

/**
 * A utility component that safely parses a raw string and converts 
 * any inline $...$ or block $$...$$ LaTeX definitions into beautifully rendered KaTeX equations.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '', colorMode = 'inherit' }) => {
    const segments = useMemo(() => {
        if (!text || typeof text !== 'string') return [];

        const result: Array<{ type: string, content: string }> = [];
        let currentIndex = 0;

        // Match $$...$$, $...$, \[...\], \(...\)
        const mathPattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;

        let match;
        while ((match = mathPattern.exec(text)) !== null) {
            // Push preceding text (apply fraction auto-replace here to avoid breaking actual LaTeX)
            if (match.index > currentIndex) {
                let plainText = text.slice(currentIndex, match.index);
                // Convert simple standalone fractions like 1/2 -> \frac{1}{2} and wrap in $...$
                plainText = plainText.replace(/(^|[^$\\])\b(\d+)\/(\d+)\b(?=[^$]|$)/g, '$1$\\frac{$2}{$3}$');

                // If the plainText itself now contains $...$, we need to split it again.
                // Simple workaround: just parse the plainText recursively, or since it's just fractions, we can split by $ again.
                const subParts = plainText.split(/(\$[\s\S]*?\$)/g);
                for (const subPart of subParts) {
                    if (subPart.startsWith('$') && subPart.endsWith('$')) {
                        result.push({ type: 'inlineMath', content: subPart.slice(1, -1) });
                    } else if (subPart) {
                        result.push({ type: 'text', content: subPart });
                    }
                }
            }

            const fullMatch = match[0];
            if (fullMatch.startsWith('$$') && fullMatch.endsWith('$$')) {
                result.push({ type: 'blockMath', content: fullMatch.slice(2, -2) });
            } else if (fullMatch.startsWith('\\[') && fullMatch.endsWith('\\]')) {
                result.push({ type: 'blockMath', content: fullMatch.slice(2, -2) });
            } else if (fullMatch.startsWith('$') && fullMatch.endsWith('$')) {
                result.push({ type: 'inlineMath', content: fullMatch.slice(1, -1) });
            } else if (fullMatch.startsWith('\\(') && fullMatch.endsWith('\\)')) {
                result.push({ type: 'inlineMath', content: fullMatch.slice(2, -2) });
            }

            currentIndex = mathPattern.lastIndex;
        }

        // Push remaining text
        if (currentIndex < text.length) {
            let remainingText = text.slice(currentIndex);
            remainingText = remainingText.replace(/(^|[^$\\])\b(\d+)\/(\d+)\b(?=[^$]|$)/g, '$1$\\frac{$2}{$3}$');

            const subParts = remainingText.split(/(\$[\s\S]*?\$)/g);
            for (const subPart of subParts) {
                if (subPart.startsWith('$') && subPart.endsWith('$')) {
                    result.push({ type: 'inlineMath', content: subPart.slice(1, -1) });
                } else if (subPart) {
                    result.push({ type: 'text', content: subPart });
                }
            }
        }

        return result;
    }, [text]);

    if (!text || typeof text !== 'string') return null;

    const renderRichText = (content: string) => {
        // This is a simplified multi-pass parser for bold, italic, and underline.
        // It handles bold (\textbf{}, <b>, **), italic (\textit{}, <i>, *), and underline (\underline{}, <u>).

        // Match all supported tags in one regex
        const pattern = /(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*|<strong[^>]*>[\s\S]*?<\/strong>|<b[^>]*>[\s\S]*?<\/b>|<i[^>]*>[\s\S]*?<\/i>|<u[^>]*>[\s\S]*?<\/u>|&lt;strong[^&]*&gt;[\s\S]*?&lt;\/strong&gt;|&lt;b[^&]*&gt;[\s\S]*?&lt;\/b&gt;|&lt;i[^&]*&gt;[\s\S]*?&lt;\/i&gt;|&lt;u[^&]*&gt;[\s\S]*?&lt;\/u&gt;|\\textbf\{[\s\S]*?\}|\\textit\{[\s\S]*?\}|\\underline\{[\s\S]*?\})/gi;

        const parts = content.split(pattern);

        const boldClass = colorMode === 'dark' ? 'text-slate-950 font-bold' : colorMode === 'light' ? 'text-white font-bold' : 'font-bold';
        const italicClass = colorMode === 'dark' ? 'text-slate-800 italic' : colorMode === 'light' ? 'text-slate-100 italic' : 'italic';
        const plainClass = colorMode === 'dark' ? 'text-slate-900' : colorMode === 'light' ? 'text-white' : '';

        return parts.map((part, idx) => {
            if (!part) return null;

            // BOLD
            if ((part.startsWith('**') && part.endsWith('**')) ||
                (/^<(b|strong)[^>]*>/i.test(part) && /<\/(b|strong)>$/i.test(part)) ||
                (/^&lt;(b|strong)[^&]*&gt;/i.test(part) && /&lt;\/(b|strong)&gt;$/i.test(part)) ||
                (part.toLowerCase().startsWith('\\textbf{') && part.endsWith('}'))) {
                const inner = part.startsWith('**') ? part.slice(2, -2) :
                    part.startsWith('\\') ? part.slice(8, -1) :
                        part.startsWith('&') ? part.replace(/^&lt;(b|strong)[^&]*&gt;/i, '').replace(/&lt;\/(b|strong)&gt;$/i, '') :
                            part.replace(/^<(b|strong)[^>]*>/i, '').replace(/<\/(b|strong)>$/i, '');
                return <strong key={idx} className={boldClass}>{inner}</strong>;
            }

            // ITALIC
            if ((part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) ||
                (/^<i[^>]*>/i.test(part) && /<\/i>$/i.test(part)) ||
                (/^&lt;i[^&]*&gt;/i.test(part) && /&lt;\/i&gt;$/i.test(part)) ||
                (part.toLowerCase().startsWith('\\textit{') && part.endsWith('}'))) {
                const inner = part.startsWith('*') ? part.slice(1, -1) :
                    part.startsWith('\\') ? part.slice(8, -1) :
                        part.startsWith('&') ? part.replace(/^&lt;i[^&]*&gt;/i, '').replace(/&lt;\/i&gt;$/i, '') :
                            part.replace(/^<i[^>]*>/i, '').replace(/<\/i>$/i, '');
                return <em key={idx} className={italicClass}>{inner}</em>;
            }

            // UNDERLINE
            if ((/^<u[^>]*>/i.test(part) && /<\/u>$/i.test(part)) ||
                (/^&lt;u[^&]*&gt;/i.test(part) && /&lt;\/u&gt;$/i.test(part)) ||
                (part.toLowerCase().startsWith('\\underline{') && part.endsWith('}'))) {
                const inner = part.startsWith('\\') ? part.slice(11, -1) :
                    part.startsWith('&') ? part.replace(/^&lt;u[^&]*&gt;/i, '').replace(/&lt;\/u&gt;$/i, '') :
                        part.replace(/^<u[^>]*>/i, '').replace(/<\/u>$/i, '');
                const underlineStyle = colorMode === 'dark' ? 'decoration-slate-400' : 'decoration-slate-500';
                return <u key={idx} className={`underline ${underlineStyle} decoration-1 underline-offset-2`}>{inner}</u>;
            }

            return <span key={idx} className={plainClass}>{part}</span>;
        });
    };

    return (
        <span className={`math-wrapper whitespace-pre-wrap ${className}`}>
            {segments.map((segment, idx) => {
                if (segment.type === 'blockMath') {
                    return <BlockMath key={idx} math={segment.content} />;
                } else if (segment.type === 'inlineMath') {
                    return <InlineMath key={idx} math={segment.content} />;
                }
                // Regular Text with formatting support
                return <React.Fragment key={idx}>{renderRichText(segment.content)}</React.Fragment>;
            })}
        </span>
    );
};
