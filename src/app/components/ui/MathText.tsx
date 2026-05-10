import React, { useMemo } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
    text?: string;
    className?: string;
}

/**
 * A utility component that safely parses a raw string and converts 
 * any inline $...$ or block $$...$$ LaTeX definitions into beautifully rendered KaTeX equations.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
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

    return (
        <span className={`math-wrapper whitespace-pre-wrap ${className}`}>
            {segments.map((segment, idx) => {
                if (segment.type === 'blockMath') {
                    return <BlockMath key={idx} math={segment.content} />;
                } else if (segment.type === 'inlineMath') {
                    return <InlineMath key={idx} math={segment.content} />;
                }
                // Regular Text
                return <React.Fragment key={idx}>{segment.content}</React.Fragment>;
            })}
        </span>
    );
};
