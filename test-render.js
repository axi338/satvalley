// Import React and the component to render it to a string.
// This will immediately surface any render exceptions that we're seeing in the browser.
import React from 'react';
import { renderToString } from 'react-dom/server';

// We need to mock some browser globals if TestSessionPage expects them
global.window = { getSelection: () => ({ removeAllRanges: () => { } }), location: { search: '' } };
global.document = { addEventListener: () => { }, removeEventListener: () => { } };
global.navigator = { userAgent: 'node' };

async function testRender() {
    try {
        const { default: TestSessionPage } = await import('./src/app/components/pages/TestSessionPage.tsx');

        console.log("Rendering TestSessionPage...");
        const html = renderToString(React.createElement(TestSessionPage, {
            questions: [
                {
                    id: 'q1',
                    text: 'Test question',
                    type: 'mcq',
                    options: ['A', 'B', 'C', 'D'],
                    correctAnswer: 'A',
                    explanation: 'A is correct',
                    difficulty: 'easy',
                    domain: 'Math',
                    skill: 'Algebra'
                }
            ],
            stage: 'math-m1',
            testDuration: 300,
            onComplete: () => { },
            onNavigate: () => { }
        }));

        console.log("Rendered successfully! Length:", html.length);
    } catch (e) {
        console.error("RENDER FAILED:", e);
    }
}

testRender();
