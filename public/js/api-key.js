document.addEventListener('DOMContentLoaded', function() {
    const apiKeyForm = document.getElementById('apiKeyForm');
    if (apiKeyForm) {
        apiKeyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const apiKey = document.getElementById('apiKey').value;
            
            try {
                const response = await fetch('/jd/set-api-key', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ apiKey })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    window.location.reload();
                } else {
                    alert('Không thể lưu API key: ' + (data.error || 'Vui lòng thử lại'));
                }
            } catch (error) {
                console.error('Lỗi khi lưu API key:', error);
                alert('Có lỗi xảy ra khi lưu API key. Vui lòng thử lại sau.');
            }
        });
    }
});