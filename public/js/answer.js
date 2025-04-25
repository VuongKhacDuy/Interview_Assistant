// // Xử lý tạo câu trả lời mẫu
// document.getElementById('generateAnswer')?.addEventListener('click', async function() {
//     const generateBtn = document.getElementById('generateAnswer');
//     const spinner = document.getElementById('answerGenSpinner');
    
//     generateBtn.disabled = true;
//     spinner.style.display = 'inline-block';
    
//     try {
//         const jdText = document.getElementById('hiddenJDText').value;
//         const question = document.getElementById('hiddenQuestion').value;
//         const guidance = document.getElementById('guidanceResult').innerText || '';
        
//         // ... existing code ...
//     } catch (error) {
//         console.error('Error:', error);
//     } finally {
//         generateBtn.disabled = false;
//         spinner.style.display = 'none';
//     }
// });