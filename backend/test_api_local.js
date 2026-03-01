import fetch from 'node-fetch';

async function checkLocalApi() {
    const testId = '66f82d78-49db-4d6d-8c0d-7dfb6b36d8c3';
    const url = `http://localhost:3000/api/questions?testId=${testId}`;

    console.log(`Fetching from: ${url}`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error(text);
            return;
        }

        const data = await res.json();
        console.log(`Questions found: ${data.questions ? data.questions.length : 0}`);
        if (data.questions && data.questions.length > 0) {
            console.log('First question:', data.questions[0].id, data.questions[0].text.substring(0, 50));
        }
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

checkLocalApi();
