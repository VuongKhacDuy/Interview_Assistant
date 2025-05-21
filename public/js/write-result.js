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

    let isStarted = false;

    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    writingContent.addEventListener('input', () => {
        if (!isStarted) return;
        const words = countWords(writingContent.value);
        document.getElementById('wordCount').textContent = `Số từ: ${words}/${options.wordCount} từ yêu cầu`;
    });

    function startExam() {
        if (isStarted) return;
        
        try {
            isStarted = true;

            writingContent.removeAttribute('disabled');
            writingContent.focus();
            writingContent.placeholder = "Bắt đầu viết bài của bạn...";

            startButton.style.display = 'none';
            const startTime = new Date();
            timeStatus.textContent = `Bắt đầu lúc: ${startTime.toLocaleTimeString()}`;
            
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
    
            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}`);
            }
    
            if (!data.success || !data.evaluation) {
                throw new Error(data.error || 'Không nhận được kết quả đánh giá từ server');
            }
    
            errorAlert.classList.add('d-none');
    
            const evaluation = data.evaluation;
            const evaluationDiv = document.getElementById('evaluation');
            if (evaluationDiv) {
                evaluationDiv.style.display = 'none';
            }
    
            evaluationDiv.style.display = 'block';
    
            const safeUpdateElement = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            };
            
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
    
            const safeUpdateList = (elementId, items = []) => {
                const list = document.getElementById(elementId);
                if (list) {
                    // Kiểm tra nếu items là mảng các object
                    if (items && items.length > 0 && typeof items[0] === 'object') {
                        // Xử lý mảng object
                        list.innerHTML = items.map(item => `<li>${JSON.stringify(item)}</li>`).join('') || '';
                    } else {
                        // Xử lý mảng string thông thường
                        list.innerHTML = items && items.length > 0 
                            ? items.map(item => `<li>${item}</li>`).join('')
                            : '<li></li>';
                    }
                }
            };

            safeUpdateList('strengthsList', evaluation.strengths);
            safeUpdateList('weaknessesList', evaluation.weaknesses);
            safeUpdateList('suggestionsList', evaluation.suggestions);
            safeUpdateList('improveWordsList', evaluation.suggestedImproveWords);
            safeUpdateList('improveSentencesList', evaluation.suggestedImproveSentences);
            safeUpdateList('synonymsList', evaluation.suggestedSymnonyms);
            safeUpdateList('antonymsList', evaluation.suggestedAntonyms);
            safeUpdateList('wayToFixWrongSentencesList', evaluation.wayToFixWrongSentences);
            safeUpdateList('explanationsWrongSentencesList', evaluation.explanationsWrongSentences);
            safeUpdateList('wrongSentencesList', evaluation.wrongSentences);
            const words = countWords(writingContent.value);
            const numberOfWords = `${words}/${options.wordCount}`;
            safeUpdateElement('wordCountResult', numberOfWords || 0);
            safeUpdateElement('detailedFeedback', evaluation.detailedFeedback || 'Không có phản hồi chi tiết');

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
    
    if (scoreChart) {
        scoreChart.destroy();
    }
    
    scoreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 9 - score],
                backgroundColor: [
                    '#00f06c',
                    '#c80006'
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
                },
                centerText: {
                    display: true,
                    text: `${score}/9`,
                    color: '#000000',
                    font: {
                        size: '80px',
                        family: 'Arial',
                        weight: 'bold'
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                if (chart.config.options.plugins.centerText.display !== false) {
                    const ctx = chart.ctx;
                    const centerConfig = chart.config.options.plugins.centerText;

                    ctx.save();
                    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${centerConfig.font.weight} ${centerConfig.font.size} ${centerConfig.font.family}`;
                    ctx.fillStyle = centerConfig.color;

                    ctx.fillText(centerConfig.text, centerX, centerY);
                    ctx.restore();
                }
            }
        }]
    });
}