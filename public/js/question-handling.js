document.getElementById('jdForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitJD');
    const spinner = document.getElementById('jdSpinner');
    
    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    
    try {
        const formData = new FormData(this);
        
        // Create a timeout promise that rejects after 60 seconds
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 60000)
        );

        // Create the fetch promise
        const fetchPromise = fetch(this.action, {
            method: 'POST',
            body: formData
        });

        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeout]);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }
        
        // Save JD text and questions to hidden fields
        document.getElementById('hiddenJDText').value = data.jdText;
        // When storing questions
        hiddenQuestions.value = JSON.stringify(data.questions);
        
        // Format and display questions
        const questionsHtml = data.questions.questions.map((q, index) => `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Question ${index + 1}</h5>
                    <p class="card-text">${q.question}</p>
                </div>
            </div>
        `).join('');
        
        document.getElementById('generatedQuestion').innerHTML = questionsHtml;
        document.getElementById('questionSection').style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        // Only show alert for timeout
        if (error.message === 'Request timeout') {
            alert('Không thể lấy được câu hỏi. Vui lòng thử lại.');
        }
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
    }
});

// Add specific question handling
// Add state management for translation
let isTranslated = false;
const translateBtn = document.getElementById('translateSpecificAnswer');

// Update the specific answer handling
document.getElementById('getSpecificAnswer')?.addEventListener('click', async function() {
    const specificQuestion = document.getElementById('specificQuestion').value;
    const jdText = document.getElementById('hiddenJDText').value;
    
    if (!specificQuestion || !jdText) {
        alert('Please enter a question and ensure JD is loaded');
        return;
    }

    const button = this;
    const spinner = document.getElementById('specificAnswerSpinner');
    const answerSection = document.getElementById('specificAnswerSection');
    const questionDisplay = document.getElementById('specificQuestionDisplay');
    const answerResult = document.getElementById('specificAnswerResult');

    button.disabled = true;
    spinner.style.display = 'inline-block';

    try {
        const response = await fetch('/jd/answer-specific', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jdText,
                question: specificQuestion
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Reset translation state for new answer
        isTranslated = false;
        translateBtn.innerHTML = '<i class="bi bi-translate"></i> Translate';
        
        // Display the results
        questionDisplay.textContent = specificQuestion;
        answerResult.innerHTML = data.answer;
        // Store the original answer for translation
        answerResult.setAttribute('data-original', data.answer);
        answerSection.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to get answer. Please try again.');
    } finally {
        button.disabled = false;
        spinner.style.display = 'none';
    }
});

// Add handler for "Use This Answer" button
document.getElementById('useSpecificAnswer')?.addEventListener('click', function() {
    const answerResult = document.getElementById('specificAnswerResult').innerHTML;
    const editor = ace.edit('editor');
    editor.setValue(answerResult);
    editor.clearSelection();
});

// Handle translation for specific answer
document.getElementById('translateSpecificAnswer')?.addEventListener('click', async function() {
    const button = this;
    const targetLang = document.getElementById('translateSpecificAnswerLanguage').value;
    const answerResult = document.getElementById('specificAnswerResult');
    const originalContent = answerResult.getAttribute('data-original') || answerResult.innerHTML;
    
    const isShowingOriginal = button.innerHTML.includes('Show Original');
    
    if (isShowingOriginal) {
        // Show original content
        answerResult.innerHTML = originalContent;
        button.innerHTML = '<i class="bi bi-translate"></i> Translate';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
        return;
    }
    
    // Change button style to loading state
    button.classList.remove('btn-outline-primary');
    button.classList.add('btn-primary');
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span> Translating...';
    button.disabled = true;
    
    try {
        const response = await fetch('/jd/translate-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: originalContent,
                targetLanguage: targetLang,
                contentType: 'answer'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!answerResult.getAttribute('data-original')) {
            answerResult.setAttribute('data-original', originalContent);
        }
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        answerResult.innerHTML = data.translation;
        button.innerHTML = '<i class="bi bi-translate"></i> Show Original';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
        
    } catch (error) {
        console.error('Translation error:', error);
        alert('Failed to translate. Please try again.');
        button.innerHTML = '<i class="bi bi-translate"></i> Translate';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
    } finally {
        button.disabled = false;
    }
});

// Handle "Use This Answer" button
document.getElementById('useSpecificAnswer')?.addEventListener('click', function() {
    const answerResult = document.getElementById('specificAnswerResult');
    const editor = ace.edit('editor');
    
    // Get current content from the answer result
    const content = answerResult.innerHTML;
    
    // Set the content to the main editor
    editor.setValue(content);
    editor.clearSelection();
    
    // Scroll to the answer section
    document.getElementById('answerSection').scrollIntoView({ behavior: 'smooth' });
});

document.addEventListener('DOMContentLoaded', function() {
    const questionSection = document.getElementById('questionSection');
    const generatedQuestion = document.getElementById('generatedQuestion');
    const hiddenJDText = document.getElementById('hiddenJDText');
    const hiddenQuestions = document.getElementById('hiddenQuestions');

    // Function to handle successful question generation
    window.handleQuestionGenerated = function(data) {
        if (data.questions && data.questionHtml) {
            // Store the JD text and questions for later use
            const hiddenJDText = document.getElementById('hiddenJDText');
            if (hiddenJDText) {
                hiddenJDText.value = data.jdText || '';
                console.log('JD Text stored:', hiddenJDText.value);
            } else {
                console.error('Hidden JD Text field not found');
            }
            hiddenQuestions.value = JSON.stringify(data.questions);

            // Display the questions
            generatedQuestion.innerHTML = data.questionHtml;
            questionSection.style.display = 'block';

            // Scroll to question section
            questionSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.error('Invalid question data received');
            alert('Failed to generate questions. Please try again.');
        }
    };
});