document.addEventListener('DOMContentLoaded', () => {
    const topicData = JSON.parse(sessionStorage.getItem('writingTopic'));
    const options = JSON.parse(sessionStorage.getItem('writingOptions'));
    let timer;
    let timeLeft;
    const writingContent = document.getElementById('writingContent');
    const startButton = document.getElementById('startWriting');
    const timeStatus = document.getElementById('timeStatus');
    const timeLeftElement = document.getElementById('timeLeft');

    if (!topicData) {
        window.location.href = '/writing';
        return;
    }

    function initializeTopicData() {
        document.getElementById('topic').textContent = topicData.topic;
        
        topicData.requirements.forEach(req => {
            const li = document.createElement('li');
            li.textContent = req;
            document.getElementById('requirements').appendChild(li);
        });

        topicData.keywords.forEach(keyword => {
            const li = document.createElement('li');
            li.textContent = keyword;
            document.getElementById('keywords').appendChild(li);
        });

        topicData.tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            document.getElementById('tips').appendChild(li);
        });
    }

    // Khởi tạo biến để kiểm tra trạng thái bài thi
    let isStarted = false;

    // Thêm xử lý đếm từ
    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // Cập nhật số từ khi người dùng nhập
    writingContent.addEventListener('input', () => {
        if (!isStarted) return;
        const words = countWords(writingContent.value);
        document.getElementById('wordCount').textContent = `Số từ: ${words}/${options.wordCount} từ yêu cầu`;
    });

    function startExam() {
        console.log('Starting exam...'); // Debug log
        if (isStarted) return;
        
        try {
            isStarted = true;
            console.log('Enabling textarea...'); // Debug log

            // Kích hoạt textarea
            writingContent.removeAttribute('disabled');
            writingContent.focus();
            writingContent.placeholder = "Bắt đầu viết bài của bạn...";
            
            // Ẩn nút bắt đầu
            startButton.style.display = 'none';
            
            // Hiển thị thời gian bắt đầu
            const startTime = new Date();
            timeStatus.textContent = `Bắt đầu lúc: ${startTime.toLocaleTimeString()}`;
            
            // Khởi động đếm ngược
            timeLeft = parseInt(options.timeLimit) * 60;
            document.getElementById('wordCount').textContent = `Số từ: 0/${options.wordCount} từ yêu cầu`;
            
            startTimer();
        } catch (error) {
            console.error('Error starting exam:', error);
        }
    }

    function startTimer() {
        timer = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timeLeftElement.textContent = 
                `Thời gian còn lại: ${minutes} phút ${seconds.toString().padStart(2, '0')} giây`;

            // Thêm cảnh báo khi gần hết giờ
            if (timeLeft <= 300) {
                timeLeftElement.style.color = 'red';
                if (timeLeft % 60 === 0) {
                    alert(`Còn ${minutes} phút!`);
                }
            }

            if (timeLeft <= 0) {
                clearInterval(timer);
                writingContent.disabled = true;
                timeLeftElement.textContent = 'Hết giờ!';
                isStarted = false;
                submitWriting();
            }
        }, 1000);
    }

    async function submitWriting() {
        const submitButton = document.getElementById('submitWriting');
        const submitSpinner = document.getElementById('submitSpinner');
        const submitText = document.getElementById('submitText');
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        const content = document.getElementById('writingContent').value;
    
        try {
            // Disable UI elements
            submitButton.disabled = true;
            submitSpinner.classList.remove('d-none');
            submitText.textContent = 'Đang đánh giá...';
            errorAlert.classList.add('d-none');
            writingContent.disabled = true;
    
            const response = await fetch('/writing-practice/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topicData.topic, content, options })
            });
    
            const data = await response.json();
            console.log('Server response:', data); // Log để debug
    
            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}`);
            }
    
            if (!data.success || !data.evaluation) {
                throw new Error(data.error || 'Không nhận được kết quả đánh giá từ server');
            }
    
            // Ẩn thông báo lỗi
            errorAlert.classList.add('d-none');
    
            // Kiểm tra và cập nhật an toàn
            const evaluation = data.evaluation;
            const evaluationDiv = document.getElementById('evaluation');
            if (evaluationDiv) {
                evaluationDiv.style.display = 'none';
            }
    
            evaluationDiv.style.display = 'block';
    
            // Hàm cập nhật an toàn
            const safeUpdateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            };
            
            // Cập nhật điểm số và nhận xét
            safeUpdateElement('overallScore', evaluation.overallScore || 0);
            updateScoreChart(evaluation.overallScore || 0);
    
            if (evaluation.taskAchievement) {
                safeUpdateElement('taskScore', evaluation.taskAchievement.score || 0);
                safeUpdateElement('taskComments', evaluation.taskAchievement.comments || '');
            }
    
            if (evaluation.coherenceAndCohesion) {
                safeUpdateElement('coherenceScore', evaluation.coherenceAndCohesion.score || 0);
                safeUpdateElement('coherenceComments', evaluation.coherenceAndCohesion.comments || '');
            }
    
            if (evaluation.lexicalResource) {
                safeUpdateElement('lexicalScore', evaluation.lexicalResource.score || 0);
                safeUpdateElement('lexicalComments', evaluation.lexicalResource.comments || '');
            }
    
            if (evaluation.grammaticalAccuracy) {
                safeUpdateElement('grammarScore', evaluation.grammaticalAccuracy.score || 0);
                safeUpdateElement('grammarComments', evaluation.grammaticalAccuracy.comments || '');
            }
    
            // Cập nhật danh sách an toàn
            const safeUpdateList = (elementId, items = []) => {
                const list = document.getElementById(elementId);
                if (list) {
                    list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
                }
            };
    
            safeUpdateList('strengthsList', evaluation.strengths);
            safeUpdateList('weaknessesList', evaluation.weaknesses);
            safeUpdateList('suggestionsList', evaluation.suggestions);
    
            safeUpdateElement('wordCountResult', evaluation.wordCount || 0);
            safeUpdateElement('detailedFeedback', evaluation.detailedFeedback || '');
    
            // Lưu kết quả
            sessionStorage.setItem('writingResult', JSON.stringify(evaluation));
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('evaluation').style.display = 'none';
            errorMessage.textContent = error.message || 'Không thể đánh giá bài viết. Vui lòng thử lại sau.';
            errorAlert.classList.remove('d-none');
            writingContent.disabled = false;
            isStarted = true;
        } finally {
            submitButton.disabled = false;
            submitSpinner.classList.add('d-none');
            submitText.textContent = 'Nộp bài';
        }
    }

    // Hàm hỗ trợ cập nhật danh sách
    function updateList(elementId, items) {
        const list = document.getElementById(elementId);
        list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    }

    // Event Listeners
    startButton.addEventListener('click', startExam);
    document.getElementById('submitWriting').addEventListener('click', () => {
        if (!isStarted) {
            alert('Vui lòng bắt đầu làm bài trước khi nộp!');
            return;
        }
        
        const words = countWords(writingContent.value);
        if (words < options.wordCount) {
            if (!confirm(`Bài viết của bạn chỉ có ${words}/${options.wordCount} từ. Bạn có chắc chắn muốn nộp bài?`)) {
                return;
            }
        }

        clearInterval(timer);
        writingContent.disabled = true;
        isStarted = false;
        submitWriting();
    });

    // Initialize the page
    initializeTopicData();
});

let scoreChart = null;

function updateScoreChart(score) {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    
    // Hủy biểu đồ cũ nếu tồn tại
    if (scoreChart) {
        scoreChart.destroy();
    }
    
    scoreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 9 - score],
                backgroundColor: [
                    '#4CAF50',  // Màu cho phần điểm đạt được
                    '#f0f0f0'   // Màu cho phần còn lại
                ],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
}