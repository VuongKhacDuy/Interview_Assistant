document.addEventListener('DOMContentLoaded', function() {
    const jdForm = document.getElementById('jdForm');
    const submitBtn = document.getElementById('submitJD');
    const spinner = document.getElementById('jdSpinner');

    let isSubmitting = false;

    jdForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;

        try {
            submitBtn.disabled = true;
            spinner.style.display = 'inline-block';

            const formData = new FormData(this);
            const response = await fetch('/jd/generate-question', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit error
                    alert(data.error || 'Vui lòng đợi giây lát trước khi thử lại.');
                    return;
                }
                throw new Error(data.error || 'Server error');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            // Handle successful response
            if (data.questions && data.questionHtml) {
                document.getElementById('hiddenJDText').value = data.jdText || '';
                console.log('Stored JD Text:', data.jdText); // Add this debug line
                document.getElementById('hiddenQuestions').value = JSON.stringify(data.questions);
                document.getElementById('generatedQuestion').innerHTML = data.questionHtml;
                document.getElementById('questionSection').style.display = 'block';
                document.getElementById('questionSection').scrollIntoView({ behavior: 'smooth' });
            }

        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Failed to generate questions. Please try again.');
        } finally {
            submitBtn.disabled = false;
            spinner.style.display = 'none';
            isSubmitting = false;
        }
    });
});