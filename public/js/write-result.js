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
            submitButton.disabled = true;
            submitSpinner.classList.remove('d-none');
            submitText.textContent = 'Đang đánh giá...';
            errorAlert.classList.add('d-none');
    
            const response = await fetch('/writing-practice/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: topicData.topic,
                    content,
                    options
                })
            });
    
            if (!response.ok) throw new Error('Không thể kết nối đến server');
            
            const data = await response.json();
            console.log('<>><> Server response:', data);
            if (data.success && data.evaluation) {
                document.getElementById('evaluation').style.display = 'block';
                // Parse và hiển thị kết quả đánh giá
                if (typeof data.evaluation === 'string') {
                    // Nếu evaluation là HTML string
                    document.getElementById('evaluationContent').innerHTML = data.evaluation;
                } else {
                    // Nếu evaluation là object, hiển thị lỗi
                    console.error('Invalid evaluation format:', data.evaluation);
                    throw new Error('Định dạng đánh giá không hợp lệ');
                }
            } else {
                throw new Error('Không nhận được kết quả đánh giá từ server');
            }
        } catch (error) {
            console.error('Error:', error);
            errorMessage.textContent = '1111 Không thể đánh giá bài viết. Vui lòng thử lại sau.';
            errorAlert.classList.remove('d-none');
            
            // Cho phép người dùng tiếp tục chỉnh sửa
            writingContent.disabled = false;
            isStarted = true;
        } finally {
            // Reset trạng thái nút submit
            submitButton.disabled = false;
            submitSpinner.classList.add('d-none');
            submitText.textContent = 'Nộp bài';
        }
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