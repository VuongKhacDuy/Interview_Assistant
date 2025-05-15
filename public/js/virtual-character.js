const character = document.querySelector('.robot');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const voiceSelect = document.getElementById('voice-select');
const serverModelSelect = document.getElementById('server-model-select');
const combinedVoiceSelect = document.getElementById('combined-voice-select');
const rateRange = document.getElementById('rate-range');
const pitchRange = document.getElementById('pitch-range');
const rateValue = document.getElementById('rate-value');
const pitchValue = document.getElementById('pitch-value');
const useWebSpeech = document.getElementById('use-web-speech');
const forceVietnamese = document.getElementById('force-vietnamese');
const browserTab = document.getElementById('browser-tab');
const serverTab = document.getElementById('server-tab');

let speechSynthesis = window.speechSynthesis;
let speechUtterance = null;
let speechRecognition = null;
let isListening = false;
let selectedServerModel = '';
let serverTtsActive = true; // Trạng thái hoạt động của server TTS
let isSpeaking = false; // Trạng thái đang nói
let isPaused = false; // Trạng thái tạm dừng
let currentAudio = null; // Đối tượng audio hiện tại (cho server TTS)

// Tải danh sách model từ server
async function loadServerModels() {
    try {
        const response = await fetch('/virtual-character/tts/models');
        if (!response.ok) {
            throw new Error('Không thể tải danh sách model');
        }
        
        const models = await response.json();
        
        if (models.length === 0) {
            showServerTtsWarning(true);
            return;
        }
        
        // Cập nhật select
        serverModelSelect.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            serverModelSelect.appendChild(option);
        });
        
        // Cập nhật combined select cho server models
        const serverOptgroup = combinedVoiceSelect.querySelector('optgroup[label="Giọng server"]');
        if (serverOptgroup) {
            serverOptgroup.innerHTML = ''; // Xóa placeholders
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = 'server:' + model.id;
                option.textContent = model.name;
                option.dataset.isServer = 'true';
                serverOptgroup.appendChild(option);
            });
        }
        
        // Lưu model đã chọn
        if (models.length > 0) {
            selectedServerModel = models[0].id;
            showServerTtsWarning(false);
        }
        
        updateCombinedVoiceSelect();
    } catch (error) {
        console.error('Lỗi tải danh sách model:', error);
        serverModelSelect.innerHTML = '<option value="">Lỗi tải danh sách model</option>';
        showServerTtsWarning(true);
    }
}

// Hiển thị/ẩn thông báo cảnh báo về server TTS
function showServerTtsWarning(show) {
    const warningElement = document.getElementById('server-tts-warning');
    if (warningElement) {
        warningElement.style.display = show ? 'block' : 'none';
    }
    serverTtsActive = !show;
}

// Gọi function tải danh sách model khi trang tải xong
loadServerModels();

// Cập nhật model khi thay đổi
serverModelSelect.addEventListener('change', function() {
    selectedServerModel = this.value;
    console.log(`Đã chọn model server: ${selectedServerModel}`);
    
    // Đồng bộ với combined select
    if (this.value) {
        combinedVoiceSelect.value = 'server:' + this.value;
    }
    
    // Nếu đã chọn model server và đang không sử dụng Web Speech
    if (selectedServerModel && !useWebSpeech.checked) {
        console.log('Đã chọn giọng server, sẵn sàng sử dụng');
    }
});

// Khi chuyển tab giữa browser và server
browserTab.addEventListener('click', function() {
    useWebSpeech.checked = true;
});

serverTab.addEventListener('click', function() {
    useWebSpeech.checked = false;
});

// Khởi tạo SpeechRecognition
function initSpeechRecognition() {
    // Kiểm tra trình duyệt hỗ trợ
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.error('Speech recognition not supported in this browser');
        return false;
    }
    
    // Khởi tạo recognition
    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = 'vi-VN';
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    
    // Xử lý kết quả
    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
    };
    
    speechRecognition.onend = () => {
        toggleListening(false);
        // Tự động gửi tin nhắn nếu đã nhận được văn bản
        if (userInput.value.trim()) {
            setTimeout(() => {
                sendMessage();
            }, 500);
        }
    };
    
    speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toggleListening(false);
    };
    
    return true;
}

// Toggle trạng thái nghe
function toggleListening(start = null) {
    if (start === null) {
        start = !isListening;
    }
    
    isListening = start;
    
    if (isListening) {
        if (!speechRecognition) {
            const initialized = initSpeechRecognition();
            if (!initialized) return;
        }
        
        try {
            speechRecognition.start();
            voiceInputButton.classList.add('listening');
            voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i> Đang nghe...';
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    } else {
        if (speechRecognition) {
            try {
                speechRecognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
        voiceInputButton.classList.remove('listening');
        voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
    }
}

// Tạo nút voice input
const voiceInputButton = document.createElement('button');
voiceInputButton.className = 'btn btn-outline-secondary voice-input-btn';
voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
voiceInputButton.title = 'Nhấn để nói';
voiceInputButton.onclick = function() {
    toggleListening();
};

// Thêm nút vào bên cạnh input
document.querySelector('.chat-input').insertBefore(voiceInputButton, document.querySelector('.chat-input button'));

// Cập nhật giá trị hiển thị khi điều chỉnh
rateRange.addEventListener('input', () => {
    rateValue.textContent = rateRange.value;
});

pitchRange.addEventListener('input', () => {
    pitchValue.textContent = pitchRange.value;
});

function startTalkingAnimation() {
    const mouth = character.querySelector('.robot-mouth');
    const eyes = character.querySelectorAll('.robot-eye');
    
    eyes.forEach(eye => {
        eye.style.animation = 'blink 0.5s infinite';
    });
    
    mouth.style.animation = 'talk 0.3s infinite';
}

function stopTalkingAnimation() {
    const mouth = character.querySelector('.robot-mouth');
    const eyes = character.querySelectorAll('.robot-eye');
    
    eyes.forEach(eye => {
        eye.style.animation = '';
    });
    mouth.style.animation = '';
}

// Lấy danh sách voices và cập nhật select
function populateVoiceList() {
    const voices = speechSynthesis.getVoices();
    console.log('Đang tải danh sách giọng nói...');
    console.log(`Tìm thấy ${voices.length} giọng nói`);
    
    // Log tất cả voices có sẵn
    voices.forEach((voice, i) => {
        console.log(`Voice ${i}: ${voice.name} (${voice.lang}) - Default: ${voice.default}`);
    });
    
    // Log các giọng tiếng Việt
    const viVoices = voices.filter(voice => 
        voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-')
    );
    console.log(`Tìm thấy ${viVoices.length} giọng tiếng Việt`);
    viVoices.forEach((voice, i) => {
        console.log(`- Giọng Việt ${i}: ${voice.name} (${voice.lang})`);
    });
    
    voiceSelect.innerHTML = '<option value="">Giọng mặc định</option>';
    
    let foundVietnameseVoice = false;
    let viVoiceIndex = -1;
    
    // Cập nhật select cũ
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        
        // Đánh dấu nếu là giọng tiếng Việt
        const isVietnamese = voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-');
        if (isVietnamese) {
            option.textContent = `🇻🇳 ${voice.name} (${voice.lang})${voice.default ? ' - Default' : ''}`;
            
            // Lưu index của giọng tiếng Việt đầu tiên
            if (viVoiceIndex === -1) {
                viVoiceIndex = index;
            }
            
            foundVietnameseVoice = true;
        } else {
            option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' - Default' : ''}`;
        }
        
        voiceSelect.appendChild(option);
    });
    
    // Cập nhật combined select cho browser voices
    const browserOptgroup = combinedVoiceSelect.querySelector('optgroup[label="Giọng trình duyệt"]');
    if (browserOptgroup) {
        browserOptgroup.innerHTML = ''; // Xóa placeholders
        voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = 'browser:' + index;
            
            // Đánh dấu nếu là giọng tiếng Việt
            const isVietnamese = voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-');
            if (isVietnamese) {
                option.textContent = `🇻🇳 ${voice.name} (${voice.lang})`;
                option.dataset.isVietnamese = 'true';
            } else {
                option.textContent = `${voice.name} (${voice.lang})`;
            }
            
            browserOptgroup.appendChild(option);
        });
    }
    
    // Chọn giọng tiếng Việt đầu tiên nếu có
    if (foundVietnameseVoice && viVoiceIndex !== -1) {
        voiceSelect.value = viVoiceIndex;
        console.log(`Tự động chọn giọng tiếng Việt: ${voices[viVoiceIndex].name}`);
    }
    
    updateCombinedVoiceSelect();
}

// Cập nhật combined voice select dựa trên lựa chọn hiện tại
function updateCombinedVoiceSelect() {
    // Xác định giá trị đang được chọn
    if (useWebSpeech.checked && voiceSelect.value) {
        // Chọn browser voice tương ứng
        combinedVoiceSelect.value = 'browser:' + voiceSelect.value;
    } else if (!useWebSpeech.checked && selectedServerModel) {
        // Chọn server voice tương ứng
        combinedVoiceSelect.value = 'server:' + selectedServerModel;
    }
}

// Xử lý khi người dùng chọn giọng từ dropdown gộp
combinedVoiceSelect.addEventListener('change', function() {
    const selectedValue = this.value;
    if (!selectedValue) return;
    
    if (selectedValue.startsWith('browser:')) {
        // Chọn giọng trình duyệt
        const browserVoiceIndex = selectedValue.split(':')[1];
        voiceSelect.value = browserVoiceIndex;
        
        // Đánh dấu sử dụng Web Speech API
        useWebSpeech.checked = true;
        
        // Kiểm tra xem giọng được chọn có phải tiếng Việt không
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices[parseInt(browserVoiceIndex)];
        if (selectedVoice) {
            const isVietnameseVoice = selectedVoice.lang === 'vi-VN' || 
                                  selectedVoice.lang === 'vi' || 
                                  selectedVoice.lang.startsWith('vi-');
            
            // Nếu không phải giọng tiếng Việt, tự động tắt "Bắt buộc tiếng Việt"
            if (!isVietnameseVoice && forceVietnamese.checked) {
                forceVietnamese.checked = false;
                console.log("Đã tắt tự động bắt buộc tiếng Việt vì đã chọn giọng không phải tiếng Việt");
            }
            
            console.log(`Đã chọn giọng trình duyệt: ${selectedVoice.name} (${selectedVoice.lang})`);
        } else {
            console.log(`Đã chọn giọng trình duyệt với index: ${browserVoiceIndex}`);
        }
    } else if (selectedValue.startsWith('server:')) {
        // Chọn giọng server
        const serverModelId = selectedValue.split(':')[1];
        selectedServerModel = serverModelId;
        serverModelSelect.value = serverModelId;
        
        // Đánh dấu sử dụng Server TTS
        useWebSpeech.checked = false;
        
        console.log(`Đã chọn giọng server: ${serverModelId}`);
    }
    
    // Kích hoạt sự kiện change cho các controls bị ảnh hưởng
    if (useWebSpeech.checked) {
        // Kích hoạt sự kiện change cho voice select
        const event = new Event('change');
        voiceSelect.dispatchEvent(event);
    } else {
        // Kích hoạt sự kiện change cho server model select
        const event = new Event('change');
        serverModelSelect.dispatchEvent(event);
    }
});

// Cập nhật hàm dừng để làm sạch watchdog
function stopAllSpeech() {
    // Dừng Web Speech API
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Xóa watchdog nếu có
    if (window.speechSynthesisWatchdog) {
        clearInterval(window.speechSynthesisWatchdog);
        window.speechSynthesisWatchdog = null;
    }
    
    // Xóa utterance chunks nếu có
    if (window.speechSynthesisUtteranceChunks) {
        window.speechSynthesisUtteranceChunks = [];
    }
    
    // Dừng audio từ server nếu đang phát
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    
    // Dừng animation
            stopTalkingAnimation();
    isSpeaking = false;
    isPaused = false;
    
    // Cập nhật trạng thái các nút
    updateSpeechControlButtonsState();
}

// Hàm tạm dừng speech
function pauseSpeech() {
    if (!isSpeaking || isPaused) return;
    
    console.log("Tạm dừng phát âm thanh");
    
    // Tạm dừng Web Speech API
    if (speechSynthesis.speaking) {
        try {
            // Trước khi pause, tắt watchdog nếu có
            if (window.speechSynthesisWatchdog) {
                clearInterval(window.speechSynthesisWatchdog);
                window.speechSynthesisWatchdog = null;
            }
            
            speechSynthesis.pause();
            console.log("Đã tạm dừng Web Speech API");
    } catch (error) {
            console.error("Lỗi khi tạm dừng Web Speech API:", error);
        }
    }
    
    // Tạm dừng audio từ server nếu đang phát
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        console.log("Đã tạm dừng audio từ server");
    }
    
    // Tạm dừng animation
        stopTalkingAnimation();
    isPaused = true;
    
    // Cập nhật trạng thái các nút
    updateSpeechControlButtonsState();
}

// Hàm tiếp tục speech
function resumeSpeech() {
    if (!isPaused) return;
    
    console.log("Tiếp tục phát âm thanh");
    
    // Tiếp tục Web Speech API
    if (speechSynthesis.paused) {
        try {
            // Bắt đầu hoạt hình nói
            startTalkingAnimation();
            
            // Khởi động lại watchdog cho Chrome
            if (window.chrome && !window.speechSynthesisWatchdog) {
                console.log("Khởi động lại watchdog cho Chrome");
                window.speechSynthesisWatchdog = setInterval(() => {
                    if (speechSynthesis.speaking && !speechSynthesis.paused) {
                        console.log("Chrome watchdog: giữ cho speech hoạt động");
                        speechSynthesis.pause();
                        setTimeout(() => {
                            speechSynthesis.resume();
                        }, 50);
                    }
                }, 5000);
            }
            
            // Resume speech
            speechSynthesis.resume();
            console.log("Đã tiếp tục Web Speech API");
        } catch (error) {
            console.error("Lỗi khi tiếp tục Web Speech API:", error);
            
            // Nếu không thể resume, thử phát lại từ đầu
            if (speechUtterance) {
                console.log("Thử phát lại utterance từ đầu");
                try {
                    speechSynthesis.cancel();
                    speechSynthesis.speak(speechUtterance);
                } catch (speakError) {
                    console.error("Không thể phát lại utterance:", speakError);
                }
            }
        }
    }
    
    // Tiếp tục audio từ server nếu đang tạm dừng
    if (currentAudio && currentAudio.paused) {
        try {
            currentAudio.play();
            console.log("Đã tiếp tục audio từ server");
        } catch (error) {
            console.error("Lỗi khi tiếp tục phát audio từ server:", error);
        }
    }
    
    // Tiếp tục animation
    startTalkingAnimation();
    isPaused = false;
    
    // Cập nhật trạng thái các nút
    updateSpeechControlButtonsState();
}

// Tạo nút pause speech
const pauseSpeechButton = document.createElement('button');
pauseSpeechButton.className = 'btn btn-warning btn-sm me-2';
pauseSpeechButton.innerHTML = '<i class="fas fa-pause"></i>';
pauseSpeechButton.title = 'Tạm dừng phát âm thanh';
pauseSpeechButton.disabled = true; // Mặc định không có gì để tạm dừng
pauseSpeechButton.onclick = function() {
    pauseSpeech();
};

// Tạo nút resume speech
const resumeSpeechButton = document.createElement('button');
resumeSpeechButton.className = 'btn btn-success btn-sm me-2';
resumeSpeechButton.innerHTML = '<i class="fas fa-play"></i>';
resumeSpeechButton.title = 'Tiếp tục phát âm thanh';
resumeSpeechButton.disabled = true; // Mặc định không có gì để tiếp tục
resumeSpeechButton.onclick = function() {
    resumeSpeech();
};

// Tạo nút stop speech
const stopSpeechButton = document.createElement('button');
stopSpeechButton.className = 'btn btn-danger btn-sm me-2';
stopSpeechButton.innerHTML = '<i class="fas fa-stop"></i>';
stopSpeechButton.title = 'Dừng phát âm thanh';
stopSpeechButton.disabled = true; // Mặc định không có gì để dừng
stopSpeechButton.onclick = function() {
    stopAllSpeech();
};

// Tạo container cho các nút điều khiển
const speechControlsContainer = document.createElement('div');
speechControlsContainer.className = 'speech-controls mt-3 d-flex justify-content-center';
speechControlsContainer.appendChild(resumeSpeechButton);
speechControlsContainer.appendChild(pauseSpeechButton);
speechControlsContainer.appendChild(stopSpeechButton);

// Thêm container vào trang
document.querySelector('.voice-controls .card-body').appendChild(speechControlsContainer);

// Cập nhật trạng thái các nút điều khiển
function updateSpeechControlButtonsState() {
    // Nút dừng (stop)
    stopSpeechButton.disabled = !isSpeaking;
    
    // Nút tạm dừng (pause)
    pauseSpeechButton.disabled = !isSpeaking || isPaused;
    
    // Nút tiếp tục (resume/play)
    resumeSpeechButton.disabled = !isPaused;
}

// Đảm bảo voices được tải đầy đủ
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function() {
        console.log("Voices đã thay đổi, tải lại danh sách");
        populateVoiceList();
        
        // Lọc lại các giọng tiếng Việt sau khi load danh sách
        findAndSelectVietnameseVoice();
    };
}

// Hàm tìm và chọn giọng tiếng Việt
function findAndSelectVietnameseVoice() {
    const voices = speechSynthesis.getVoices();
    
    // Xóa thông báo cũ
    const oldWarnings = document.querySelectorAll('.voice-warning');
    oldWarnings.forEach(warning => warning.remove());
    
    // Tìm giọng tiếng Việt
    const viVoices = voices.filter(voice => 
        voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-')
    );
    
    // Nếu không có giọng tiếng Việt, hiển thị cảnh báo
    if (viVoices.length === 0) {
        console.warn("Không tìm thấy giọng tiếng Việt!");
        const warning = document.createElement('div');
        warning.className = 'alert alert-warning mt-2 voice-warning';
        warning.innerHTML = `
            <strong>Chú ý:</strong> Không tìm thấy giọng tiếng Việt. 
            Hãy cài đặt thêm giọng trong cài đặt hệ thống hoặc sử dụng TTS Server.
        `;
        
        document.getElementById('browser-tts').appendChild(warning);
        return null;
    }
    
    // Tìm thấy ít nhất một giọng tiếng Việt
    console.log(`Tìm thấy ${viVoices.length} giọng tiếng Việt:`);
    viVoices.forEach((voice, i) => {
        console.log(`${i+1}. ${voice.name} (${voice.lang})`);
    });
    
    return viVoices[0]; // Trả về giọng đầu tiên tìm được
}

// Thêm lắng nghe sự kiện khi chuyển tab
document.getElementById('browser-tab').addEventListener('click', () => {
    // Đảm bảo voice list đã được load
    setTimeout(() => {
        findAndSelectVietnameseVoice();
    }, 500);
});

// Gọi ngay lần đầu để tải voices nếu đã có sẵn
populateVoiceList();
findAndSelectVietnameseVoice();

// Thêm nút để sử dụng streaming
const useStreamingButton = document.createElement('button');
useStreamingButton.className = 'btn btn-success mt-2 ms-2';
useStreamingButton.textContent = 'Sử dụng Streaming TTS';
useStreamingButton.onclick = function() {
    sendStreamMessage();
};

// Thêm nút vào trang
document.querySelector('.voice-controls .card-body').appendChild(useStreamingButton);

// Kết nối nút xóa trong header chat
document.getElementById('clear-chat-btn').addEventListener('click', clearChatMessages);

// Cập nhật phương thức hiển thị tin nhắn để có giao diện đẹp hơn
function addMessageToChat(sender, message, isError = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender.toLowerCase()}`;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    
    if (isError) {
        contentElement.classList.add('error');
        contentElement.innerHTML = message;
    } else if (sender === 'System') {
        // Xử lý đặc biệt cho tin nhắn hệ thống
        contentElement.classList.add('system-message');
        contentElement.innerHTML = message;
        messageElement.classList.add('system');
    } else {
        contentElement.innerHTML = message;
    }
    
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Cập nhật phương thức sendMessage
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Dừng âm thanh nếu đang phát
    stopAllSpeech();

    // Thêm tin nhắn người dùng với giao diện đẹp hơn
    addMessageToChat('User', message);
    userInput.value = '';

    startTalkingAnimation();
    isSpeaking = true;
    updateSpeechControlButtonsState();

    try {
        const response = await fetch('/virtual-character/generate-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        // Thêm tin nhắn robot với giao diện đẹp hơn
        addMessageToChat('Robot', data.response);
        
        // Kiểm tra nếu người dùng đã dừng trong khi chờ phản hồi
        if (!isSpeaking) {
            return;
        }
        
        // Đảm bảo voice selection nhất quán trước khi phát âm thanh
        if (useWebSpeech.checked) {
            ensureConsistentVoiceSelection();
        }
        
        console.log("Phát âm thanh cho phản hồi với phương thức: " + 
                  (useWebSpeech.checked ? "Web Speech API" : "Server TTS"));
        
        // Luôn sử dụng streamingTTS để đảm bảo đồng nhất giữa các phương thức
        streamingTTS(data.response);
    } catch (error) {
        console.error('Error:', error);
        // Hiển thị thông báo lỗi
        addMessageToChat('Robot', 'Xin lỗi, đã có lỗi xảy ra.', true);
        stopTalkingAnimation();
        isSpeaking = false;
        updateSpeechControlButtonsState();
    }
}

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Hàm phát âm thanh từ server
async function speakWithServerTTS(text) {
    return new Promise(async (resolve, reject) => {
        try {
            // Loại bỏ HTML tags nếu có
            const cleanText = stripHtml(text);
            
            // Kiểm tra nếu đã dừng bởi người dùng
            if (!isSpeaking) {
                resolve();
                return;
            }
            
            // Nếu server TTS đã được đánh dấu là có vấn đề, chuyển ngay sang Web Speech API
            if (!serverTtsActive) {
                console.log('Server TTS đã bị vô hiệu hóa, sử dụng Web Speech API');
                speakWithBrowserTTS(cleanText, resolve);
                return;
            }

            console.log(`Yêu cầu TTS từ server cho text: "${cleanText}", model: ${selectedServerModel}`);
            const response = await fetch('/virtual-character/tts/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    text: cleanText,
                    modelId: selectedServerModel
                })
            });

            // Kiểm tra lại nếu đã dừng trong khi chờ server phản hồi
            if (!isSpeaking) {
                resolve();
                return;
            }

            if (!response.ok) {
                console.error(`Server trả về lỗi: ${response.status} ${response.statusText}`);
                throw new Error('TTS request failed');
            }

            const audioBlob = await response.blob();
            console.log(`Đã nhận phản hồi từ server, kích thước blob: ${audioBlob.size} bytes`);
            
            // Kiểm tra lại nếu đã dừng
            if (!isSpeaking) {
                resolve();
                return;
            }
            
            // Kiểm tra kích thước blob - nếu quá nhỏ có thể là fallback audio
            if (audioBlob.size < 1000) {
                console.warn('Nhận được audio rỗng từ server, chuyển sang Web Speech API');
                
                // Đánh dấu server TTS có vấn đề
                serverTtsActive = false;
                showServerTtsWarning(true);
                
                // Tự động chuyển sang Web Speech API
                if (!useWebSpeech.checked) {
                    console.log('Tự động kích hoạt Web Speech API');
                    useWebSpeech.checked = true;
                    // Chuyển tab sang browser
                    const browserTabButton = document.getElementById('browser-tab');
                    if (browserTabButton) {
                        browserTabButton.click();
                    }
                }
                
                // Kiểm tra lại nếu đã dừng
                if (!isSpeaking) {
                    resolve();
                    return;
                }
                
                // Phát âm thanh sử dụng Web Speech API
                speakWithBrowserTTS(cleanText, resolve);
                return;
            }
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            currentAudio = audio; // Lưu lại để có thể dừng/tạm dừng nếu cần
            
            console.log('Phát âm thanh từ server');
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                console.log('Kết thúc phát âm thanh từ server');
                isSpeaking = false;
                isPaused = false;
                updateSpeechControlButtonsState();
                resolve();
            };
            
            audio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                console.error('Audio playback error:', error);
                isSpeaking = false;
                isPaused = false;
                updateSpeechControlButtonsState();
                
                // Kiểm tra lại nếu đã dừng
                if (!isSpeaking) {
                    resolve();
                    return;
                }
                
                // Fallback to Web Speech API if audio fails to play
                console.log('Fallback to Web Speech API due to audio error');
                speakWithBrowserTTS(cleanText, resolve);
            };

            await audio.play();
        } catch (error) {
            console.error('Server TTS Error:', error);
            
            // Đánh dấu server TTS có vấn đề
            serverTtsActive = false;
            showServerTtsWarning(true);
            
            // Kiểm tra lại nếu đã dừng
            if (!isSpeaking) {
                resolve();
                return;
            }
            
            // Nếu server-side TTS thất bại, sử dụng Web Speech API
            console.log('Fallback to Web Speech API due to server error');
            speakWithBrowserTTS(text, resolve);
        }
    });
}

// Hàm mới để phát âm thanh với Web Speech API
function speakWithBrowserTTS(text, callback) {
    // Loại bỏ HTML tags nếu có
    const cleanText = stripHtml(text);
    
    // Tạo utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Lấy voice đã chọn
    const voices = speechSynthesis.getVoices();
    console.log(`Browser TTS: Danh sách giọng nói có sẵn: ${voices.length}`);
    
    // Tìm và log các giọng tiếng Việt - vẫn hữu ích cho debug
    const vietnameseVoices = voices.filter(voice => 
        voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-')
    );
    console.log(`Browser TTS: Giọng tiếng Việt có sẵn: ${vietnameseVoices.length}`);
    
    // Ưu tiên giọng tiếng Việt
    let voiceFound = false;
    
    // 1. Dùng voice đã được chọn từ dropdown bất kể ngôn ngữ gì
    if (voiceSelect.value) {
        const selectedVoiceIndex = parseInt(voiceSelect.value);
        if (!isNaN(selectedVoiceIndex) && selectedVoiceIndex >= 0 && selectedVoiceIndex < voices.length) {
            const selectedVoice = voices[selectedVoiceIndex];
            utterance.voice = selectedVoice;
            
            // Sử dụng ngôn ngữ của giọng được chọn
            utterance.lang = selectedVoice.lang;
            console.log(`Browser TTS: Sử dụng giọng đã chọn: ${selectedVoice.name} (${selectedVoice.lang})`);
            voiceFound = true;
        }
    } 
    
    // 2. Nếu không có chọn trên UI và bắt buộc tiếng Việt, tìm giọng tiếng Việt đầu tiên
    if (!voiceFound && forceVietnamese.checked && vietnameseVoices.length > 0) {
        utterance.voice = vietnameseVoices[0];
        utterance.lang = vietnameseVoices[0].lang;
        console.log(`Browser TTS: Sử dụng giọng tiếng Việt đầu tiên tìm được: ${utterance.voice.name}`);
        voiceFound = true;
    } else if (!voiceFound) {
        // Không có giọng được chọn, sử dụng giọng mặc định của trình duyệt
        console.log(`Browser TTS: Không có giọng được chọn, sử dụng giọng mặc định`);
        // Không cần đặt lang ở đây để trình duyệt tự chọn language mặc định
    }
    
    // Cập nhật rate và pitch từ sliders
    utterance.rate = parseFloat(rateRange.value);
    utterance.pitch = parseFloat(pitchRange.value);
    utterance.volume = 1.0; // Đảm bảo âm lượng tối đa
    
    utterance.onend = () => {
        console.log('Browser TTS: Kết thúc phát âm thanh');
        if (callback) callback();
    };
    
    utterance.onerror = (error) => {
        console.error('Browser TTS: Lỗi phát âm thanh:', error);
        if (callback) callback();
    };
    
    // Lưu utterance hiện tại để có thể pause/resume
    speechUtterance = utterance;
    
    console.log(`Browser TTS: Phát âm thanh với giọng: ${utterance.voice?.name || 'mặc định'}, ngôn ngữ: ${utterance.lang || 'mặc định'}, độ dài: ${cleanText.length} ký tự`);
    
    // Đảm bảo hủy các speech trước đó
    speechSynthesis.cancel();
    
    // Khởi động watchdog cho Chrome (giúp phát văn bản dài)
    if (window.chrome) {
        // Khởi động watchdog để tránh Chrome tự động dừng sau 15 giây
        if (window.speechSynthesisWatchdog) {
            clearInterval(window.speechSynthesisWatchdog);
        }
        
        window.speechSynthesisWatchdog = setInterval(() => {
            if (speechSynthesis.speaking && !speechSynthesis.paused) {
                console.log("Chrome watchdog: giữ cho speech hoạt động");
                speechSynthesis.pause();
                setTimeout(() => {
                    speechSynthesis.resume();
                }, 50);
            }
        }, 5000);
    }
    
    // Phát âm thanh
    speechSynthesis.speak(utterance);
}

async function fallbackServerTTS(text) {
    try {
        startTalkingAnimation();
        isSpeaking = true;
        updateSpeechControlButtonsState();
        await speakWithServerTTS(text);
        // Chỉ dừng animation nếu vẫn đang trong trạng thái nói
        if (isSpeaking) {
            stopTalkingAnimation();
            isSpeaking = false;
            updateSpeechControlButtonsState();
        }
    } catch (error) {
        console.error('TTS Error:', error);
        stopTalkingAnimation();
        isSpeaking = false;
        updateSpeechControlButtonsState();
    }
}

// Thêm nút để test streaming TTS
const testStreamingButton = document.createElement('button');
testStreamingButton.className = 'btn btn-outline-primary mt-2';
testStreamingButton.textContent = 'Test HTML Cleaning & TTS';
testStreamingButton.onclick = function() {
    const testText = `<div class="test-content">
    <p>Xin chào! Rất vui được gặp bạn! Tôi là <strong>Nora</strong> là trợ lý ảo có thể trả lời <em>các câu hỏi</em> của bạn.</p>
    </div>`;
    
    // Hiển thị tin nhắn với HTML
    addMessageToChat('Robot', testText);
    
    // Phát âm văn bản đã xử lý
    streamingTTS(testText);
};

// Thêm nút vào trang
document.querySelector('.voice-controls .card-body').appendChild(testStreamingButton);

// Tạo nút xóa nội dung chat
// const clearChatButton = document.createElement('button');
// clearChatButton.className = 'btn btn-secondary mt-2 ms-2';
// clearChatButton.innerHTML = '<i class="fas fa-trash"></i> Xóa chat';
// clearChatButton.title = 'Xóa toàn bộ nội dung chat';
// clearChatButton.onclick = function() {
//     clearChatMessages();
// };

// Thêm nút vào trang
// document.querySelector('.voice-controls .card-body').appendChild(clearChatButton);

// Hàm xóa nội dung chat
function clearChatMessages() {
    // Dừng bất kỳ âm thanh nào đang phát
    stopAllSpeech();
    
    // Xóa nội dung chat
    chatMessages.innerHTML = '';
    
    // Thêm thông báo xóa thành công
    const clearNotice = document.createElement('div');
    clearNotice.className = 'text-center text-muted my-3';
    clearNotice.innerHTML = '<i class="fas fa-check-circle"></i> Đã xóa lịch sử chat';
    chatMessages.appendChild(clearNotice);
    
    // Tự động ẩn thông báo sau 3 giây
    setTimeout(() => {
        if (clearNotice.parentNode === chatMessages) {
            chatMessages.removeChild(clearNotice);
        }
    }, 3000);
}

// Xử lý streaming response với Server-Sent Events
async function sendStreamMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    stopAllSpeech();

    addMessageToChat('User', message);
    userInput.value = '';
    
    // Tạo container cho response
    const robotMessageElement = document.createElement('div');
    robotMessageElement.className = 'message robot';
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    contentElement.id = 'streaming-response-container';
    
    const streamingResponseSpan = document.createElement('span');
    streamingResponseSpan.id = 'streaming-response';
    
    contentElement.appendChild(streamingResponseSpan);
    robotMessageElement.appendChild(contentElement);
    chatMessages.appendChild(robotMessageElement);
    
    // Start animation
    startTalkingAnimation();
    isSpeaking = true;
    updateSpeechControlButtonsState();
    
    try {
        const eventSource = new EventSource(`/virtual-character/generate-stream-response?message=${encodeURIComponent(message)}`);
        
        let fullResponse = '';
        let currentSentence = '';
        
        // Xử lý từng chunk dữ liệu
        eventSource.onmessage = async function(event) {
            // Kiểm tra nếu đã dừng bởi người dùng
            if (!isSpeaking) {
                eventSource.close();
                return;
            }
            
            if (event.data === '[DONE]') {
                eventSource.close();
                if (isSpeaking) {
                    stopTalkingAnimation();
                    isSpeaking = false;
                    updateSpeechControlButtonsState();
                }
                return;
            }
            
            try {
                const data = JSON.parse(event.data);
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                if (data.chunk) {
                    fullResponse += data.chunk;
                    currentSentence += data.chunk;
                    
                    // Cập nhật nội dung hiển thị
                    streamingResponseSpan.textContent = fullResponse;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    // Kiểm tra nếu đã dừng bởi người dùng
                    if (!isSpeaking) {
                        eventSource.close();
                        return;
                    }
                    
                    // Kiểm tra xem có câu hoàn chỉnh không (kết thúc bằng dấu chấm, chấm hỏi, chấm than)
                    if (/[.!?](\s|$)/.test(data.chunk)) {
                        console.log(`Câu hoàn chỉnh được phát hiện: "${currentSentence.trim()}"`);
                        
                        // Loại bỏ HTML tags trước khi xử lý
                        const cleanSentence = stripHtml(currentSentence.trim());
                        
                        if (cleanSentence) {
                            // Sử dụng hàm chung để đảm bảo nhất quán với hàm streamingTTS
                            if (useWebSpeech.checked) {
                                // Phát âm câu hiện tại với Web Speech API
                                speakWithBrowserTTS(cleanSentence);
                            } else {
                                // Phát âm câu hiện tại với Server API
                                speakWithServerTTS(cleanSentence).catch(error => {
                                    console.error('Server TTS error during streaming:', error);
                                });
                            }
                        }
                        
                        // Reset current sentence
                        currentSentence = '';
                    }
                }
            } catch (error) {
                console.error('Error parsing stream chunk:', error);
            }
        };
        
        // Xử lý lỗi
        eventSource.onerror = function(error) {
            console.error('EventSource error:', error);
            eventSource.close();
            
            if (isSpeaking) {
                stopTalkingAnimation();
                isSpeaking = false;
                updateSpeechControlButtonsState();
            }
            
            // Hiển thị thông báo lỗi kết nối
            const errorElement = document.createElement('span');
            errorElement.className = 'text-danger';
            errorElement.textContent = ' [Lỗi kết nối]';
            streamingResponseSpan.appendChild(errorElement);
        };
        
    } catch (error) {
        console.error('Error:', error);
        // Hiển thị thông báo lỗi
        addMessageToChat('Robot', 'Xin lỗi, đã có lỗi xảy ra.', true);
        
        if (isSpeaking) {
            stopTalkingAnimation();
            isSpeaking = false;
            updateSpeechControlButtonsState();
        }
    }
}

// Force load voices ngay khi trang load
function forceLoadVoices() {
    return new Promise((resolve) => {
        let voices = speechSynthesis.getVoices();
        if (voices.length !== 0) {
            console.log('Đã load voices ngay lập tức, có sẵn:', voices.length);
            populateVoiceList();
            ensureConsistentVoiceSelection();
            resolve(voices);
            return;
        }

        // Chrome needs a little help...
        let uttr = new SpeechSynthesisUtterance("");
        uttr.onend = () => {
            voices = speechSynthesis.getVoices();
            console.log('Đã force load voices, có:', voices.length);
            populateVoiceList();
            ensureConsistentVoiceSelection();
            resolve(voices);
        };
        speechSynthesis.speak(uttr);
        
        // Thêm timeout để đảm bảo voices được load
        setTimeout(() => {
            if (voices.length === 0) {
                voices = speechSynthesis.getVoices();
                if (voices.length > 0) {
                    console.log('Đã load voices sau timeout, có:', voices.length);
                    populateVoiceList();
                    ensureConsistentVoiceSelection();
                    resolve(voices);
                } else {
                    console.warn('Không thể load voices sau timeout');
                    resolve([]);
                }
            }
        }, 1000);
    });
}

// Cập nhật khởi tạo
(async function initializeVoices() {
    console.log("Khởi tạo hệ thống TTS...");
    
    // Load voices
    await forceLoadVoices();
    
    // Test khả năng phát âm tiếng Việt
    console.log("Kiểm tra khả năng phát âm tiếng Việt...");
    const hasVietnameseVoice = ensureConsistentVoiceSelection();
    
    // Nếu không có giọng tiếng Việt và đang bắt buộc tiếng Việt,
    // tự động chuyển sang server TTS
    if (!hasVietnameseVoice && forceVietnamese.checked) {
        console.log("Không tìm thấy giọng tiếng Việt, tự động chuyển sang server TTS");
        useWebSpeech.checked = false;
        
        // Chuyển tab
        const serverTabButton = document.getElementById('server-tab');
        if (serverTabButton) {
            serverTabButton.click();
        }
    }
    
    console.log("Hệ thống TTS đã sẵn sàng");
})();

// Hàm để đảm bảo chọn giọng tiếng Việt phù hợp
function ensureConsistentVoiceSelection() {
    // Lấy danh sách voices hiện tại
    const voices = speechSynthesis.getVoices();
    
    // Xóa các cảnh báo cũ
    const oldWarnings = document.querySelectorAll('.voice-warning');
    oldWarnings.forEach(warning => warning.remove());
    
    // Tìm giọng tiếng Việt
    const vietnameseVoices = voices.filter(voice => 
        voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-')
    );
    
    console.log(`Kiểm tra voice selection: Tìm thấy ${vietnameseVoices.length} giọng tiếng Việt`);
    
    // Chỉ thực hiện chuyển đổi giọng nếu bắt buộc tiếng Việt được bật
    if (forceVietnamese.checked) {
        console.log("Chế độ bắt buộc tiếng Việt đang bật");
        
        // Kiểm tra nếu đang chọn giọng không phải tiếng Việt
        if (voiceSelect.value) {
            const selectedVoice = voices[parseInt(voiceSelect.value)];
            if (selectedVoice) {
                const isVietnameseVoice = selectedVoice.lang === 'vi-VN' || 
                                        selectedVoice.lang === 'vi' || 
                                        selectedVoice.lang.startsWith('vi-');
                
                // Nếu không phải giọng tiếng Việt, tự động chuyển
                if (!isVietnameseVoice && vietnameseVoices.length > 0) {
                    // Tìm index của giọng tiếng Việt đầu tiên trong danh sách
                    const firstVietnameseVoiceIndex = voices.findIndex(voice => 
                        voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-')
                    );
                    
                    if (firstVietnameseVoiceIndex !== -1) {
                        voiceSelect.value = firstVietnameseVoiceIndex;
                        console.log(`Đã tự động chuyển sang giọng tiếng Việt: ${voices[firstVietnameseVoiceIndex].name}`);
                        
                        // Đồng thời cập nhật combined select
                        combinedVoiceSelect.value = 'browser:' + firstVietnameseVoiceIndex;
                    }
                }
            }
        } else if (vietnameseVoices.length > 0) {
            // Nếu chưa chọn giọng nào và có giọng tiếng Việt, tự động chọn giọng tiếng Việt đầu tiên
            const firstVietnameseVoiceIndex = voices.findIndex(voice => 
                voice.lang === 'vi-VN' || voice.lang === 'vi' || voice.lang.startsWith('vi-')
            );
            
            if (firstVietnameseVoiceIndex !== -1) {
                voiceSelect.value = firstVietnameseVoiceIndex;
                console.log(`Đã tự động chọn giọng tiếng Việt: ${voices[firstVietnameseVoiceIndex].name}`);
                
                // Đồng thời cập nhật combined select
                combinedVoiceSelect.value = 'browser:' + firstVietnameseVoiceIndex;
            }
        }
        
        // Hiển thị cảnh báo nếu không tìm thấy giọng tiếng Việt và đang bắt buộc tiếng Việt
        if (vietnameseVoices.length === 0) {
            const warning = document.createElement('div');
            warning.className = 'alert alert-warning mt-2 voice-warning';
            warning.innerHTML = `
                <strong>Chú ý:</strong> Không tìm thấy giọng tiếng Việt mặc dù đã bật "Bắt buộc tiếng Việt". 
                Hãy cài đặt thêm giọng trong cài đặt hệ thống hoặc sử dụng server TTS.
            `;
            
            document.getElementById('browser-tts').appendChild(warning);
        }
    } else {
        console.log("Chế độ bắt buộc tiếng Việt đang tắt, cho phép sử dụng bất kỳ giọng nào");
    }
    
    return vietnameseVoices.length > 0;
}

// Bắt sự kiện khi thay đổi công tắc bắt buộc tiếng Việt
forceVietnamese.addEventListener('change', function() {
    console.log(`Công tắc "Bắt buộc tiếng Việt" đã thay đổi: ${this.checked ? 'Bật' : 'Tắt'}`);
    ensureConsistentVoiceSelection();
});

// Bắt sự kiện khi thay đổi giọng đã chọn
voiceSelect.addEventListener('change', function() {
    const selectedIndex = this.value;
    if (selectedIndex) {
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices[parseInt(selectedIndex)];
        console.log(`Đã chọn giọng: ${selectedVoice.name} (${selectedVoice.lang})`);
        
        // Kiểm tra nếu đang bắt buộc tiếng Việt nhưng lại chọn giọng không phải tiếng Việt
        const isVietnameseVoice = selectedVoice.lang === 'vi-VN' || 
                                selectedVoice.lang === 'vi' || 
                                selectedVoice.lang.startsWith('vi-');
        
        if (forceVietnamese.checked && !isVietnameseVoice) {
            // Hiển thị cảnh báo
            const warning = document.createElement('div');
            warning.className = 'alert alert-warning mt-2 voice-warning';
            warning.innerHTML = `
                <strong>Chú ý:</strong> Bạn đã chọn giọng không phải tiếng Việt (${selectedVoice.lang}) 
                trong khi đang bật "Bắt buộc tiếng Việt". Tiếng Việt có thể không được phát âm đúng.
            `;
            
            // Xóa các cảnh báo cũ
            const oldWarnings = document.querySelectorAll('.voice-warning');
            oldWarnings.forEach(w => w.remove());
            
            // Thêm cảnh báo mới
            document.getElementById('browser-tts').appendChild(warning);
        } else {
            // Xóa các cảnh báo cũ
            const oldWarnings = document.querySelectorAll('.voice-warning');
            oldWarnings.forEach(w => w.remove());
        }
    }
});

// Sự kiện chuyển đổi giữa Web Speech và Server TTS
useWebSpeech.addEventListener('change', function() {
    console.log(`Chuyển đổi phương thức TTS: ${this.checked ? 'Web Speech API' : 'Server TTS'}`);
    
    if (this.checked) {
        ensureConsistentVoiceSelection();
    }
    
    // Cập nhật combined select sau khi thay đổi
    updateCombinedVoiceSelect();
});

// Thêm CSS cho tin nhắn system
const systemMessageStyle = document.createElement('style');
systemMessageStyle.textContent = `
    .message.system {
        margin: 10px 0;
        width: 100%;
    }
    
    .message.system .content {
        width: 100%;
        max-width: 100%;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #17a2b8;
    }
    
    .message.system .content pre {
        max-height: 150px;
        overflow-y: auto;
        font-size: 0.85rem;
    }
`;
document.head.appendChild(systemMessageStyle);

// Thêm CSS cho select gộp
const combinedSelectStyle = document.createElement('style');
combinedSelectStyle.textContent = `
    #combined-voice-select {
        font-size: 15px;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #ced4da;
        transition: all 0.2s;
    }
    
    #combined-voice-select:focus {
        border-color: #86b7fe;
        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
    }
    
    #combined-voice-select optgroup {
        font-weight: bold;
        color: #495057;
    }
    
    #combined-voice-select option {
        padding: 6px 8px;
    }
`;
document.head.appendChild(combinedSelectStyle);

// Khi trang tải xong, cập nhật trạng thái combined select
window.addEventListener('DOMContentLoaded', function() {
    // Đảm bảo voices được tải đầy đủ trước khi cập nhật UI
    setTimeout(() => {
        // Đảm bảo cập nhật combined select sau khi voices đã load
        updateCombinedVoiceSelect();
        
        // Kiểm tra nếu đang sử dụng Web Speech API
        if (useWebSpeech.checked) {
            // Nếu combined select có tùy chọn với data-isVietnamese="true", ưu tiên chọn tùy chọn đó
            const vietnameseOptions = Array.from(combinedVoiceSelect.querySelectorAll('option[data-is-vietnamese="true"]'));
            if (vietnameseOptions.length > 0) {
                combinedVoiceSelect.value = vietnameseOptions[0].value;
                
                // Cập nhật lại các select khác theo giá trị đã chọn
                if (combinedVoiceSelect.value.startsWith('browser:')) {
                    const browserVoiceIndex = combinedVoiceSelect.value.split(':')[1];
                    voiceSelect.value = browserVoiceIndex;
                    
                    // Kích hoạt sự kiện change cho voice select
                    const event = new Event('change');
                    voiceSelect.dispatchEvent(event);
                }
            } else if (voiceSelect.value) {
                // Nếu không tìm thấy giọng Việt, nhưng đã có giọng được chọn trước đó
                combinedVoiceSelect.value = 'browser:' + voiceSelect.value;
            }
        } else {
            // Đang sử dụng Server TTS
            if (selectedServerModel) {
                combinedVoiceSelect.value = 'server:' + selectedServerModel;
            }
        }
        
        console.log('Đã khởi tạo xong voice selection. ' + 
                  (useWebSpeech.checked ? 'Sử dụng Web Speech API' : 'Sử dụng Server TTS'));
    }, 1000);
});

// Hàm loại bỏ HTML tags từ văn bản
function stripHtml(html) {
    // Kiểm tra nếu có HTML tags thực sự
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(html);
    
    // Tạo một phần tử div tạm thời
    const tempDiv = document.createElement('div');
    // Gán HTML vào div
    tempDiv.innerHTML = html;
    // Lấy text content (đã loại bỏ tất cả các thẻ HTML)
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    // Loại bỏ khoảng trắng thừa
    const cleanedText = textContent.trim()
        // Loại bỏ nhiều dòng trống liên tiếp
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        // Loại bỏ khoảng trắng thừa ở đầu dòng
        .replace(/^\s+/gm, '')
        // Chuẩn hóa dấu cách
        .replace(/\s+/g, ' ');
    
    return cleanedText;
}

// Chức năng streaming TTS - phát và hiển thị dần dần
function streamingTTS(text) {
    // Loại bỏ HTML tags trước khi xử lý
    const cleanText = stripHtml(text);
    
    // Dừng bất kỳ âm thanh nào đang phát
    stopAllSpeech();
    
    console.log(`Phát toàn bộ văn bản tiếng Việt, độ dài: ${cleanText.length} ký tự`);
    
    startTalkingAnimation();
    isSpeaking = true;
    isPaused = false;
    updateSpeechControlButtonsState();
    
    // Log thông tin về voice được sử dụng
    if (useWebSpeech.checked) {
        console.log("Sử dụng Web Speech API");
        
        // Lấy thông tin giọng được chọn
        if (voiceSelect.value) {
            const voices = speechSynthesis.getVoices();
            const selectedVoiceIndex = parseInt(voiceSelect.value);
            if (!isNaN(selectedVoiceIndex) && selectedVoiceIndex >= 0 && selectedVoiceIndex < voices.length) {
                const selectedVoice = voices[selectedVoiceIndex];
                console.log(`Sử dụng giọng đã chọn: ${selectedVoice.name} (${selectedVoice.lang})`);
            }
        }
        
        // Web Speech API
        speakWithBrowserTTS(cleanText, () => {
            console.log("Kết thúc phát toàn bộ văn bản");
            
            // Chỉ dừng nếu không ở trạng thái tạm dừng
            if (isSpeaking && !isPaused) {
                stopTalkingAnimation();
                isSpeaking = false;
                isPaused = false;
                updateSpeechControlButtonsState();
            }
        });
    } else {
        console.log("Sử dụng Server TTS");
        console.log(`Model server được chọn: ${selectedServerModel}`);
        
        // Server TTS
        speakWithServerTTS(cleanText).then(() => {
            console.log("Kết thúc phát toàn bộ văn bản");
            
            // Chỉ dừng nếu không ở trạng thái tạm dừng
            if (isSpeaking && !isPaused) {
                stopTalkingAnimation();
                isSpeaking = false;
                isPaused = false;
                updateSpeechControlButtonsState();
            }
        }).catch(error => {
            console.error('Server TTS error:', error);
            stopTalkingAnimation();
            isSpeaking = false;
            isPaused = false;
            updateSpeechControlButtonsState();
        });
    }
}

function playTextToSpeechRealtime(text) {
    // Dừng bất kỳ âm thanh nào đang phát
    stopAllSpeech();
    
    startTalkingAnimation();
    isSpeaking = true;
    updateSpeechControlButtonsState();
    
    // Sử dụng hàm chung để đảm bảo nhất quán
    speakWithBrowserTTS(text, () => {
        stopTalkingAnimation();
        isSpeaking = false;
        isPaused = false;
        updateSpeechControlButtonsState();
    });
}