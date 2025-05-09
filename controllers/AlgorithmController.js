const AIService = require('../services/aiService');

exports.renderAlgorithmView = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        res.render('algorithm', {
            title: 'Algorithm Assistant',
            showApiKeyForm: !apiKey,
            message: !apiKey ? 'Bạn cần nhập Google API Key để sử dụng ứng dụng.' : ''
        });
    } catch (error) {
        console.error('Error rendering algorithm view:', error);
        res.status(500).send('Internal Server Error.');
    }
};

exports.solveProblem = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        const { problem, language, outputLanguage } = req.body;
        if (!problem) {
            return res.status(400).json({ error: 'Problem description is required.' });
        }

        const aiService = new AIService(apiKey);
        const solution = await aiService.solveAlgorithm(problem, language, outputLanguage);
        res.json({ solution });
    } catch (error) {
        console.error('Error solving problem:', error);
        res.status(500).json({ error: 'Failed to solve problem.' });
    }
};

exports.analyzeAlternativeSolution = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        const { problem, language, outputLanguage, alternativeSolution } = req.body;
        if (!problem || !alternativeSolution) {
            return res.status(400).json({ error: 'Problem and alternative solution are required.' });
        }

        const aiService = new AIService(apiKey);
        const analysis = await aiService.analyzeAlternativeSolution(problem, alternativeSolution, language, outputLanguage);
        res.json({ analysis });
    } catch (error) {
        console.error('Error analyzing solution:', error);
        res.status(500).json({ error: 'Failed to analyze solution.' });
    }
};