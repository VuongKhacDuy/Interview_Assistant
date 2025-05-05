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
            const { sourceText, sourceLanguage, targetLanguage } = req.body;
            const apiKey = req.cookies?.apiKey;

            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            if (!sourceText || !targetLanguage) {
                return res.status(400).json({ error: 'Source text and target language are required' });
            }

            const aiService = new AIService(apiKey);
            const translation = await aiService.translate(sourceText, sourceLanguage, targetLanguage);

            res.json({ translation });
        } catch (error) {
            console.error('Translation error:', error);
            res.status(500).json({ error: 'Failed to translate text' });
        }
    }
}

module.exports = TranslateController;