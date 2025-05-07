const fs = require('fs').promises;
const path = require('path');
const AIService = require('../services/aiService');

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
            switch (fileExt) {
                case '.csv':
                case '.txt':
                    fileContent = req.file.buffer.toString('utf8');
                    contentType = 'text/plain';
                    break;
                case '.xlsx':
                case '.xls':
                    return res.status(400).json({ 
                        error: 'Excel file translation is not supported yet. Please export to CSV first.' 
                    });
                case '.docx':
                case '.doc':
                    return res.status(400).json({ 
                        error: 'Word document translation is not supported yet. Please save as plain text first.' 
                    });
                default:
                    return res.status(400).json({ 
                        error: 'Unsupported file type. Please use TXT or CSV files.' 
                    });
            }

            const translation = await aiService.translate(
                fileContent,
                sourceLanguage,
                targetLanguage,
                translationType,
                true // preserve formatting
            );

            // Send translated content with appropriate headers
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename=translated_${req.file.originalname}`);
            res.send(translation);
        } catch (error) {
            console.error('Document translation error:', error);
            res.status(500).json({ error: 'Failed to translate document' });
        }
    }
}

module.exports = TranslateController;