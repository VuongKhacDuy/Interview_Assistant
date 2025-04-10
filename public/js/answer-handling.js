document.getElementById('submitAnswer')?.addEventListener('click', async function() {
    const jdText = document.getElementById('hiddenJDText').value;
    const questionsData = document.getElementById('hiddenQuestions').value;
    const editor = ace.edit('editor');
    const answer = editor.getValue();
    
    const submitBtn = document.getElementById('submitAnswer');
    const spinner = document.getElementById('submitSpinner');
    const evaluationSection = document.getElementById('evaluationSection');
    const evaluationContent = document.querySelector('.evaluation-content');

    if (!jdText?.trim()) {
        alert('Please input a Job Description (JD) first');
        return;
    }

    if (!questionsData) {
        alert('Please generate questions first');
        return;
    }

    if (!answer?.trim()) {
        alert('Please provide an answer');
        return;
    }

    try {
        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';

        const parsedQuestions = JSON.parse(questionsData);
        const currentQuestion = parsedQuestions.questions[0].question;

        const response = await fetch('/jd/evaluate-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jdText: jdText,
                question: currentQuestion,
                answer: answer
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        // Display evaluation results
        evaluationContent.innerHTML = data.evaluation.html;
        evaluationSection.style.display = 'block';
        evaluationSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to evaluate answer. Please try again.');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
    }
});