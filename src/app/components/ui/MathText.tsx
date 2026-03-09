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
    const processedText = useMemo(() => {
        if (typeof text !== 'string') return '';
        return text;
    }, [text]);

    // Use a custom parser to properly handle complex LaTeX strings safely and gracefully.
    const segments = useMemo(() => {
        if (!processedText) return [];
        const segmentsArr: { type: 'text' | 'inlineMath' | 'blockMath'; content: string }[] = [];

        // This regex splits on block math ($$..$$, \[..\]) and inline math (\(..\), $..$) 
        // It uses lazy quantifiers to match the inner math without consuming trailing text.
        // Unclosed delimiters will safely fail to match, falling back to treating them as plain text.
        const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?!\$)[\s\S]*?\$)/g;

        let lastIndex = 0;
        let match;

        while ((match = regex.exec(processedText)) !== null) {
            // Push text before match
            if (match.index > lastIndex) {
                segmentsArr.push({ type: 'text', content: processedText.substring(lastIndex, match.index) });
            }

            const m = match[0];
            if (m.startsWith('$$')) {
                segmentsArr.push({ type: 'blockMath', content: m.substring(2, m.length - 2) });
            } else if (m.startsWith('\\[')) {
                segmentsArr.push({ type: 'blockMath', content: m.substring(2, m.length - 2) });
            } else if (m.startsWith('\\(')) {
                segmentsArr.push({ type: 'inlineMath', content: m.substring(2, m.length - 2) });
            } else if (m.startsWith('$')) {
                segmentsArr.push({ type: 'inlineMath', content: m.substring(1, m.length - 1) });
            }
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < processedText.length) {
            segmentsArr.push({ type: 'text', content: processedText.substring(lastIndex) });
        }

        // Apply auto-formatting for missing LaTeX delimiters (Coordinates, Fractions, Exponents, Functions)
        const finalSegments: typeof segmentsArr = [];
        const numPattern = `-?\\d+(?:\\s*/\\s*\\d+)?(?:\\.\\d+)?`;
        // regex for coordinate points (x, y), math fractions e.g. -3/2, functions like f(x), and anything with an exponent like 7x^2-rx+63
        const autoMathRegex = new RegExp(
            `(\\(\\s*${numPattern}\\s*,\\s*${numPattern}\\s*\\)|(?:\\b|-)\\d+\\s*/\\s*\\d+\\b|\\b[a-zA-Z]\\([a-zA-Z]\\)|\\S*\\^\\S*)`,
            'g'
        );
        const fracRegex = /(-?\d+)\s*\/\s*(\d+)/g;

        for (const seg of segmentsArr) {
            if (seg.type === 'text') {
                const parts = seg.content.split(autoMathRegex);
                parts.forEach((part) => {
                    if (!part) return;
                    if (part.match(autoMathRegex)) {
                        let content = part;
                        if (!content.includes('(')) {
                            content = content.replace(fracRegex, '\\frac{$1}{$2}');
                        }
                        finalSegments.push({ type: 'inlineMath', content });
                    } else {
                        finalSegments.push({ type: 'text', content: part });
                    }
                });
            } else if (seg.type === 'inlineMath' || seg.type === 'blockMath') {
                // Also fix fractions inside already wrapped math environments
                let content = seg.content;
                content = content.replace(fracRegex, '\\frac{$1}{$2}');
                finalSegments.push({ type: seg.type, content });
            } else {
                finalSegments.push(seg);
            }
        }

        return finalSegments;
    }, [processedText]);

    if (!text || typeof text !== 'string') return null;

    return (
        <span className={`math-wrapper whitespace-pre-wrap ${className}`}>
            {segments.map((segment, idx) => {
                if (segment.type === 'blockMath') {
                    return <BlockMath key={idx} math={segment.content} renderError={(err) => <span className="text-red-500 font-mono text-xs max-w-full overflow-hidden inline-block align-bottom" title={err.message}>{err.message}</span>} />;
                } else if (segment.type === 'inlineMath') {
                    return <InlineMath key={idx} math={segment.content} renderError={(err) => <span className="text-red-500 font-mono text-xs max-w-full overflow-hidden inline-block align-bottom" title={err.message}>{err.message}</span>} />;
                }
                // Regular Text
                return <React.Fragment key={idx}>{segment.content}</React.Fragment>;
            })}
        </span>
    );
};
