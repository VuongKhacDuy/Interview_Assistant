require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use('/static', express.static(path.join(__dirname, 'public')));

// API Key Check Middleware
app.use((req, res, next) => {
    // Allow access to static files and API key submission route without checking
    if (req.path.includes('/static/') || req.path === '/submit-api-key') {
        return next();
    }

    // Check for API key
    if (!process.env.GEN_API_KEY || process.env.GEN_API_KEY === '') {
        console.log('No API key found, redirecting to API key form');
        return res.render('api-key-form', {
            message: 'Bạn chưa có GPT KEY, hãy thực hiện cách sau và nhập KEY vào đây để tiếp tục. API key lây tại đây https://aistudio.google.com/apikey'
        });
    }
    next();
});

// Routes
app.post('/submit-api-key', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).render('api-key-form', {
            message: 'API Key is required'
        });
    }
    // Save API key to environment variable
    process.env.GEN_API_KEY = apiKey;
    console.log('API key set successfully');
    res.redirect('/');
});

const jdRoutes = require('./routes/jdRoutes');
app.use('/', jdRoutes);

const PORT = process.env.PORT || 3000;
// Error handling for port in use
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});