const fs = require('fs').promises;
const path = require('path');
const AIService = require('../services/aiService');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const docx = require('docx');
const { createWorker } = require('tesseract.js');
const { JSDOM } = require('jsdom');

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
    static async detectText(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }
    
            if (!req.file) {
                return res.status(400).json({ error: 'No image uploaded' });
            }
    
            const { sourceLanguage, targetLanguage } = req.body;
            if (!sourceLanguage || !targetLanguage) {
                return res.status(400).json({ error: 'Source and target languages are required' });
            }
    
            console.log('Starting OCR process with:', {
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                sourceLanguage,
                targetLanguage
            });
    
            const worker = await createWorker(['eng', 'vie', 'jpn', 'fra', 'spa']);
            console.log('Tesseract worker created successfully');
            
            try {
                console.log('Starting text recognition...');
                const result = await worker.recognize(req.file.buffer);
                console.log('Text recognition completed. Raw result:', result);
                
                if (!result || !result.data) {
                    throw new Error('No text detected in the image');
                }
    
                // Extract text and position from OCR results with confidence threshold
                const textBlocks = [];
                
                // Process words from OCR result
                if (result.data.words && Array.isArray(result.data.words)) {
                    result.data.words.forEach((word, index) => {
                        if (word.confidence > 70) { // Only process words with high confidence
                            textBlocks.push({
                                id: index + 1,
                                text: word.text,
                                position: {
                                    x: word.bbox.x0,
                                    y: word.bbox.y0,
                                    width: word.bbox.x1 - word.bbox.x0,
                                    height: word.bbox.y1 - word.bbox.y0
                                },
                                style: {
                                    position: 'absolute',
                                    left: `${word.bbox.x0}px`,
                                    top: `${word.bbox.y0}px`,
                                    minWidth: `${word.bbox.x1 - word.bbox.x0}px`,
                                    minHeight: `${word.bbox.y1 - word.bbox.y0}px`,
                                    padding: '2px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    border: '1px solid #ccc',
                                    borderRadius: '3px',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                    zIndex: 1000
                                }
                            });
                        }
                    });
                }
    
                // If no words were detected with high confidence, fall back to lines
                if (textBlocks.length === 0) {
                    const lines = result.data.text.split('\n').filter(line => line.trim() !== '');
                    console.log(`Falling back to lines. Found ${lines.length} text lines`);
                    
                    lines.forEach((line, index) => {
                        textBlocks.push({
                            id: index + 1,
                            text: line,
                            position: {
                                x: 0,
                                y: index * 30,
                                width: 800,
                                height: 25
                            },
                            style: {
                                position: 'absolute',
                                left: `${0}px`,
                                top: `${index * 30}px`,
                                width: '800px',
                                minHeight: '25px',
                                padding: '2px',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                border: '1px solid #ccc',
                                borderRadius: '3px',
                                fontSize: '14px',
                                lineHeight: '1.4',
                                zIndex: 1000,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        });
                    });
                }
    
                console.log('Text blocks created:', textBlocks.length);
    
                // Return only detected blocks without translation
                await worker.terminate();
                res.json({ textBlocks });
                
                } catch (error) {
                console.error('OCR process error:', error);
                await worker.terminate();
                throw error;
            }
        } catch (error) {
            console.error('Text detection error:', error);
            res.status(500).json({ 
                error: 'Failed to detect text',
                details: error.message
            });
        }
    }
    static async translateDetectedText(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }
    
            const { textBlocks, targetLanguage } = req.body;
            if (!Array.isArray(textBlocks) || textBlocks.length === 0) {
                return res.status(400).json({ error: 'Invalid or empty text blocks array' });
            }
    
            if (!targetLanguage) {
                return res.status(400).json({ error: 'Target language is required' });
            }
    
            const aiService = new AIService(apiKey);
            const translatedBlocks = await Promise.all(
                textBlocks.map(async (block, index) => {
                    if (!block || !block.text) {
                        console.error(`Invalid block at index ${index}:`, block);
                        return {
                            id: index + 1,
                            text: '',
                            translatedText: 'Invalid text block',
                            error: 'Invalid text block structure'
                        };
                    }
    
                    try {
                        const translation = await aiService.translateImageText(
                            block.text,
                            targetLanguage
                        );
                        return {
                            ...block,
                            translatedText: translation
                        };
                    } catch (error) {
                        console.error(`Translation failed for block ${index}:`, error);
                        return {
                            ...block,
                            translatedText: 'Translation failed',
                            error: error.message
                        };
                    }
                })
            );
    
            res.json({ textBlocks: translatedBlocks });
        } catch (error) {
            console.error('Translation error:', error);
            res.status(500).json({ 
                error: 'Failed to translate text',
                details: error.message
            });
        }
    }
}

module.exports = TranslateController;