const apiKeyCheck = (req, res, next) => {
    if (!process.env.GEN_API_KEY && req.path !== '/submit-api-key' && !req.path.includes('/static/')) {
        return res.render('api-key-form', {
            message: 'Bạn chưa có GPT KEY, hãy thực hiện cách sau và nhập KEY vào đây để tiếp tục. API key lây tại đây https://aistudio.google.com/apikey'
        });
    }
    next();
};

module.exports = apiKeyCheck;