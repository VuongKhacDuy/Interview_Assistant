const express = require('express');
const router = express.Router();
const translateController = require('../controllers/TranslateController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});


router.get('/translate', translateController.renderTranslateView);
router.post('/translate', translateController.translate);
router.post('/translate/document', upload.single('file'), translateController.translateDocument);
router.post('/translate/detect-text', upload.single('image'), translateController.detectText);
router.post('/translate/image-text', translateController.translateDetectedText);

module.exports = router;