const pdfParse = require('pdf-parse');

/**
 * Extract text from a PDF buffer
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromPdf = async (buffer) => {
    try {
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF file');
    }
};

module.exports = {
    extractTextFromPdf
};