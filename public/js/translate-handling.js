document.addEventListener('DOMContentLoaded', function() {
    const translateForm = document.getElementById('translateForm');
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const copyBtn = document.getElementById('copyTranslation');
    const swapBtn = document.getElementById('swapLanguages');

    let translationTimeout;

    // Xử lý sự kiện nhập text để dịch
    sourceText.addEventListener('input', function() {
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(translateText, 500);
    });

    // Xử lý sự kiện đổi ngôn ngữ
    sourceLanguage.addEventListener('change', translateText);
    targetLanguage.addEventListener('change', translateText);

    // Xử lý sự kiện hoán đổi ngôn ngữ
    swapBtn.addEventListener('click', function() {
        if (sourceLanguage.value === 'auto') return;

        const tempLang = sourceLanguage.value;
        sourceLanguage.value = targetLanguage.value;
        targetLanguage.value = tempLang;

        const tempText = sourceText.value;
        sourceText.value = translatedText.value;
        translatedText.value = tempText;

        if (sourceText.value) {
            translateText();
        }
    });

    // Xử lý sự kiện copy bản dịch
    copyBtn.addEventListener('click', function() {
        translatedText.select();
        document.execCommand('copy');
        
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check2"></i> Đã sao chép';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    });

    async function translateText() {
        const text = sourceText.value.trim();
        if (!text) {
            translatedText.value = '';
            return;
        }

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sourceText: text,
                    sourceLanguage: sourceLanguage.value,
                    targetLanguage: targetLanguage.value
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            translatedText.value = data.translation;

        } catch (error) {
            console.error('Translation error:', error);
            translatedText.value = 'Lỗi dịch. Vui lòng thử lại.';
        }
    }
});