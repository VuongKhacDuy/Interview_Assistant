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

        const response = await rateLimiter.enqueue(async () => {
            return fetch('/jd/evaluate-answer', {
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

// In your translation click handler
document.getElementById('translateEvaluation')?.addEventListener('click', async function() {
    const translateBtn = this;
    const spinner = translateBtn.querySelector('.spinner-border');
    const translatedContent = document.querySelector('.translated-content');
    const translatedText = document.querySelector('.translated-text');
    const originalContent = document.querySelector('.evaluation-content');
    const targetLang = document.getElementById('translateEvaluationLanguage').value;

    try {
        spinner.style.display = 'inline-block';
        translateBtn.disabled = true;

        // Extract content sections
        const sections = {
            score: originalContent.querySelector('h4')?.textContent || '',
            relevance: originalContent.querySelector('p:first-of-type')?.textContent || '',
            strengths: Array.from(originalContent.querySelectorAll('h5')).find(h => h.textContent.includes('Strengths'))?.nextElementSibling?.querySelectorAll('li') || [],
            weaknesses: Array.from(originalContent.querySelectorAll('h5')).find(h => h.textContent.includes('Areas for Improvement'))?.nextElementSibling?.querySelectorAll('li') || [],
            detailedScores: originalContent.querySelector('.detailed-scores')?.querySelectorAll('p') || [],
            suggestions: Array.from(originalContent.querySelectorAll('h5')).find(h => h.textContent.includes('Suggestions'))?.nextElementSibling?.querySelectorAll('li') || [],
            overall: originalContent.querySelector('p:last-child')?.textContent || ''
        };

        // Combine all text for a single translation
        const combinedText = `${sections.score}\n---SPLIT---\n${sections.relevance}\n---SPLIT---\n` +
            Array.from(sections.strengths).map(li => li.textContent).join('\n') + '\n---SPLIT---\n' +
            Array.from(sections.weaknesses).map(li => li.textContent).join('\n') + '\n---SPLIT---\n' +
            Array.from(sections.detailedScores).map(p => p.textContent).join('\n') + '\n---SPLIT---\n' +
            Array.from(sections.suggestions).map(li => li.textContent).join('\n') + '\n---SPLIT---\n' +
            sections.overall;

        // Single translation request
        const translatedResult = await translateText(combinedText, targetLang);
        const translatedParts = translatedResult.split('---SPLIT---').map(part => part.trim());

        // Rebuild HTML with translated content
        translatedText.innerHTML = `
            <div class="evaluation-result" style="color: black !important">
                <h4 style="color: black !important">${translatedParts[0]}</h4>
                <p style="color: black !important">${translatedParts[1]}</p>
                
                <h5 style="color: black !important">Strengths:</h5>
                <ul style="color: black !important">
                    ${translatedParts[2].split('\n').filter(s => s).map(s => `<li style="color: black !important">${s}</li>`).join('')}
                </ul>
                
                <h5 style="color: black !important">Areas for Improvement:</h5>
                <ul style="color: black !important">
                    ${translatedParts[3].split('\n').filter(w => w).map(w => `<li style="color: black !important">${w}</li>`).join('')}
                </ul>
                
                <h5 style="color: black !important">Detailed Feedback:</h5>
                <div class="detailed-scores" style="color: black !important">
                    ${translatedParts[4].split('\n').filter(d => d).map(d => `<p style="color: black !important">${d}</p>`).join('')}
                </div>
                
                <h5 style="color: black !important">Suggestions for Improvement:</h5>
                <ul style="color: black !important">
                    ${translatedParts[5].split('\n').filter(s => s).map(s => `<li style="color: black !important">${s}</li>`).join('')}
                </ul>
                
                <p style="color: black !important">${translatedParts[6]}</p>
            </div>
        `;
        translatedContent.style.display = 'block';

    } catch (error) {
        console.error('Translation error:', error);
        alert('Failed to translate. Please try again later.');
    } finally {
        spinner.style.display = 'none';
        translateBtn.disabled = false;
    }
});

// Update rate limiter configuration
const rateLimiter = {
    queue: [],
    processing: false,
    delay: 3000, // Increased to 3 seconds
    maxRetries: 3,
    
    async process() {
        if (this.processing || this.queue.length === 0) return;
        
        this.processing = true;
        while (this.queue.length > 0) {
            const { fn, resolve, reject, retryCount = 0 } = this.queue.shift();
            try {
                const result = await fn();
                resolve(result);
                await new Promise(r => setTimeout(r, this.delay));
            } catch (error) {
                if (error.status === 429 && retryCount < this.maxRetries) {
                    const retryDelay = this.extractRetryDelay(error) || 45000; // Default 45s retry delay
                    console.log(`Rate limited. Waiting ${retryDelay/1000}s before retry...`);
                    await new Promise(r => setTimeout(r, retryDelay));
                    this.queue.unshift({ fn, resolve, reject, retryCount: retryCount + 1 });
                } else {
                    reject(error);
                }
            }
        }
        this.processing = false;
    },

    extractRetryDelay(error) {
        try {
            const retryInfo = error.errorDetails?.find(d => d['@type'].includes('RetryInfo'));
            if (retryInfo?.retryDelay) {
                return parseInt(retryInfo.retryDelay.replace('s', '')) * 1000;
            }
        } catch (e) {
            console.warn('Failed to extract retry delay:', e);
        }
        return null;
    },

    async enqueue(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }
};

// Modify the translateText helper function
async function translateText(text, targetLang) {
    return rateLimiter.enqueue(async () => {
        const response = await fetch('/jd/translate-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                targetLanguage: targetLang,
                contentType: 'evaluation'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data.translation;
    });
}