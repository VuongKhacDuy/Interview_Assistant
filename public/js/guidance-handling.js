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

// Add translation handler
document.getElementById('translateGuidance')?.addEventListener('click', async function() {
    const button = this;
    const targetLang = document.getElementById('translateGuidanceLanguage').value;
    const guidanceResult = document.getElementById('guidanceResult');
    const originalContent = JSON.parse(guidanceResult.getAttribute('data-original') || '[]');
    
    const isShowingOriginal = button.innerHTML.includes('Show Original');
    
    if (isShowingOriginal) {
        // Show original content
        const originalHtml = originalContent.map((item) => `
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
        
        guidanceResult.innerHTML = originalHtml;
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
        // Translate each guidance item
        const translationPromises = originalContent.map(async (item) => {
            // Update the translation request
            const response = await fetch('/jd/translate-text', {  // Changed from '/jd/translate-guidance'
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: item.guidance,
                    targetLanguage: targetLang,
                    contentType: 'guidance'  // Add contentType
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                ...item,
                guidance: data.translation
            };
        });
        
        const translatedItems = await Promise.all(translationPromises);
        
        // Update the guidance content with translations
        const translatedHtml = translatedItems.map((item) => `
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
                        ${item.guidance}
                    </div>
                </div>
            </div>
        `).join('');
        
        guidanceResult.innerHTML = translatedHtml;
        button.innerHTML = '<i class="bi bi-translate"></i> Show Original';
        
    } catch (error) {
        console.error('Translation error:', error);
        alert('Failed to translate. Please try again.');
        button.innerHTML = '<i class="bi bi-translate"></i> Translate';
    } finally {
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
        button.disabled = false;
    }
});
