/**
 * Map language codes to full language names
 */
const languageCodeToName = {
    'vi': 'Vietnamese',
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',  // Thêm tiếng Nhật
    'ko': 'Korean',    // Thêm tiếng Hàn
    'fr': 'French',    // Thêm tiếng Pháp
    // Thêm các ngôn ngữ khác
};

/**
 * Convert a language code to its full name
 * @param {string} code - Language code (e.g., 'vi', 'en')
 * @returns {string} Full language name
 */
const getLanguageName = (code) => {
    return languageCodeToName[code] || code;
};

/**
 * Map language codes to speech recognition language codes
 */
const speechRecognitionLanguages = {
    'vi': 'vi-VN',
    'en': 'en-US',
    'zh': 'zh-CN'
};

/**
 * Get the speech recognition language code
 * @param {string} code - Language code (e.g., 'vi', 'en')
 * @returns {string} Speech recognition language code
 */
const getSpeechRecognitionLanguage = (code) => {
    return speechRecognitionLanguages[code] || 'en-US';
};

module.exports = {
    getLanguageName,
    getSpeechRecognitionLanguage,
    languageCodeToName,
    speechRecognitionLanguages
};