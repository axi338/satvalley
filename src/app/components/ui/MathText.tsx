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

    // Use a custom parser to avoid issues with standard Regex splits on complex LaTeX strings.
    const segments = useMemo(() => {
        if (!processedText) return [];
        const result: { type: 'text' | 'inlineMath' | 'blockMath'; content: string }[] = [];
        let i = 0;

        while (i < processedText.length) {
            // Check for block math $$...$$
            if (processedText.substr(i, 2) === '$$') {
                const nextIndex = processedText.indexOf('$$', i + 2);
                if (nextIndex !== -1) {
                    const content = processedText.substring(i + 2, nextIndex);
                    result.push({ type: 'blockMath', content });
                    i = nextIndex + 2;
                    continue;
                }
            }

            // Check for block math \[...\]
            if (processedText.substr(i, 2) === '\\[') {
                const nextIndex = processedText.indexOf('\\]', i + 2);
                if (nextIndex !== -1) {
                    const content = processedText.substring(i + 2, nextIndex);
                    result.push({ type: 'blockMath', content });
                    i = nextIndex + 2;
                    continue;
                }
            }

            // Check for inline math \(...\)
            if (processedText.substr(i, 2) === '\\(') {
                const nextIndex = processedText.indexOf('\\)', i + 2);
                if (nextIndex !== -1) {
                    const content = processedText.substring(i + 2, nextIndex);
                    result.push({ type: 'inlineMath', content });
                    i = nextIndex + 2;
                    continue;
                }
            }

            // Check for inline math $...$
            if (processedText[i] === '$') {
                const nextIndex = processedText.indexOf('$', i + 1);
                // Check it's not another $$
                if (nextIndex !== -1 && processedText[nextIndex + 1] !== '$') {
                    const content = processedText.substring(i + 1, nextIndex);
                    result.push({ type: 'inlineMath', content });
                    i = nextIndex + 1;
                    continue;
                }
            }

            // Regular character
            let textSegment = '';
            while (
                i < processedText.length &&
                processedText[i] !== '$' &&
                processedText.substr(i, 2) !== '\\[' &&
                processedText.substr(i, 2) !== '\\('
            ) {
                textSegment += processedText[i];
                i++;
            }

            if (textSegment) {
                // IMPORTANT: If this text somehow gets picked up or near Math mode, 
                // the % sign acts as a LaTeX comment and hides all subsequent text.
                // We escape it here so KaTeX treats it as a literal percent sign.
                result.push({ type: 'text', content: textSegment.replace(/%/g, '\\%') });
            }

            // If we're at a delimiter but it wasn't closed, consume it as text
            if (
                i < processedText.length &&
                (processedText[i] === '$' || processedText.substr(i, 2) === '\\[' || processedText.substr(i, 2) === '\\(')
            ) {
                let delimLength = 1;
                if (processedText.substr(i, 2) === '\\[' || processedText.substr(i, 2) === '\\(') delimLength = 2;

                let nextIdx = -1;
                if (processedText[i] === '$') nextIdx = processedText.indexOf('$', i + 1);
                else if (processedText.substr(i, 2) === '\\[') nextIdx = processedText.indexOf('\\]', i + 2);
                else if (processedText.substr(i, 2) === '\\(') nextIdx = processedText.indexOf('\\)', i + 2);

                if (nextIdx === -1) {
                    result.push({ type: 'text', content: processedText.substr(i, delimLength).replace(/%/g, '\\%') });
                    i += delimLength;
                }
            }
        }

        // Apply auto-formatting for missing LaTeX delimiters (Coordinates, Fractions, Exponents, Functions)
        const finalSegments: typeof result = [];
        const numPattern = `-?\\d+(?:\\s*/\\s*\\d+)?(?:\\.\\d+)?`;
        // regex for coordinate points (x, y), math fractions e.g. -3/2, functions like f(x), and anything with an exponent like 7x^2-rx+63
        const autoMathRegex = new RegExp(
            `(\\(\\s*${numPattern}\\s*,\\s*${numPattern}\\s*\\)|(?:\\b|-)\\d+\\s*/\\s*\\d+\\b|\\b[a-zA-Z]\\([a-zA-Z]\\)|\\S*\\^\\S*)`,
            'g'
        );
        const fracRegex = /(-?\d+)\s*\/\s*(\d+)/g;

        for (const seg of result) {
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
