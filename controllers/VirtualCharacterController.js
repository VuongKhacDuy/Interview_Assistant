const AIService = require('../services/aiService');

exports.renderVirtualCharacterView = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        res.render('virtual-character', {
            title: 'Virtual Character',
            showApiKeyForm: !apiKey,
            message: !apiKey ? 'Bạn cần nhập Google API Key để sử dụng ứng dụng.' : ''
        });
    } catch (error) {
        console.error('Error rendering virtual character view:', error);
        res.status(500).send('Internal Server Error.');
    }
};

exports.generateResponse = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        const aiService = new AIService(apiKey);
        const response = await aiService.generateContent(message);
        res.json({ response });
    } catch (error) {
        console.error('Error generating response:', error);
        res.status(500).json({ error: 'Failed to generate response.' });
    }
};

exports.generateStreamResponse = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required.' });
        }

        // Nhận message từ cả query hoặc body
        const message = req.query.message || req.body.message;
        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const aiService = new AIService(apiKey);
        
        try {
            // Sinh nội dung và gửi nó dưới dạng SSE (Server-Sent Events)
            const stream = await aiService.generateContentStream(message);
            
            // Xử lý stream từng phần và gửi cho client
            for await (const chunk of stream) {
                const textChunk = chunk.toString();
                res.write(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`);
            }
            
            // Kết thúc stream
            res.write('data: [DONE]\n\n');
            res.end();
        } catch (streamError) {
            console.error('Streaming error:', streamError);
            res.write(`data: ${JSON.stringify({ error: 'Streaming error occurred' })}\n\n`);
            res.end();
        }
    } catch (error) {
        console.error('Error generating stream response:', error);
        res.status(500).json({ error: 'Failed to generate stream response.' });
    }
};