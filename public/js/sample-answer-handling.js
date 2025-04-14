document.addEventListener('DOMContentLoaded', function() {
    let originalAnswers = new Map();

    // Existing generate answer event listener
    document.getElementById('generateAnswer')?.addEventListener('click', async function() {
        const jdText = document.getElementById('hiddenJDText').value;
        const questionsData = document.getElementById('hiddenQuestions').value;
        
        const spinner = document.getElementById('answerGenSpinner');
        const sampleAnswerSection = document.getElementById('sampleAnswerSection');
        const answersAccordion = document.getElementById('answersAccordion');
        const generateAnswerBtn = document.getElementById('generateAnswer');
    
        if (!jdText?.trim()) {
            alert('Please input a Job Description (JD) first');
            return;
        }
    
        if (!questionsData) {
            alert('Please generate questions first');
            return;
        }
    
        try {
            spinner.style.display = 'inline-block';
            generateAnswerBtn.disabled = true;
    
            const parsedQuestions = JSON.parse(questionsData);
            
            const response = await fetch('/jd/generate-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jdText: jdText,
                    questions: parsedQuestions.questions
                })
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
    
            answersAccordion.innerHTML = data.answers.map((item, index) => `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" 
                                onclick="toggleAnswer('collapse${item.id}', this)"
                                aria-expanded="false"
                                aria-controls="collapse${item.id}">
                            Question ${index + 1}: ${item.question}
                        </button>
                    </h2>
                    <div id="collapse${item.id}" class="accordion-collapse collapse" 
                         data-bs-parent="#answersAccordion">
                        <div class="accordion-body">
                            <div id="answer-${item.id}" class="answer-content">${item.answer}</div>
                        </div>
                    </div>
                </div>
            `).join('');
    
            // Add toggle function if it doesn't exist
            if (!window.toggleAnswer) {
                window.toggleAnswer = function(targetId, button) {
                    const target = document.getElementById(targetId);
                    const isExpanded = button.getAttribute('aria-expanded') === 'true';
                    
                    // Toggle current item
                    button.setAttribute('aria-expanded', !isExpanded);
                    button.classList.toggle('collapsed', isExpanded);
                    target.classList.toggle('show', !isExpanded);

                    // Close other items
                    const accordion = document.getElementById('answersAccordion');
                    const otherButtons = accordion.querySelectorAll('.accordion-button');
                    otherButtons.forEach(otherBtn => {
                        if (otherBtn !== button && otherBtn.getAttribute('aria-expanded') === 'true') {
                            const otherId = otherBtn.getAttribute('aria-controls');
                            const otherCollapse = document.getElementById(otherId);
                            otherBtn.setAttribute('aria-expanded', 'false');
                            otherBtn.classList.add('collapsed');
                            otherCollapse.classList.remove('show');
                        }
                    });
                };
            }

            sampleAnswerSection.style.display = 'block';
    
        } catch (error) {
            console.error('Error:', error);
            if (error.status === 429 || error.status ===400) {
                alert('Too many requests. Please try again after a minute.');
            } else {
                alert('Failed to generate sample answers. Please try again.'); 
            }
        } finally {
            spinner.style.display = 'none';
            generateAnswerBtn.disabled = false;
        }
    });

    // Add translation event listener
    document.getElementById('translateSampleAnswer')?.addEventListener('click', async function() {
        const targetLang = document.getElementById('sampleAnswerLanguage').value;
        const answerElements = document.querySelectorAll('.answer-content');
        const spinner = document.getElementById('translateAnswerSpinner');
        const translateBtn = this;
        
        if (answerElements.length === 0) {
            alert('No sample answers to translate');
            return;
        }

        try {
            spinner.style.display = 'inline-block';
            translateBtn.disabled = true;

            // If showing translated version, revert to original
            if (translateBtn.classList.contains('btn-primary')) {
                answerElements.forEach(element => {
                    const originalContent = originalAnswers.get(element.id);
                    if (originalContent) {
                        element.innerHTML = originalContent;
                    }
                });
                translateBtn.innerHTML = '<i class="bi bi-translate"></i> Dịch câu trả lời';
                translateBtn.classList.remove('btn-primary');
                translateBtn.classList.add('btn-outline-primary');
                return;
            }

            // Translate each answer
            for (const element of answerElements) {
                const currentText = element.innerHTML;
                
                // Store original content if not already stored
                if (!originalAnswers.has(element.id)) {
                    originalAnswers.set(element.id, currentText);
                }

                const response = await fetch('/jd/translate-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: currentText,
                        targetLanguage: targetLang,
                        contentType: 'answer'
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

                element.innerHTML = cleanTranslation;
            }

            translateBtn.innerHTML = '<i class="bi bi-translate"></i> Xem bản gốc';
            translateBtn.classList.remove('btn-outline-primary');
            translateBtn.classList.add('btn-primary');

        } catch (error) {
            console.error('Translation error:', error);
            alert('Failed to translate. Please try again.');
        } finally {
            spinner.style.display = 'none';
            translateBtn.disabled = false;
        }
    });
});