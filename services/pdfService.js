const { extractTextFromPdf } = require('../utils/pdfUtils');

class PDFService {
    async extractText(buffer) {
        return await extractTextFromPdf(buffer);
    }
}

module.exports = new PDFService();