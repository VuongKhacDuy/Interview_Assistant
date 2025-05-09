const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const AIDetectorController = require('../controllers/AIDetectorController');

// Cấu hình multer cho việc upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Định dạng file không được hỗ trợ'));
        }
    }
});

// Route cho việc kiểm tra văn bản
router.get('/ai-detector', (req, res) => {
    res.render('ai-detector', { 
        title: 'AI Detector',
        showApiKeyForm: !req.cookies.apiKey,
        message: null 
    });
});

router.post('/ai-detector', AIDetectorController.detectAI.bind(AIDetectorController));

// Route cho việc kiểm tra file
router.post('/detect-ai-file', 
    upload.single('file'), 
    AIDetectorController.detectAIFile.bind(AIDetectorController)
);

module.exports = router;