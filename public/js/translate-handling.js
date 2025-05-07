document.addEventListener('DOMContentLoaded', function() {
    const translateForm = document.getElementById('translateForm');
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const copyBtn = document.getElementById('copyTranslation');
    const swapBtn = document.getElementById('swapLanguages');

    let translationTimeout;

    // Handle translation when the source text is changed
    sourceText.addEventListener('input', function() {
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(translateText, 500);
    });

    // Handle translation when the source language or target language is changed
    sourceLanguage.addEventListener('change', translateText);
    targetLanguage.addEventListener('change', translateText);

    // Handle swapping languages
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

    // Handle copying translation
    copyBtn.addEventListener('click', function() {
        translatedText.select();
        document.execCommand('copy');
        
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="bi bi-check2"></i> Đã sao chép';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    });

    const translationType = document.getElementById('translationType');

    // Add event listener for translation type change
    translationType.addEventListener('change', translateText);

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
                    targetLanguage: targetLanguage.value,
                    translationType: translationType.value
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

    // Xử lý tài liệu
    const documentFile = document.getElementById('documentFile');
    const documentUploadArea = document.querySelector('.document-upload-area');
    const translateDocumentBtn = document.getElementById('translateDocument');
    const documentSourceLanguage = document.getElementById('documentSourceLanguage');
    const documentTargetLanguage = document.getElementById('documentTargetLanguage');
    const documentTranslationType = document.getElementById('documentTranslationType');

    // Xử lý kéo thả
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        documentUploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        documentUploadArea.addEventListener(eventName, highlight, false);
        document.body.addEventListener(eventName, () => {
            documentUploadArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        documentUploadArea.addEventListener(eventName, unhighlight, false);
        document.body.addEventListener(eventName, () => {
            documentUploadArea.classList.remove('drag-over');
        }, false);
    });

    function highlight() {
        documentUploadArea.classList.add('drag-over');
    }

    function unhighlight() {
        documentUploadArea.classList.remove('drag-over');
    }

    documentUploadArea.addEventListener('drop', handleDrop, false);
    document.body.addEventListener('drop', (e) => {
        handleDrop(e);
    }, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    documentFile.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            // Kiểm tra định dạng file
            const validTypes = ['.pdf', '.docx', '.txt', '.xlsx', '.csv'];
            const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!validTypes.includes(fileExtension)) {
                alert('Định dạng file không được hỗ trợ. Vui lòng chọn file PDF, DOCX, TXT, XLSX hoặc CSV.');
                return;
            }

            // Kiểm tra kích thước file (giới hạn 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Kích thước file không được vượt quá 10MB.');
                return;
            }

            translateDocumentBtn.disabled = false;
        } else {
            translateDocumentBtn.disabled = true;
        }
    }

    translateDocumentBtn.addEventListener('click', async function() {
        const file = documentFile.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceLanguage', documentSourceLanguage.value);
        formData.append('targetLanguage', documentTargetLanguage.value);
        formData.append('translationType', documentTranslationType.value);

        try {
            translateDocumentBtn.disabled = true;
            translateDocumentBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang xử lý...';

            const response = await fetch('/translate/document', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `translated_${file.name}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            alert('Dịch tài liệu thành công!');
        } catch (error) {
            console.error('Translation error:', error);
            alert('Lỗi khi dịch tài liệu. Vui lòng thử lại.');
        } finally {
            translateDocumentBtn.disabled = false;
            translateDocumentBtn.innerHTML = '<i class="bi bi-translate"></i> Dịch tài liệu';
        }
    });
});