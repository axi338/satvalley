
const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'd:/satvalley-main/backend/sat-practice-test-8-answers-digital.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('/tmp/pdf_text.txt', data.text);
    console.log('PDF text extracted to /tmp/pdf_text.txt');
}).catch(err => {
    console.error('Error parsing PDF:', err);
});
