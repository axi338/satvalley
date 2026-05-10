
const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'd:/satvalley-main/backend/sat-practice-test-8-answers-digital.pdf';

if (!fs.existsSync(pdfPath)) {
    console.error('PDF file does not exist at:', pdfPath);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('pdf_text.txt', data.text);
    console.log('PDF text extracted to d:/satvalley-main/backend/pdf_text.txt');
}).catch(err => {
    console.error('Error parsing PDF:', err);
});
