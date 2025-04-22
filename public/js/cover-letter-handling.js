document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateCoverLetter');
    const translateBtn = document.getElementById('translateCoverLetter');
    const resultSection = document.getElementById('coverLetterResult');
    const contentDiv = document.querySelector('.cover-letter-content');

    generateBtn?.addEventListener('click', async function() {
        const form = document.getElementById('coverLetterInfoForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const jdText = document.getElementById('jdText').value;
        if (!jdText) {
            alert('Vui lòng nhập JD trước');
            return;
        }

        const userInfo = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            recipientName: document.getElementById('recipientName').value.trim() || 'Hiring Manager'
        };

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Generating...';

        try {
            const response = await fetch('/jd/generate-cover-letter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ jdText, userInfo })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            contentDiv.innerHTML = data.coverLetter;
            resultSection.style.display = 'block';
            translateBtn.style.display = 'inline-block';
            
            // Lưu nội dung gốc để dùng cho việc dịch
            contentDiv.setAttribute('data-original', data.coverLetter);

        } catch (error) {
            console.error('Error:', error);
            alert('Cover letter could not be created. Please try again.');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-file-text"></i> Generate Cover Letter';
        }
    });
});