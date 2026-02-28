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
        // Automatically wrap standalone fractions (e.g. 1/2) in LaTeX inline math 
        // if they aren't already preceded by a backslash or dollar sign.
        return text.replace(/(^|[^$\\])\b(\d+)\/(\d+)\b(?=[^$]|$)/g, '$1$\\frac{$2}{$3}$');
    }, [text]);

    // Use a custom parser to avoid issues with standard Regex splits on complex LaTeX strings.
    const segments = useMemo(() => {
        if (!processedText) return [];
        const result = [];
        let i = 0;
        let isMath = false;
        let isBlock = false;
        let currentText = '';

        while (i < processedText.length) {
            // Check for block math $$...$$
            if (processedText.substr(i, 2) === '$$' && !isMath) {
                if (currentText) result.push({ type: 'text', content: currentText });
                currentText = '';
                isMath = true;
                isBlock = true;
                i += 2;
                continue;
            } else if (processedText.substr(i, 2) === '$$' && isMath && isBlock) {
                if (currentText) result.push({ type: 'blockMath', content: currentText });
                currentText = '';
                isMath = false;
                isBlock = false;
                i += 2;
                continue;
            }

            // Check for inline math $...$
            if (processedText[i] === '$' && !isMath) {
                if (currentText) result.push({ type: 'text', content: currentText });
                currentText = '';
                isMath = true;
                isBlock = false;
                i += 1;
                continue;
            } else if (processedText[i] === '$' && isMath && !isBlock) {
                if (currentText) result.push({ type: 'inlineMath', content: currentText });
                currentText = '';
                isMath = false;
                i += 1;
                continue;
            }

            currentText += processedText[i];
            i++;
        }

        // Push whatever remains
        if (currentText) {
            result.push({ type: isMath ? (isBlock ? 'blockMath' : 'inlineMath') : 'text', content: currentText });
        }

        return result;
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
