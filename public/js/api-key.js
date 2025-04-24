document.addEventListener('DOMContentLoaded', function() {
    const apiKeyForm = document.getElementById('apiKeyForm');
    
    if (apiKeyForm) {
        apiKeyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                alert('Vui lòng nhập API key');
                return;
            }

            try {
                const response = await fetch('/api/set-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'  // Thêm header này
                    },
                    credentials: 'same-origin',  // Thêm option này để gửi cookies
                    body: JSON.stringify({ apiKey })
                });

                // Kiểm tra response type
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server không trả về JSON response');
                }

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Không thể lưu API key');
                }

                if (data.success) {
                    window.location.reload();
                } else {
                    throw new Error('Không thể lưu API key');
                }
            } catch (error) {
                console.error('Lỗi khi lưu API key:', error);
                alert(error.message);
            }
        });
    }
});