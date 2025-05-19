const express = require('express');
const router = express.Router();
const WritingController = require('../controllers/WritingController');
const AIService = require('../services/aiService');  // Add this import

// Render views
router.get('/writing-practice', (req, res) => {
    const apiKey = req.cookies?.apiKey;
    res.render('write-practice', {
        title: 'Writing Practice',
        showApiKeyForm: !apiKey,
        message: !apiKey ? 'Please enter your Google API Key to use the application.' : ''
    });
});

router.get('/writing-practice/exercise', (req, res) => {
    res.render('write-result');
});

router.post('/writing-practice/generate-topic', WritingController.generateTopic);
router.post('/writing-practice/evaluate', WritingController.evaluateWriting);

router.get('/writing-practice/template', (req, res) => {
    res.render('template', {
        title: 'Template Writing',
        showApiKeyForm: !req.cookies?.apiKey,
        message: !req.cookies?.apiKey ? 'Please enter your Google API Key to use the application.' : ''
    });
});

router.post('/writing-practice/generate-template', WritingController.generateTemplate);

module.exports = router;