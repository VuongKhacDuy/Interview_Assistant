const express = require('express');
const router = express.Router();
const JDController = require('../controllers/JDController');
const multer = require('multer');

// Sử dụng multer với bộ nhớ tạm để xử lý upload file PDF
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route hiển thị giao diện JD
router.get('/', JDController.renderJDView);

// Route tạo câu hỏi: hỗ trợ nhận file PDF (field name: pdfFile) và/hoặc jdText
router.post('/jd/generate-question', upload.single('pdfFile'), JDController.generateQuestion);

// Route đánh giá câu trả lời
router.post('/jd/evaluate-answer', upload.none(), JDController.evaluateAnswer);

router.post('/submit-api-key', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).render('api-key-form', {
            message: 'API Key is required'
        });
    }

    process.env.GEN_API_KEY = apiKey;
    res.redirect('/');
});

module.exports = router;