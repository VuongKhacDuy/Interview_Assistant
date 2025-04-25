const crypto = require('crypto');

class SessionService {
    constructor() {
        this.sessions = new Map();
    }

    // Tạo session mới
    createSession(userId) {
        const sessionId = crypto.randomUUID();
        const session = {
            id: sessionId,
            userId,
            createdAt: new Date(),
            lastAccessed: new Date(),
            state: {
                jdText: null,
                questions: [],
                currentQuestion: null,
                answers: {},
                guidance: null,
                interviewLanguage: 'vi'
            }
        };
        
        this.sessions.set(sessionId, session);
        return sessionId;
    }

    // Lấy thông tin session
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastAccessed = new Date();
            return session;
        }
        return null;
    }

    // Cập nhật trạng thái session
    updateSessionState(sessionId, newState) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.state = { ...session.state, ...newState };
            session.lastAccessed = new Date();
            return true;
        }
        return false;
    }

    // Xóa session cũ
    cleanupSessions() {
        const expiryTime = 24 * 60 * 60 * 1000; // 24 giờ
        const now = new Date();
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastAccessed > expiryTime) {
                this.sessions.delete(sessionId);
            }
        }
    }
}

module.exports = new SessionService();