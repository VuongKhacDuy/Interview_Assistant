const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
require('dotenv').config();

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;

// Route để hiển thị trang More Jobs
router.get('/more-jobs', (req, res) => {
    res.render('more-jobs', { 
        title: 'More Jobs',
        showApiKeyForm: !req.cookies.apiKey,
        message: null 
    });
});

router.post('/search', async (req, res) => {
    const { keywords, location, country, sortBy, page = 1 } = req.body;
    
    try {
        const params = new URLSearchParams({
            app_id: ADZUNA_APP_ID,
            app_key: ADZUNA_API_KEY,
            results_per_page: 10,
            what: keywords,
            where: location,
            sort_by: sortBy,
            page: page
        });

        const response = await fetch(
            `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params.toString()}`
        );

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

module.exports = router;