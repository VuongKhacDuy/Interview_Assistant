const axios = require('axios');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

class AIDetectorController {
    constructor() {
        this.COPYLEAKS_API_KEY = process.env.COPYLEAKS_API_KEY;
        this.COPYLEAKS_API_URL = 'https://api.copyleaks.com/v2/detector';
    }

    async detectAI(req, res) {
        try {
            const { text } = req.body;
            
            if (!text) {
                return res.status(400).json({ error: 'Văn bản không được để trống' });
            }

            const result = await this.analyzeText(text);
            res.json(result);
        } catch (error) {
            console.error('Error in detectAI:', error);
            res.status(500).json({ error: 'Lỗi khi phân tích văn bản' });
        }
    }

    async detectAIFile(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Không tìm thấy file' });
            }

            const text = await this.extractTextFromFile(req.file);
            const result = await this.analyzeText(text);
            res.json(result);
        } catch (error) {
            console.error('Error in detectAIFile:', error);
            res.status(500).json({ error: 'Lỗi khi phân tích file' });
        }
    }

    async analyzeText(text) {
        try {
            const response = await axios.post(this.COPYLEAKS_API_URL, {
                text: text
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.COPYLEAKS_API_KEY}`
                }
            });

            // Xử lý kết quả từ Copyleaks API
            const segments = this.processAPIResponse(response.data, text);
            
            return {
                score: response.data.aiScore,
                segments: segments
            };
        } catch (error) {
            throw new Error('Lỗi khi gọi API Copyleaks');
        }
    }

    async extractTextFromFile(file) {
        const fileType = file.mimetype;
        const filePath = file.path;

        try {
            let text = '';

            if (fileType === 'application/pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdf(dataBuffer);
                text = data.text;
            } 
            else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ path: filePath });
                text = result.value;
            }
            else if (fileType === 'text/plain') {
                text = fs.readFileSync(filePath, 'utf8');
            }

            return text;
        } finally {
            // Xóa file tạm sau khi xử lý
            fs.unlinkSync(filePath);
        }
    }

    processAPIResponse(apiResponse, originalText) {
        // Xử lý phân đoạn văn bản và đánh dấu phần do AI tạo ra
        const segments = [];
        let currentPosition = 0;

        apiResponse.segments.forEach(segment => {
            if (segment.start > currentPosition) {
                // Thêm phần văn bản người viết
                segments.push({
                    text: originalText.slice(currentPosition, segment.start),
                    isAI: false
                });
            }

            // Thêm phần văn bản AI
            segments.push({
                text: originalText.slice(segment.start, segment.end),
                isAI: true
            });

            currentPosition = segment.end;
        });

        // Thêm phần còn lại nếu có
        if (currentPosition < originalText.length) {
            segments.push({
                text: originalText.slice(currentPosition),
                isAI: false
            });
        }

        return segments;
    }
}

module.exports = new AIDetectorController();