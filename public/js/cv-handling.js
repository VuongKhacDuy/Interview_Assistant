document.addEventListener('DOMContentLoaded', function() {
    // Initialize AI service if not already initialized
    if (!window.aiService) {
        window.aiService = new AIService();
    }
    const cvUploadForm = document.getElementById('cvUploadForm');
    const evaluateBtn = document.getElementById('evaluateCV');
    const generateBtn = document.getElementById('generateOptimizedCV');
    const cvSpinner = document.getElementById('cvSpinner');
    const evaluationSection = document.getElementById('cvEvaluationSection');
    const optimizedSection = document.getElementById('optimizedCVSection');

    // Hàm đọc nội dung file PDF
    async function readPdfContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const typedarray = new Uint8Array(e.target.result);
                try {
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const numPages = pdf.numPages;
                    let text = '';
                    
                    for(let i = 1; i <= numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(item => item.str).join(' ');
                    }
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    evaluateBtn?.addEventListener('click', async function() {
        const cvFile = document.getElementById('cvFile').files[0];
        const jdText = document.getElementById('hiddenJDText').value;

        if (!cvFile || !jdText) {
            alert('Vui lòng tải lên CV và nhập JD trước');
            return;
        }

        try {
            cvSpinner.style.display = 'inline-block';
            evaluateBtn.disabled = true;

            const cvContent = await readPdfContent(cvFile);
            const data = await window.aiService.evaluateCV(cvContent, jdText);
            
            // Hiển thị kết quả đánh giá
            document.getElementById('matchScore').textContent = data.score;
            
            let detailsHtml = '<div class="evaluation-details">';
            detailsHtml += '<h5>Điểm mạnh:</h5><ul>';
            data.strengths.forEach(strength => {
                detailsHtml += `<li>${strength}</li>`;
            });
            detailsHtml += '</ul><h5>Điểm yếu:</h5><ul>';
            data.weaknesses.forEach(weakness => {
                detailsHtml += `<li>${weakness}</li>`;
            });
            detailsHtml += '</ul><h5>Gợi ý cải thiện:</h5><ul>';
            data.suggestions.forEach(suggestion => {
                detailsHtml += `<li>${suggestion}</li>`;
            });
            detailsHtml += '</ul></div>';
            
            document.getElementById('evaluationDetails').innerHTML = detailsHtml;
            evaluationSection.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            alert('Không thể đánh giá CV. Vui lòng thử lại.');
        } finally {
            cvSpinner.style.display = 'none';
            evaluateBtn.disabled = false;
        }
    });

    generateBtn?.addEventListener('click', async function() {
        const cvFile = document.getElementById('cvFile').files[0];
        const jdText = document.getElementById('hiddenJDText').value;

        if (!cvFile || !jdText) {
            alert('Vui lòng tải lên CV và nhập JD trước');
            return;
        }

        try {
            cvSpinner.style.display = 'inline-block';
            generateBtn.disabled = true;

            const cvContent = await readPdfContent(cvFile);
            const response = await window.aiService.generateOptimizedCV(cvContent, jdText);
            
            document.getElementById('optimizedCVContent').innerHTML = response;
            optimizedSection.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            alert('Không thể tạo CV tối ưu. Vui lòng thử lại.');
        } finally {
            cvSpinner.style.display = 'none';
            generateBtn.disabled = false;
        }
    });
});