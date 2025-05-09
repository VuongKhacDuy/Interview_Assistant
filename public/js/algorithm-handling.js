document.getElementById('algorithmForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('solveBtn');
    const spinner = document.getElementById('solveSpinner');
    const problemInput = document.getElementById('problemInput').value;
    const programmingLanguage = document.getElementById('programmingLanguage').value;
    const outputLanguage = document.getElementById('outputLanguage').value;
    
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
                language: programmingLanguage,
                outputLanguage: outputLanguage
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

document.getElementById('submitNewSolution')?.addEventListener('click', async function() {
    const submitBtn = this;
    const spinner = document.getElementById('newSolutionSpinner');
    const newSolution = document.getElementById('newSolution').value;
    const problemInput = document.getElementById('problemInput').value;
    const programmingLanguage = document.getElementById('programmingLanguage').value;
    const outputLanguage = document.getElementById('outputLanguage').value;
    
    if (!newSolution.trim()) {
        alert('Vui lòng nhập giải pháp của bạn');
        return;
    }
    
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    
    try {
        const response = await fetch('/algorithm/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                problem: problemInput,
                language: programmingLanguage,
                outputLanguage: outputLanguage,
                alternativeSolution: newSolution
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Thêm phân tích vào nội dung hiện tại
        document.getElementById('solutionContent').innerHTML += 
            '<hr><h4>Phân Tích Giải Pháp Mới</h4>' + data.analysis;
        
    } catch (error) {
        console.error('Error:', error);
        alert('Không thể phân tích giải pháp. Vui lòng thử lại.');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
    }
});