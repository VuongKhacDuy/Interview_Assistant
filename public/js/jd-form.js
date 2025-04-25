document.addEventListener('DOMContentLoaded', function() {
    const jdForm = document.getElementById('jdForm');
    const submitBtn = document.getElementById('submitJD');
    const spinner = document.getElementById('jdSpinner');
    const jdText = document.getElementById('jdText');
    const pdfFile = document.getElementById('pdfFile');

    if (jdForm) {
        jdForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validation
            if (!jdText.value && !pdfFile.files[0]) {
                showError('Vui lòng nhập JD hoặc tải lên file PDF');
                return;
            }

            // Hiển thị loading
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';
            
            try {
                const formData = new FormData(this);
                console.log('Form data being sent:', Object.fromEntries(formData));

                const response = await fetch('/jd/generate-question', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Server response:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });
                    throw new Error(`Server error (${response.status}): ${errorText}`);
                }

                const data = await response.json();
                console.log('Server response data:', data);

                if (data.error) {
                    console.error('API error:', data.error);
                    throw new Error(data.error);
                }

                // Xử lý kết quả thành công
                if (data.questions && data.questionHtml) {
                    document.getElementById('hiddenJDText').value = data.jdText || '';
                    console.log('Stored JD Text:', data.jdText); // Add this debug line
                    document.getElementById('hiddenQuestions').value = JSON.stringify(data.questions);
                    document.getElementById('generatedQuestion').innerHTML = data.questionHtml;
                    document.getElementById('questionSection').style.display = 'block';
                    document.getElementById('questionSection').scrollIntoView({ behavior: 'smooth' });
                }

            } catch (error) {
                console.error('Full error details:', error);
                showError('Không thể tạo câu hỏi: ' + (error.message || 'Unknown error'));
            } finally {
                // Ẩn loading
                submitBtn.disabled = false;
                spinner.style.display = 'none';
            }
        });
    }

    // Hàm hiển thị thông báo lỗi
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        jdForm.insertBefore(errorDiv, jdForm.firstChild);
        
        // Tự động ẩn sau 5 giây
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
});