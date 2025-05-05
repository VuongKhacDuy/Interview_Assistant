const express = require('express');
const router = express.Router();
const translateController = require('../controllers/TranslateController');

router.get('/translate', translateController.renderTranslateView);
router.post('/translate', translateController.translate);

module.exports = router;