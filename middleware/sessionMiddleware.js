const sessionService = require('../services/sessionService');

module.exports = (req, res, next) => {
    // Lấy sessionId từ cookie
    let sessionId = req.cookies?.sessionId;
    
    // Nếu không có session hoặc session không hợp lệ, tạo session mới
    if (!sessionId || !sessionService.getSession(sessionId)) {
        // Tạo userId tạm thời (có thể thay bằng user authentication sau này)
        const tempUserId = Date.now().toString();
        sessionId = sessionService.createSession(tempUserId);
        
        // Set cookie với thời hạn 24 giờ
        res.cookie('sessionId', sessionId, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
    }

    // Thêm session vào request để các middleware và route khác có thể sử dụng
    req.session = sessionService.getSession(sessionId);
    next();
};