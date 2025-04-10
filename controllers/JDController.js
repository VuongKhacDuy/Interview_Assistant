const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const pdfParse = require('pdf-parse');
const { synthesizeSpeech } = require('../utils/ttsUtils');
const AIService = require('../services/aiService');
const RateLimiter = require('../utils/rateLimiter');
const { getLanguageName } = require('../utils/languageUtils');
const { extractTextFromPdf } = require('../utils/pdfUtils');

// Get API key from .env environment variable (GEN_API_KEY)
const GEN_API_KEY = process.env.GEN_API_KEY;
if (!GEN_API_KEY) {
    console.error("GEN_API_KEY is not defined in .env file");
}

// Map to save user cooldown status (based on IP)
const userCooldowns = new Map();

// Create a rate limiter instance
const rateLimiter = new RateLimiter(5000); // 5 seconds cooldown

/**
 * Render JD interface (JD input form or PDF upload)
 */
exports.renderJDView = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;

        res.render('jd', {
            title: 'JD Assistant',
            showApiKeyForm: !apiKey,
            message: !apiKey ? 'You need to enter Google API Key to use the application. Follow these steps:\n\n1. Go to https://aistudio.google.com/apikey\n2. Log in to your Google account\n3. Create a new API Key\n4. Copy and paste the API Key into the form below' : ''
        });
    } catch (error) {
        console.error('Error rendering JD view:', error);
        res.status(500).send('Internal Server Error.');
    }
};

/**
 * Check if API key is provided
 */
const checkApiKey = (req, res) => {
    const apiKey = req.cookies?.apiKey;
    if (!apiKey) {
        res.render('jd', {
            title: 'JD Assistant',
            showApiKeyForm: true,
            message: 'You need to enter Google API Key to use the application. Follow these steps:\n\n1. Go to https://aistudio.google.com/apikey\n2. Log in to your Google account\n3. Create a new API Key\n4. Copy and paste the API Key into the form below'
        });
        return false;
    }
    return apiKey;
};


exports.generateQuestion = async (req, res) => {
    try {
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        let { jdText, interviewLanguage } = req.body;
        
        // Remove rate limit check and message
        
        // If user uploads PDF file, prioritize reading content from file
        if (req.file) {
            jdText = await extractTextFromPdf(req.file.buffer);
        }
        
        if (!jdText) {
            return res.status(400).json({ error: 'JD text is required.' });
        }
        
        // If interview language not selected, default to 'vi'
        if (!interviewLanguage) {
            interviewLanguage = 'vi';
        }

        const targetLanguage = getLanguageName(interviewLanguage);
        
        const aiService = new AIService(apiKey);
        const result = await aiService.generateQuestion(jdText, targetLanguage);

        res.json({ 
            questions: result.json,
            questionHtml: result.html,
            jdText 
        });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ error: 'Failed to generate questions.' });
    }
};

exports.evaluateAnswer = async (req, res) => {
    try {
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        const { jdText, question, answer } = req.body;
        if (!jdText || !question || !answer) {
            return res.status(400).json({ error: 'JD, questions and answers are all required.' });
        }

        // Initialize AI service and evaluate answer
        const aiService = new AIService(apiKey);
        const htmlContent = await aiService.evaluateAnswer(jdText, question, answer);

        // Return the evaluation results
        res.json({ evaluation: htmlContent });
    } catch (error) {
        console.error('Error evaluating answer:', error);
        res.status(500).json({ error: 'Failed to evaluate answer.' });
    }
};

exports.generateGuidance = async (req, res) => {
    try {
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        const { jdText, questions } = req.body;
        if (!jdText || !questions) {
            return res.status(400).json({ error: 'JD text and questions are required.' });
        }

        const aiService = new AIService(apiKey);
        const guidanceResults = await aiService.generateGuidance(jdText, questions);

        // Return array of guidance for each question
        res.json({ guidance: guidanceResults });
    } catch (error) {
        console.error('Error generating guidance:', error);
        res.status(500).json({ error: 'Failed to generate guidance.' });
    }
};

// Controller calls AIService
exports.generateAnswer = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        const { jdText, questions } = req.body;
        if (!jdText || !questions) {
            return res.status(400).json({ error: 'JD text and questions are required.' });
        }

        const aiService = new AIService(apiKey);
        const result = await aiService.generateAnswer(jdText, questions);
        res.json(result); // Pass through the result directly
    } catch (error) {
        console.error('Error generating answer:', error);
        res.status(500).json({ error: 'Failed to generate answers.' });
    }
};

exports.translateText = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        const { text, targetLanguage, contentType } = req.body;
        if (!text || !targetLanguage) {
            return res.status(400).json({ error: 'Text and target language are required.' });
        }
        
        const aiService = new AIService(apiKey);
        const languageName = getLanguageName(targetLanguage);
        const htmlContent = await aiService.translateText(text, languageName, contentType);

        // Return the translated text
        res.json({ translation: htmlContent, type: contentType || 'text' });
    } catch (error) {
        console.error('Error translating text:', error);
        res.status(500).json({ error: 'Failed to translate text.' });
    }
};

exports.translateGuidance = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        const { text, targetLanguage } = req.body;
        if (!text || !targetLanguage) {
            return res.status(400).json({ error: 'Text and target language are required.' });
        }

        // Initialize AI service and translate guidance
        const aiService = new AIService(apiKey);
        const languageName = getLanguageName(targetLanguage);
        const htmlContent = await aiService.translateText(text, languageName, 'guidance');

        // Return the translated guidance
        res.json({ translation: htmlContent });
    } catch (error) {
        console.error('Error translating guidance:', error);
        res.status(500).json({ error: 'Failed to translate guidance.' });
    }
};

exports.answerSpecificQuestion = async (req, res) => {
    try {
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        const { jdText, question } = req.body;
        if (!jdText || !question) {
            return res.status(400).json({
                success: false,
                error: 'JD text and question are required'
            });
        }

        const aiService = new AIService(apiKey);
        const result = await aiService.answerSpecificQuestion(jdText, question);

        res.json(result);
    } catch (error) {
        console.error('Error generating specific answer:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate answer'
        });
    }
};

exports.textToSpeech = async (req, res) => {
    try {
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        const { text, language } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required.' });
        }

        const audioContent = await synthesizeSpeech(text, language);
        
        res.set('Content-Type', 'audio/mpeg');
        res.send(audioContent);
    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to convert text to speech.' });
    }
};