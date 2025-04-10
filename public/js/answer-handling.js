document.getElementById('submitAnswer')?.addEventListener('click', async function() {
    const jdText = document.getElementById('hiddenJDText').value;
    const questionsData = document.getElementById('hiddenQuestions').value;
    const editor = ace.edit('editor');
    const answer = editor.getValue();
    
    const submitBtn = document.getElementById('submitAnswer');
    const spinner = document.getElementById('submitSpinner');

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
        // Show loading state
        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';

        const parsedQuestions = JSON.parse(questionsData);
        const currentQuestion = parsedQuestions.questions[0].question; // Get first question for now

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

        // Create evaluation result section if it doesn't exist
        let evaluationSection = document.getElementById('evaluationSection');
        if (!evaluationSection) {
            evaluationSection = document.createElement('div');
            evaluationSection.id = 'evaluationSection';
            evaluationSection.className = 'mt-4';
            document.getElementById('answerSection').appendChild(evaluationSection);
        }

        // Display evaluation results
        const evaluationSection = document.getElementById('evaluationSection');
        const evaluationContent = evaluationSection.querySelector('.evaluation-content');
        
        // Update content and show the section
        evaluationContent.innerHTML = data.html;
        evaluationSection.style.display = 'block';
        
        // Smooth scroll to evaluation
        evaluationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to evaluate answer. Please try again.');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
    }
});