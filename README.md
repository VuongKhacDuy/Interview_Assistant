# Interview Assistant

Ứng dụng hỗ trợ phỏng vấn sử dụng AI để tạo câu hỏi và đánh giá câu trả lời dựa trên mô tả công việc (JD).

## Tính năng chính

- Tạo câu hỏi phỏng vấn từ JD
- Đánh giá câu trả lời
- Hỗ trợ đa ngôn ngữ (Tiếng Việt, English, 中文)
- Tải lên file PDF
- Tạo hướng dẫn trả lời
- Tạo thư xin việc

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/yourusername/interview-assistant.git
cd interview-assistant
```

<!-- ## Cấu Hình

Tạo file `.env` ở thư mục gốc và thêm thông tin sau:

```ini
GEN_API_KEY=your_google_api_key_here
PORT=3000
```

> **Chú ý:** Thay `your_google_api_key_here` bằng API key của bạn. API key lây tại đây https://aistudio.google.com/apikey -->

## Chạy Ứng Dụng

Bạn có thể chạy ứng dụng theo các cách sau:

### Chạy bình thường

```bash
npm start
```

### Chạy trong môi trường phát triển (sử dụng nodemon)

```bash
npm run dev
```
<!-- 
### Chạy với PM2 (trong môi trường production)

```bash
npm run pm2
``` -->
<!-- 
Để dừng PM2, sử dụng:

```bash
npm run stoppm2
``` -->


### Chạy với file trong dist 

jd-assistant-mac cho MacOS
jd-assistant-win.exe cho win

### Chạy với file Make
ow you can use the following commands:

- make install - Install dependencies
- make dev - Run in development mode
- make start - Run in production mode
- make build - Build for both platforms
- make build-win - Build for Windows only
- make build-mac - Build for Mac only
- make clean - Clean up
- make help - Show available commands

## Cách Sử Dụng

1. **Mở trang web:** Sau khi chạy server, mở trình duyệt và truy cập [http://localhost:3000/](http://localhost:3000/).
2. **Nhập JD hoặc Upload PDF:** Bạn có thể nhập trực tiếp mô tả công việc (JD) hoặc upload file PDF chứa JD.
3. **Chọn ngôn ngữ phỏng vấn:** Sử dụng dropdown để chọn ngôn ngữ phỏng vấn (ví dụ: Tiếng Việt, English, 中文, …).
4. **Tạo câu hỏi:** Nhấn nút "Cho tôi câu hỏi" để tạo ra một câu hỏi phỏng vấn dựa trên JD.
5. **Trả lời câu hỏi:** Sau khi câu hỏi được hiển thị, bạn có thể nhập câu trả lời vào editor (với hỗ trợ chọn ngôn ngữ lập trình nếu cần) và gửi.
6. **Xem kết quả:** Kết quả đánh giá sẽ được hiển thị dựa trên câu trả lời của bạn.

## Scripts

Trong file `package.json`, bạn có các scripts sau:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "pm2": "pm2 start server.js --name jdassistant --env production",
  "stoppm2": "pm2 stop server.js"
}
```

* **start:** Chạy ứng dụng bằng Node.js.
* **dev:** Chạy ứng dụng trong chế độ phát triển sử dụng nodemon để tự động reload.
* **pm2:** Chạy ứng dụng sử dụng PM2 cho môi trường production.
* **stoppm2:** Dừng ứng dụng đang chạy bằng PM2.

---

**Chúc bạn thành công với dự án JD Assistant!**
