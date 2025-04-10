// Remove the import statement
// import { marked } from 'marked';

document.addEventListener('DOMContentLoaded', function() {
    const guidanceBtn = document.getElementById('getGuidance');
    const spinner = document.getElementById('guidanceSpinner');
    const guidanceSection = document.getElementById('guidanceSection');
    const guidanceResult = document.getElementById('guidanceResult');

    guidanceBtn?.addEventListener('click', async function() {
        const jdText = document.getElementById('hiddenJDText').value;
        const questionsData = document.getElementById('hiddenQuestions').value;

        if (!jdText || !questionsData) {
            alert('Please generate questions first');
            return;
        }

        try {
            spinner.style.display = 'inline-block';
            guidanceBtn.disabled = true;

            const parsedQuestions = JSON.parse(questionsData);
            
            const response = await fetch('/jd/generate-guidance', {
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

            // Remove the custom click handler
            // guidanceResult.addEventListener('click', function(e) {
            //     if (e.target.classList.contains('accordion-button')) {
            //         const isExpanded = e.target.getAttribute('aria-expanded') === 'true';
            //         e.target.setAttribute('aria-expanded', !isExpanded);
            //     }
            // });
            
            // Create accordion items for each question's guidance
            const accordionHtml = data.guidance.map((item, index) => `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" 
                                onclick="toggleGuidance('guidance${item.id}')"
                                aria-expanded="false">
                            Question ${item.id}: ${item.question}
                        </button>
                    </h2>
                    <div id="guidance${item.id}" class="accordion-collapse collapse">
                        <div class="accordion-body">
                            ${marked.parse(item.guidance)}
                        </div>
                    </div>
                </div>
            `).join('');

            guidanceResult.innerHTML = accordionHtml;
            guidanceSection.style.display = 'block';

            // Add toggle function to window scope
            window.toggleGuidance = function(id) {
                const element = document.getElementById(id);
                const button = element.previousElementSibling.querySelector('.accordion-button');
                
                if (element.classList.contains('show')) {
                    element.classList.remove('show');
                    button.classList.add('collapsed');
                    button.setAttribute('aria-expanded', 'false');
                } else {
                    element.classList.add('show');
                    button.classList.remove('collapsed');
                    button.setAttribute('aria-expanded', 'true');
                }
            };

            // Save original content for translation
            guidanceResult.setAttribute('data-original', JSON.stringify(data.guidance));

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to get guidance. Please try again.');
        } finally {
            spinner.style.display = 'none';
            guidanceBtn.disabled = false;
        }
    });
});