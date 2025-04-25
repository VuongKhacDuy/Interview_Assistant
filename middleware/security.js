const xss = require('xss');

const sanitizeInput = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            sanitized[key] = xss(obj[key], {
                whiteList: {}, // Không cho phép bất kỳ tag HTML nào
                stripIgnoreTag: true, // Loại bỏ tất cả các tag không được phép
                stripIgnoreTagBody: ['script', 'style', 'iframe'], // Loại bỏ nội dung của các tag nguy hiểm
            });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitized[key] = sanitizeInput(obj[key]);
        } else {
            sanitized[key] = obj[key];
        }
    }

    return sanitized;
};

module.exports = (req, res, next) => {
    // Sanitize body
    if (req.body) {
        req.body = sanitizeInput(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeInput(req.query);
    }

    // Sanitize cookies
    if (req.cookies) {
        req.cookies = sanitizeInput(req.cookies);
    }

    next();
};