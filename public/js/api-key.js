document.addEventListener('DOMContentLoaded', function() {
    const apiKeyForm = document.getElementById('apiKeyForm');
    if (apiKeyForm) {
        apiKeyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const apiKey = document.getElementById('apiKey').value.trim(); // Thêm trim() để loại bỏ khoảng trắng
            if (!apiKey || !/^[A-Za-z0-9-_]+$/.test(apiKey)) {
                alert('API Key không hợp lệ. API Key chỉ được chứa chữ cái, số và dấu gạch ngang.');
                return;
            }

            try {
                const response = await fetch('/jd/set-api-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ apiKey })
                });

                if (!response.ok) {
                    if (response.status === 400) {
                        throw new Error('API Key không hợp lệ. Vui lòng kiểm tra và thử lại.');
                    } else if (response.status === 429) {
                        throw new Error('Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát và thử lại.');
                    } else {
                        throw new Error('Có lỗi xảy ra khi kết nối với máy chủ. Vui lòng thử lại sau.');
                    }
                }

                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }

                // Nếu thành công, reload trang
                window.location.reload();
            } catch (error) {
                console.error('Lỗi:', error);
                let errorMessage = 'Không thể lưu API Key: ';
                
                if (error.message.includes('API Key không hợp lệ')) {
                    errorMessage += 'API Key không hợp lệ. Vui lòng kiểm tra:\n' +
                        '1. API Key có đúng định dạng không?\n' +
                        '2. API Key đã được kích hoạt chưa?\n' +
                        '3. Tài khoản có đủ quota không?';
                } else {
                    errorMessage += error.message;
                }
                
                alert(errorMessage);
            }
        });
    }
});