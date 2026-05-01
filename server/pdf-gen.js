const htmlPdf = require('html-pdf-node');

async function generateTimetablePDF(htmlContent) {
  const file = { content: htmlContent };
  const options = {
    format:      'A4',
    landscape:   true,
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  };

  const pdfBuffer = await htmlPdf.generatePdf(file, options);
  return pdfBuffer;
}

module.exports = { generateTimetablePDF };
