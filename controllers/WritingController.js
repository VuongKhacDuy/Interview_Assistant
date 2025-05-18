const AIService = require('../services/aiService');

class WritingController {
    static async renderWritePractice(req, res) {
        const apiKey = req.cookies?.apiKey;
        res.render('write-practice', {
            title: 'Writing Practice',
            showApiKeyForm: !apiKey,
            message: !apiKey ? 'Please enter your Google API Key to use the application.' : ''
        });
    }

    static async renderWriteResult(req, res) {
        res.render('write-result');
    }

    static async generateTopic(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            const options = req.body;
            const aiService = new AIService(apiKey);
            const topic = await aiService.generateWritingTopic(options);
            res.json(topic);
        } catch (error) {
            console.error('Error generating topic:', error);
            res.status(500).json({ error: 'Failed to generate topic' });
        }
    }

    static async evaluateWriting(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            const { topic, content, options } = req.body;
            const aiService = new AIService(apiKey);
            const evaluation = await aiService.evaluateWriting(topic, content, options);
            res.json({ evaluation });
        } catch (error) {
            console.error('Error evaluating writing:', error);
            res.status(500).json({ error: 'Failed to evaluate writing' });
        }
    }
}

module.exports = WritingController;