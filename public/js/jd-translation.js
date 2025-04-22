document.addEventListener('DOMContentLoaded', function() {
    const translateBtn = document.getElementById('translateJD');
    const spinner = document.getElementById('translateSpinner');
    const jdTextarea = document.getElementById('jdText');
    const translatedSection = document.getElementById('translatedSection');
    const translatedTextarea = document.getElementById('translatedJD');
    const copyBtn = document.getElementById('copyTranslation');

    translateBtn?.addEventListener('click', async function() {
        const targetLang = document.getElementById('translateLanguage').value;
        const currentText = jdTextarea.value;
        
        if (!currentText.trim()) {
            alert('Please input JD or upload PDF file first.');
            return;
        }

        try {
            spinner.style.display = 'inline-block';
            translateBtn.disabled = true;

            const response = await fetch('/jd/translate-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: currentText,
                    targetLanguage: targetLang,
                    contentType: 'jd'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            const cleanTranslation = data.translation
                .replace(/<\/?pre>/g, '')
                .replace(/<\/?code>/g, '')
                .trim();

            translatedTextarea.value = cleanTranslation;
            translatedSection.style.display = 'block';

        } catch (error) {
            console.error('Translation error:', error);
            alert('Unable to translate. Please try again.');
        } finally {
            spinner.style.display = 'none';
            translateBtn.disabled = false;
        }
    });

    // 添加复制功能
    copyBtn?.addEventListener('click', function() {
        translatedTextarea.select();
        document.execCommand('copy');
        copyBtn.innerHTML = '<i class="bi bi-check2"></i> Đã sao chép';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Sao chép';
        }, 2000);
    });
});