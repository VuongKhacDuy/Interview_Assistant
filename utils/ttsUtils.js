const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const synthesizeSpeech = async (text, languageCode = 'vi-VN') => {
    try {
        const client = new TextToSpeechClient();
        const request = {
            input: { text },
            voice: { languageCode, ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent;
    } catch (error) {
        console.error('TTS Error:', error);
        throw new Error('Failed to convert text to speech');
    }
};

module.exports = {
    synthesizeSpeech
};