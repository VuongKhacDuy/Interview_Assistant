const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const pdfParse = require('pdf-parse');
const { synthesizeSpeech } = require('../utils/ttsUtils');
const RateLimiter = require('../utils/rateLimiter');
const { getLanguageName } = require('../utils/languageUtils');
const { extractTextFromPdf } = require('../utils/pdfUtils');
const AIService = require('../services/aiService');
const htmlDocx = require('html-docx-js');
const htmlPdf = require('html-pdf-node');

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
        // const cookieExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        const cookieExpiry = new Date(Date.now() + 10 * 1000); // 10 seconds from now
        // If API key exists but is expired, clear it
        if (apiKey && new Date() > new Date(req.cookies?.apiKeyExpiry)) {
            res.clearCookie('apiKey');
            res.clearCookie('apiKeyExpiry');
            return res.render('jd', {
                title: 'JD Assistant',
                showApiKeyForm: true,
                message: 'Your API key has expired. Please enter it again.'
            });
        }

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

exports.setApiKey = async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Set cookies with 24-hour expiration
        // const cookieExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Set cookies with 10-second expiration
        const cookieExpiry = new Date(Date.now() + 10 * 1000);
        res.cookie('apiKey', apiKey, { 
            expires: cookieExpiry,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });
        res.cookie('apiKeyExpiry', cookieExpiry, { 
            expires: cookieExpiry,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting API key:', error);
        res.status(500).json({ error: 'Failed to set API key' });
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
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        const { text, targetLanguage, contentType } = req.body;
        if (!text || !targetLanguage) {
            return res.status(400).json({ error: 'Text and target language are required.' });
        }
        
        const aiService = new AIService(apiKey);
        const languageName = getLanguageName(targetLanguage);
        const result = await aiService.translateText(text, languageName, contentType);

        res.json({ translation: result });
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

exports.generateCoverLetter = async (req, res) => {
    try {
        const apiKey = checkApiKey(req, res);
        if (!apiKey) return;

        const { jdText, userInfo } = req.body;
        
        if (!jdText) {
            return res.status(400).json({ error: 'JD text is required.' });
        }

        if (!userInfo) {
            return res.status(400).json({ error: 'User information is required.' });
        }

        // Initialize AI service and generate cover letter
        const aiService = new AIService(apiKey);
        const result = await aiService.generateCoverLetter(jdText, userInfo);

        // Return the cover letter
        res.json(result);
    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({ error: 'Failed to generate cover letter.' });
    }
};

exports.generateOptimizedCV = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(401).json({ 
                error: 'API key is required' 
            });
        }

        const { cvContent, jdText } = req.body;
        
        if (!cvContent || !jdText) {
            return res.status(400).json({ 
                error: 'CV content and JD text are required' 
            });
        }

        const aiService = new AIService(apiKey);
        const optimizedCV = await aiService.generateOptimizedCV(cvContent, jdText);
        
        res.json({ 
            success: true, 
            optimizedCV 
        });
    } catch (error) {
        console.error('Error generating optimized CV:', error);
        res.status(500).json({ 
            error: 'Failed to generate optimized CV' 
        });
    }
};

exports.evaluateCV = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(401).json({ 
                error: 'API key is required' 
            });
        }

        const { cvContent, jdText } = req.body;
        
        if (!cvContent || !jdText) {
            return res.status(400).json({ 
                error: 'CV content and JD text are required' 
            });
        }

        const aiService = new AIService(apiKey);
        const evaluation = await aiService.evaluateCV(cvContent, jdText);
        
        res.json({ 
            success: true, 
            evaluation 
        });
    } catch (error) {
        console.error('Error in CV evaluation:', error);
        res.status(500).json({ 
            error: 'Failed to evaluate CV' 
        });
    }
};

exports.convertCV = async (req, res) => {
    try {
        const { html, format } = req.body;
        
        if (!html || !format) {
            return res.status(400).json({ 
                error: 'HTML content and format are required' 
            });
        }

        // Xử lý và làm sạch HTML
        const cleanHtml = html.replace(/^```html\s*/, '').replace(/```\s*$/, '');

        // Thêm style và wrapper cho nội dung HTML
        const styledHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 40px;
                    }
                    h1, h2 {
                        color: #333;
                        margin-top: 20px;
                        text-align: center;
                        width: 100%;
                    }
                    h3, h4, h5 {
                        color: #333;
                        margin-top: 20px;
                    }
                    ul {
                        margin: 10px 0;
                        padding-left: 20px;
                    }
                    li {
                        margin: 5px 0;
                    }
                    p {
                        margin: 10px 0;
                    }
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                </style>
            </head>
            <body>
                <div class="content">
                    ${cleanHtml}
                </div>
            </body>
            </html>
        `;

        if (format === 'docx') {
            try {
                const docBuffer = await htmlDocx.asBlob(styledHtml, {
                    orientation: 'portrait',
                    margins: {
                        top: 1440, 
                        right: 1440,
                        bottom: 1440,
                        left: 1440
                    },
                    title: 'Optimized CV'
                });
                
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', 'attachment; filename=optimized_cv.docx');
                res.send(docBuffer);
            } catch (docxError) {
                console.error('Error converting to DOCX:', docxError);
                throw new Error('Failed to convert to DOCX format');
            }
        } 
        else if (format === 'pdf') {
            const options = { 
                format: 'A4',
                margin: {
                    top: '40px',
                    right: '40px',
                    bottom: '40px',
                    left: '40px'
                },
                printBackground: true
            };
            const file = { content: styledHtml };
            
            const pdfBuffer = await htmlPdf.generatePdf(file, options);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=optimized_cv.pdf');
            res.send(pdfBuffer);
        } 
        else {
            res.status(400).json({ 
                error: 'Invalid format. Supported formats are "doc" and "pdf"' 
            });
        }
    } catch (error) {
        console.error('Error converting CV:', error);
        res.status(500).json({ 
            error: 'Failed to convert CV' 
        });
    }
};