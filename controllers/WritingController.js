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
            const result = await aiService.evaluateWriting(topic, content, options);
            
            console.log("<><><>< 444 Evaluation sc result:", result);
            
            if (!result || !result.evaluation) {
                return res.status(500).json({ error: 'No evaluation result received' });
            }

            return res.json({
                success: true,
                evaluation: result.evaluation
            });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to evaluate writing' });
        }
    }

    static async generateTemplate(req, res) {
        try {
            const apiKey = req.cookies?.apiKey;
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            const options = req.body;
            const aiService = new AIService(apiKey);
            const template = await aiService.generateTemplate(options);
            res.json(template);
        } catch (error) {
            console.error('Error generating template:', error);
            res.status(500).json({ error: 'Failed to generate template' });
        }
    }
}

module.exports = WritingController;