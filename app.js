const express = require('express');
const app = express();
const jdRoutes = require('./routes/jdRoutes');

// Thêm các middleware xử lý request trước
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Thêm các middleware bảo mật và session
const sessionMiddleware = require('./middleware/sessionMiddleware');
const securityMiddleware = require('./middleware/security');
app.use(sessionMiddleware);
app.use(securityMiddleware);

// Mount routes sau khi đã setup các middleware
app.use('/jd', jdRoutes);