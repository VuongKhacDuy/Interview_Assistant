const express = require('express');
const router = express.Router();
const { synthesizeSpeech, getVietnameseModels } = require('../utils/ttsUtils');
const VirtualCharacterController = require('../controllers/VirtualCharacterController');

router.get('/', VirtualCharacterController.renderVirtualCharacterView);
router.post('/generate-response', VirtualCharacterController.generateResponse);
router.post('/generate-stream-response', VirtualCharacterController.generateStreamResponse);

router.get('/tts/models', (req, res) => {
    try {
        const models = getVietnameseModels();
        res.json(models);
    } catch (error) {
        console.error('Error fetching TTS models:', error);
        res.status(500).json({ error: 'Failed to fetch TTS models' });
    }
});

router.post('/tts/synthesize', async (req, res) => {
    try {
        const { text, modelId } = req.body;
        const audioContent = await synthesizeSpeech(text, {
            modelId: modelId || 'facebook/mms-tts-vie'
        });
        res.set('Content-Type', 'audio/mp3');
        res.send(audioContent);
    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Failed to convert text to speech' });
    }
});

module.exports = router;