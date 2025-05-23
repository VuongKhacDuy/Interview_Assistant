const express = require('express');
const router = express.Router();
const AlgorithmController = require('../controllers/AlgorithmController');

// Route để hiển thị giao diện giải thuật
router.get('/algorithm', AlgorithmController.renderAlgorithmView);

// Route để xử lý yêu cầu giải bài toán
router.post('/algorithm/solve', AlgorithmController.solveProblem);

// Route để xử lý yêu cầu kiểm tra văn bản
router.post('/algorithm/analyze', AlgorithmController.analyzeAlternativeSolution);

module.exports = router;