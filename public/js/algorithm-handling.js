document.getElementById('algorithmForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('solveBtn');
    const spinner = document.getElementById('solveSpinner');
    const problemInput = document.getElementById('problemInput').value;
    const programmingLanguage = document.getElementById('programmingLanguage').value;
    
    if (!problemInput.trim()) {
        alert('Vui lòng nhập đề bài hoặc link');
        return;
    }
    
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const response = await fetch('/algorithm/solve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                problem: problemInput,
                language: programmingLanguage
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Hiển thị kết quả
        document.getElementById('solutionContent').innerHTML = data.solution;
        document.getElementById('solutionSection').style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Không thể giải quyết bài toán. Vui lòng thử lại.');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
    }
});