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
                <h2 class="accordion-header" id="heading${item.id}">
                    <button class="accordion-button collapsed" type="button" 
                            data-bs-toggle="collapse"
                            data-bs-target="#collapse${item.id}"
                            aria-expanded="false"
                            aria-controls="collapse${item.id}">
                        Question ${index + 1}: ${item.question}
                    </button>
                </h2>
                <div id="collapse${item.id}" class="accordion-collapse collapse" 
                     aria-labelledby="heading${item.id}"
                     data-bs-parent="#answersAccordion">
                    <div class="accordion-body">
                        ${item.answer}
                    </div>
                </div>
            </div>
        `).join('');

        // Remove the initialization code that was causing issues
        sampleAnswerSection.style.display = 'block';

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate sample answers. Please try again.');
    } finally {
        spinner.style.display = 'none';
        generateAnswerBtn.disabled = false;
    }
});