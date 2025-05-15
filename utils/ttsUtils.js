const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const { pipeline } = require('@huggingface/transformers');
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const util = require('util');
const { v4: uuidv4 } = require('uuid');

// Đảm bảo thư mục cache tồn tại
const CACHE_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Các model TTS có hỗ trợ tiếng Việt
const VIETNAMESE_TTS_MODELS = {
    'gtts-vi': {
        name: 'Google TTS (Tiếng Việt Nam)',
        lang: 'vi'
    },
    'gtts-vi-female': {
        name: 'Google TTS (Nữ - Tiếng Việt Nam)',
        lang: 'vi'
    }
};

let ttsModels = {}; // Cache các model đã tải
let modelLoadAttempted = {}; // Theo dõi các model đã thử tải

// Chuyển đổi callbacks sang promises
const readFileAsync = util.promisify(fs.readFile);
const unlinkAsync = util.promisify(fs.unlink);

async function synthesizeSpeech(text, options = {}) {
    const { 
        languageCode = 'vi-VN', 
        modelId = 'gtts-vi',
        useGoogle = false
    } = options;

    try {
        // Nếu sử dụng Google Cloud TTS API
        if (useGoogle && process.env.GOOGLE_TTS_API_KEY) {
            return await synthesizeWithGoogleTTS(text, languageCode);
        }

        // Ưu tiên sử dụng gTTS vì đã biết Hugging Face models có vấn đề
        return await synthesizeWithLocalGTTS(text, modelId);
    } catch (error) {
        console.error('Lỗi TTS:', error);
        // Fallback khi gặp lỗi
        return await generateFallbackAudio(text, languageCode);
    }
};

// Hàm sử dụng Google Cloud TTS nếu có API key
async function synthesizeWithGoogleTTS(text, languageCode) {
    try {
        const client = new TextToSpeechClient({
            credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}'),
        });

        const request = {
            input: { text },
            voice: { languageCode, ssmlGender: 'FEMALE' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
    } catch (error) {
        console.error('Google TTS error:', error);
        throw error;
    }
}

// Hàm sử dụng gTTS (Google TTS không yêu cầu API key)
async function synthesizeWithLocalGTTS(text, modelId = 'gtts-vi') {
    try {
        // Lấy ngôn ngữ từ modelId
        const lang = VIETNAMESE_TTS_MODELS[modelId]?.lang || 'vi';
        
        console.log(`Tạo giọng nói tiếng Việt với gTTS, ngôn ngữ: ${lang}, text: "${text}"`);
        
        // Tạo unique ID cho file
        const fileId = uuidv4();
        const outputFile = path.join(CACHE_DIR, `${fileId}.mp3`);
        
        // Tạo instance gTTS
        const gtts = new gTTS(text, lang);
        
        // Promise wrapper cho hàm save
        const saveFilePromise = new Promise((resolve, reject) => {
            gtts.save(outputFile, (err, result) => {
                if (err) {
                    console.error('Lỗi khi lưu file TTS:', err);
                    reject(err);
                    return;
                }
                console.log(`Đã lưu file TTS: ${outputFile}`);
                resolve(outputFile);
            });
        });
        
        // Đợi file được lưu
        const savedFile = await saveFilePromise;
        
        // Đọc file
        const audioContent = await readFileAsync(savedFile);
        console.log(`Đã đọc file TTS, kích thước: ${audioContent.length} bytes`);
        
        // Xóa file
        try {
            await unlinkAsync(savedFile);
            console.log(`Đã xóa file tạm: ${savedFile}`);
        } catch (cleanupError) {
            console.warn('Không thể xóa file tạm:', cleanupError);
        }
        
        return audioContent;
    } catch (error) {
        console.error('GTTS error:', error);
        throw error;
    }
}

// Fallback sang dạng audio base64 khi không thể tải model
async function generateFallbackAudio(text, languageCode = 'vi-VN') {
    // Tạo một buffer âm thanh trống (1 giây)
    // Trả về buffer rỗng 1 giây để báo lỗi một cách êm thấm
    const sampleRate = 22050;
    const seconds = 0.5;
    const numSamples = Math.floor(sampleRate * seconds);
    const audioBuffer = Buffer.alloc(numSamples * 2); // 16-bit samples = 2 bytes per sample
    
    // Điền buffer với silence
    for (let i = 0; i < numSamples * 2; i += 2) {
        audioBuffer.writeInt16LE(0, i);
    }
    
    console.log('Đã tạo âm thanh rỗng thay thế');
    return audioBuffer;
}

// Lấy danh sách model tiếng Việt có sẵn
const getVietnameseModels = () => {
    return Object.keys(VIETNAMESE_TTS_MODELS).map(id => ({
        id,
        name: VIETNAMESE_TTS_MODELS[id].name
    }));
};

module.exports = {
    synthesizeSpeech,
    getVietnameseModels
};