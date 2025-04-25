const express = require('express');
const router = express.Router();
const JDController = require('../controllers/JDController');
const multer = require('multer');

// Use multer with cache to handle PDF file upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to display JD interface
router.get('/', JDController.renderJDView);

// Route to set API key
router.post('/jd/set-api-key', JDController.setApiKey);

// Route to create question: supports receiving PDF file (field name: pdfFile) and/or jdText
router.post('/jd/generate-question', upload.single('pdfFile'), JDController.generateQuestion);

// Route evaluates the answer
router.post('/jd/evaluate-answer', upload.none(), JDController.evaluateAnswer);

// Route for generating guidance
router.post('/jd/generate-guidance', JDController.generateGuidance);

// Add this new route for translating guidance
router.post('/jd/translate-guidance', JDController.translateGuidance);

// Add these new routes
router.post('/jd/generate-answer', JDController.generateAnswer);
router.post('/jd/translate-text', JDController.translateText);
router.post('/jd/translate-guidance', JDController.translateGuidance);

module.exports = router;