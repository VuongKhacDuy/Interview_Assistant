document.addEventListener('DOMContentLoaded', function() {
    const evaluateBtn = document.getElementById('evaluateCV');
    const generateBtn = document.getElementById('generateOptimizedCV');
    const cvSpinner = document.getElementById('cvSpinner');
    const evaluationSection = document.getElementById('cvEvaluationSection');
    const optimizedSection = document.getElementById('optimizedCVSection');
    const matchScore = document.getElementById('matchScore');
    const evaluationDetails = document.getElementById('evaluationDetails');
    const optimizedCVContent = document.getElementById('optimizedCVContent');
    const downloadOptimizedCV = document.getElementById('downloadOptimizedCV');
    const downloadOptimizedCVDoc = document.getElementById('downloadDocCV');
    const downloadOptimizedCVPDF = document.getElementById('downloadPdfCV');

    async function readPdfContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const typedarray = new Uint8Array(e.target.result);
                try {
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const numPages = pdf.numPages;
                    let text = '';
                    
                    for(let i = 1; i <= numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(item => item.str).join(' ');
                    }
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    let isProcessing = false;

    document.getElementById('evaluateCV').addEventListener('click', async function() {
        if (isProcessing) return;
        isProcessing = true;
        
        const cvFile = document.getElementById('cvFile').files[0];
        const jdText = document.getElementById('jdText').value;
    
        if (!cvFile || !jdText) {
            alert('Vui lòng tải lên CV và nhập JD trước');
            isProcessing = false;
            return;
        }
    
        try {
            cvSpinner.style.display = 'inline-block';
            evaluateBtn.disabled = true;
    
            const cvContent = await readPdfContent(cvFile);
            
            if (!cvContent || cvContent.trim().length === 0) {
                throw new Error('Could not extract text from PDF file. Please ensure the PDF is text-based and not scanned.');
            }

            const response = await fetch('/jd/evaluate-cv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cvContent,
                    jdText
                })
            });

            if (!response.ok) {
                throw new Error('Failed to evaluate CV');
            }

            const result = await response.json();
            
            if (!result || !result.evaluation) {
                throw new Error('Invalid response format from evaluation service');
            }
            matchScore.textContent = result.evaluation.overallScore * 10;
            
            let detailsHtml = `
                <h5>Điểm mạnh:</h5>
                <ul>
                    ${result.evaluation.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
                <h5>Kỹ năng còn thiếu:</h5>
                <ul>
                    ${result.evaluation.missingSkills.map(w => `<li>${w}</li>`).join('')}
                </ul>
                <h5>Đề xuất cải thiện:</h5>
                <ul>
                    ${result.evaluation.improvements.map(s => `<li>${s}</li>`).join('')}
                </ul>
                <h5>Nhận xét chung:</h5>
                <p>${result.evaluation.generalComment}</p>
            `;
            
            evaluationDetails.innerHTML = detailsHtml;
            evaluationSection.style.display = 'block';
    
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'An error occurred while evaluating the CV. ';
            
            if (error.message.includes('PDF')) {
                errorMessage += 'Please ensure your PDF is text-based and not scanned.';
            } else if (error.message.includes('API')) {
                errorMessage += 'Please check your API key and try again.';
            } else if (error.message.includes('format')) {
                errorMessage += 'Received invalid response from the evaluation service.';
            } else {
                errorMessage += 'Please try again later.';
            }
            
            alert(errorMessage);
        } finally {
            cvSpinner.style.display = 'none';
            evaluateBtn.disabled = false;
            isProcessing = false;
        }
    });

    generateBtn?.addEventListener('click', async function() {
        const cvFile = document.getElementById('cvFile').files[0];
        const jdText = document.getElementById('jdText').value;

        if (!cvFile || !jdText) {
            alert('Please upload a CV and enter JD first');
            return;
        }

        try {
            cvSpinner.style.display = 'inline-block';
            generateBtn.disabled = true;

            const cvContent = await readPdfContent(cvFile);
            
            if (!cvContent || cvContent.trim().length === 0) {
                throw new Error('Could not extract text from PDF file. Please ensure the PDF is text-based and not scanned.');
            }

            const response = await fetch('/jd/generate-optimized-cv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cvContent,
                    jdText
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to generate optimized CV (Status: ${response.status})`);
            }

            const result = await response.json();
            
            if (!result || !result.optimizedCV) {
                throw new Error('Invalid response format from optimization service');
            }

            optimizedCVContent.innerHTML = result.optimizedCV;
            optimizedSection.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'Failed to generate optimized CV. ';
            
            if (error.message.includes('PDF')) {
                errorMessage += 'Please ensure your PDF is text-based and not scanned.';
            } else if (error.message.includes('API')) {
                errorMessage += 'Please check your API key and try again.';
            } else if (error.message.includes('format')) {
                errorMessage += 'Received invalid response from the optimization service.';
            } else {
                errorMessage += error.message || 'Please try again later.';
            }
            
            alert(errorMessage);
        } finally {
            cvSpinner.style.display = 'none';
            generateBtn.disabled = false;
            isProcessing = false;
        }
    });

    downloadOptimizedCV?.addEventListener('click', function() {
        const content = optimizedCVContent.innerHTML;
        const blob = new Blob([content], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'optimized_cv.html';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

    downloadOptimizedCVDoc?.addEventListener('click', async function() {
        const content = optimizedCVContent.innerHTML;

        try {
            const response = await fetch('/jd/convert-cv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    html: content,
                    format: 'docx'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to convert CV');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'optimized_cv.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        catch (error) {
            console.error('Error:', error);
            alert('Cannot download CV. Please try again.');
        }
    })

    downloadOptimizedCVPDF?.addEventListener('click', async function() {
        const content = optimizedCVContent.innerHTML;
        
        try {
            const response = await fetch('/jd/convert-cv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    html: content,
                    format: 'pdf'
                })
            });
    
            if (!response.ok) {
                throw new Error('Failed to convert CV');
            }
    
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'optimized_cv.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error:', error);
            alert('Cannot download CV. Please try again.');
        }
    });
});