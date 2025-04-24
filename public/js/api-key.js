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
                // Thay đổi endpoint từ /api/set-key thành /api/key/set
                const response = await fetch('/api/key/set', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ apiKey })
                });

                // Kiểm tra response type
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server không trả về JSON response. Vui lòng kiểm tra lại cấu hình server.');
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
                alert(`Lỗi: ${error.message}`);
            }
        });
    }
});