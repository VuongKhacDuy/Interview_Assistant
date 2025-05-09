document.addEventListener('DOMContentLoaded', function() {
    const sourceText = document.getElementById('sourceText');
    const fileInput = document.getElementById('fileInput');
    const detectText = document.getElementById('detectText');
    const detectFile = document.getElementById('detectFile');
    const resultSection = document.getElementById('resultSection');
    const aiScore = document.getElementById('aiScore');
    const detailedResult = document.getElementById('detailedResult');

    // Xử lý kéo thả file
    const fileUploadArea = document.querySelector('.file-upload-area');
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove('drag-over');
        });
    });

    fileUploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        handleFileInputChange();
    });

    // Xử lý thay đổi file input
    fileInput.addEventListener('change', handleFileInputChange);

    function handleFileInputChange() {
        detectFile.disabled = !fileInput.files.length;
    }

    // Xử lý kiểm tra văn bản
    detectText.addEventListener('click', async () => {
        if (!sourceText.value.trim()) {
            alert('Vui lòng nhập văn bản cần kiểm tra');
            return;
        }

        try {
            const response = await fetch('/api/detect-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: sourceText.value
                })
            });

            const result = await response.json();
            displayResult(result);
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi kiểm tra văn bản');
        }
    });

    // Xử lý kiểm tra file
    detectFile.addEventListener('click', async () => {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch('/api/detect-ai-file', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            displayResult(result);
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi kiểm tra file');
        }
    });

    // Hiển thị kết quả
    function displayResult(result) {
        resultSection.style.display = 'block';
        aiScore.textContent = result.score;

        // Hiển thị văn bản với đánh dấu các phần nghi ngờ do AI tạo ra
        let html = '';
        result.segments.forEach(segment => {
            if (segment.isAI) {
                html += `<span class="highlight-ai">${segment.text}</span>`;
            } else {
                html += segment.text;
            }
        });

        detailedResult.innerHTML = html;
    }
});