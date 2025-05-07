const fs = require('fs').promises;
const path = require('path');
const AIService = require('../services/aiService');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const docx = require('docx');
const { Document, Paragraph, TextRun } = docx;

class TranslateController {
    static renderTranslateView(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            // Check if API key has expired
            if (apiKey && new Date() > new Date(req.cookies?.apiKeyExpiry)) {
                res.clearCookie('apiKey');
                res.clearCookie('apiKeyExpiry');
                return res.render('translate', {
                    title: 'Translation Assistant',
                    showApiKeyForm: true,
                    message: 'Your API key has expired. Please enter it again.'
                });
            }

            res.render('translate', { 
                title: 'Translation Assistant',
                showApiKeyForm: !apiKey,
                message: !apiKey ? 'You need to enter Google API Key to use the application.' : ''
            });
        } catch (error) {
            console.error('Error rendering translate view:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    static async translate(req, res) {
        try {
            const { sourceText, sourceLanguage, targetLanguage, translationType } = req.body;
            const apiKey = req.cookies?.apiKey;

            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            if (!sourceText || !targetLanguage) {
                return res.status(400).json({ error: 'Source text and target language are required' });
            }

            const aiService = new AIService(apiKey);
            const translation = await aiService.translate(sourceText, sourceLanguage, targetLanguage, translationType);

            res.json({ translation });
        } catch (error) {
            console.error('Translation error:', error);
            res.status(500).json({ error: 'Failed to translate text' });
        }
    }
    static async translateDocument(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { sourceLanguage, targetLanguage, translationType } = req.body;
            if (!sourceLanguage || !targetLanguage) {
                return res.status(400).json({ error: 'Source and target languages are required' });
            }

            const fileExt = path.extname(req.file.originalname).toLowerCase();
            const aiService = new AIService(apiKey);

            let fileContent;
            let contentType;

            // Handle different file types
            try {
                switch (fileExt) {
                    case '.csv':
                    case '.txt':
                        fileContent = req.file.buffer.toString('utf8');
                        contentType = 'text/plain';
                        break;
                    case '.xlsx':
                    case '.xls':
                        const workbook = xlsx.read(req.file.buffer);
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        fileContent = xlsx.utils.sheet_to_csv(firstSheet);
                        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                        break;
                    case '.docx':
                        const result = await mammoth.extractRawText({ buffer: req.file.buffer, styleMap: [
                            "p[style-name='Heading 1'] => h1",
                            "p[style-name='Heading 2'] => h2",
                            "p[style-name='Normal'] => p"
                        ]});
                        fileContent = result.value;
                        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        break;
                    case '.pdf':
                        const pdfData = await pdfParse(req.file.buffer);
                        fileContent = pdfData.text;
                        contentType = 'text/plain';
                        break;
                    default:
                        return res.status(400).json({ 
                            error: 'Unsupported file type. Supported types: TXT, CSV, XLSX, DOCX, PDF' 
                        });
                }

                const translation = await aiService.translate(
                    fileContent,
                    sourceLanguage,
                    targetLanguage,
                    translationType,
                    true // preserve formatting
                );

                // Handle Excel files separately after translation
                if (fileExt === '.xlsx' || fileExt === '.xls') {
                    const newWorkbook = xlsx.utils.book_new();
                    // Parse the translated CSV content into array of arrays
                    const rows = translation.split('\n').map(row => row.split(','));
                    const translatedSheet = xlsx.utils.aoa_to_sheet(rows);
                    xlsx.utils.book_append_sheet(newWorkbook, translatedSheet, 'Translated');
                    const excelBuffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Disposition', `attachment; filename=translated_${req.file.originalname}`);
                    return res.send(excelBuffer);
                }

                // Handle Word files separately after translation
                if (fileExt === '.docx') {
                    const doc = new Document({
                        sections: [{
                            properties: {},
                            children: translation.split('\n').map(para => 
                                new Paragraph({
                                    children: [new TextRun({ text: para })]
                                })
                            )
                        }]
                    });
                    const buffer = await Packer.toBuffer(doc);
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Disposition', `attachment; filename=translated_${req.file.originalname}`);
                    return res.send(buffer);
                }

                // Send translated content with appropriate headers for other file types
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', `attachment; filename=translated_${req.file.originalname}`);
                res.send(translation);

            } catch (error) {
                console.error('File processing error:', error);
                return res.status(400).json({ 
                    error: 'Error processing file. Please make sure the file is not corrupted.' 
                });
            }
        } catch (error) {
            console.error('Document translation error:', error);
            res.status(500).json({ error: 'Failed to translate document' });
        }
    }
}

module.exports = TranslateController;