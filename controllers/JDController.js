const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const pdfParse = require('pdf-parse');

// Get API key from .env environment variable (GEN_API_KEY)
const GEN_API_KEY = process.env.GEN_API_KEY;
if (!GEN_API_KEY) {
    console.error("GEN_API_KEY is not defined in .env file");
}

// Map to save user cooldown status (based on IP)
const userCooldowns = new Map();

/**
 * Render JD interface (JD input form or PDF upload)
 */
exports.renderJDView = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;

        res.render('jd', {
            title: 'JD Assistant',
            showApiKeyForm: !apiKey,
            message: !apiKey ? ' You need to enter Google API Key to use the application. Follow these steps:\n\n1. Go to https://aistudio.google.com/apikey\n2. Log in to your Google account\n3. Create a new API Key\n4. Copy and paste the API Key into the form below' : ''
        });
    } catch (error) {
        console.error('Error rendering JD view:', error);
        res.status(500).send('Internal Server Error.');
    }
};

exports.generateQuestion = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.render('jd', {
                title: 'JD Assistant',
                showApiKeyForm: true,
                message: 'You need to enter Google API Key to use the application. Follow these steps:\n\n1. Go to https://aistudio.google.com/apikey\n2. Log in to your Google account\n3. Create a new API Key\n4. Copy and paste the API Key into the form below'
            });
        }

        // Initialize GenAI with the API key from cookies
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        let { jdText, interviewLanguage } = req.body;
        // Nếu người dùng upload file PDF thì ưu tiên đọc nội dung từ file
        if (req.file) {
            const dataBuffer = req.file.buffer;
            const pdfData = await pdfParse(dataBuffer);
            jdText = pdfData.text;
        }
        console.log(jdText);
        if (!jdText) {
            return res.status(400).json({ error: 'JD text is required.' });
        }
        // Nếu chưa chọn ngôn ngữ phỏng vấn, đặt mặc định là 'vi'
        if (!interviewLanguage) {
            interviewLanguage = 'vi';
        }

        // Kiểm tra cooldown: chỉ cho phép gửi yêu cầu mỗi 5 giây
        const userId = req.ip;
        const now = Date.now();
        const lastRequestTime = userCooldowns.get(userId);
        const cooldownPeriod = 5 * 1000;
        if (lastRequestTime && now - lastRequestTime < cooldownPeriod) {
            const remainingTime = Math.ceil((cooldownPeriod - (now - lastRequestTime)) / 1000);
            return res.status(429).json({ error: `Please wait ${remainingTime} seconds before sending a new request.` });
        }
        userCooldowns.set(userId, now);

        // Map converts interview language code (eg 'vi', 'en', 'zh') to display name
        const languageMap = {
            vi: 'Tiếng Việt',
            en: 'English',
            zh: '中文'
        };
        const targetLanguage = languageMap[interviewLanguage] || 'English';

        // Tạo prompt dùng một template duy nhất:
        // - Kiểm tra đầu vào có chứa các đặc trưng của JD hay không.
        // - Nếu hợp lệ, gợi ý câu hỏi và chọn ra 1 câu hỏi duy nhất.
        const prompt = `You are an assistant who creates interview questions based on the job description (JD) below.

                        First, check if the input contains the typical elements of a job description (e.g., tasks, responsibilities, professional requirements, required skills, etc.).

                        - If not, reply: "The input is not a job description (JD)".

                        - If valid, suggest some interview questions that are relevant to that field that match the number of years of experience and level in the JD, then select one question for the user to answer (if the JD is about programming, you can ask about code, algorithm and solution questions at the level that matches the required number of years of experience in the JD).
                        Response language: ${targetLanguage}.

        -----------------------
        ${jdText}
        -----------------------

        Reply in language ${targetLanguage}.`;

        // Call Google Generative AI API with created prompt
        const result = await model.generateContent(prompt);
        const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'No response from AI.';
        const htmlContent = marked(rawMarkdown);

        // Returns the query along with the original JD content
        res.json({ question: htmlContent, jdText });
    } catch (error) {
        console.error('Error generating question:', error);
        res.status(500).json({ error: 'Failed to generate question.' });
    }
};

exports.evaluateAnswer = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.render('jd', {
                title: 'JD Assistant',
                showApiKeyForm: true,
                message: 'You need to enter Google API Key to use the application. Follow these steps:\n\n1. Go to https://aistudio.google.com/apikey\n2. Log in to your Google account\n3. Create a new API Key\n4. Copy and paste the API Key into the form below'
            });
        }

        const { jdText, question, answer } = req.body;
        if (!jdText || !question || !answer) {
            return res.status(400).json({ error: 'JD, questions and answers are all required.' });
        }

        // Initialize GenAI with the API key from cookies
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Create an assessment prompt based on the JD, created questions, and candidate answers. 
        // Detailed instructions on how to evaluate answers.
        const prompt = `You are an experienced and very demanding HR professional, tasked with evaluating in detail the candidate's responses to the single interview question below, created based on the job description (JD).

            JD: ${jdText}

            Interview questions: ${question}

            Candidate's answers: ${answer}

            Follow these steps:

            1. Analyze the JD content to identify key requirements and criteria.

            2. Evaluate the response's relevance to those criteria, clarity, logic, and practicality.

            3. Score the overall response out of 10 (10 being perfect).

            4. Score each response in detail.

            5. Explain each point in detail.

            6. Give an overall assessment of the response's relevance.

            7. Give detailed assessment of the strengths and weaknesses of the response.

            8. If the score is below 4, state the dissatisfaction, give advice for improvement for next time, such as preparing before the interview.

            9. If the score is below 5, give a weak suggestion for improvement; Give specific suggestions for improving the response.

            10. If the score is 5 or above, just give a brief comment. points for improvement.

            Answer in the language of the Interview Question in a professional and clear manner.`;

        // Call Google Generative AI API to get evaluation results
        const result = await model.generateContent(prompt);
        const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'No response from AI.';
        const htmlContent = marked(rawMarkdown);

        // Return the evaluation results
        res.json({ evaluation: htmlContent });
    } catch (error) {
        console.error('Error evaluating answer:', error);
        res.status(500).json({ error: 'Failed to evaluate answer.' });
    }
};

exports.generateGuidance = async (req, res) => {
    try {
        const apiKey = req.cookies?.apiKey;
        if (!apiKey) {
            return res.render('jd', {
                title: 'JD Assistant',
                showApiKeyForm: true,
                message: 'You need to enter Google API Key to use the application. Follow these steps:\n\n1. Go to https://aistudio.google.com/apikey\n2. Log in to your Google account\n3. Create a new API Key\n4. Copy and paste the API Key into the form below'
            });
        }

        const { jdText, question } = req.body;
        if (!jdText || !question) {
            return res.status(400).json({ error: 'JD and question are required.' });
        }

        // Initialize GenAI with the API key from cookies
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Create a prompt to generate guidance on how to answer the interview question
        const prompt = `You are an expert interview coach. Based on the following job description (JD) and interview question, provide guidance on how to effectively answer this question.

            JD: ${jdText}

            Interview Question: ${question}

            Please provide:
            1. A structured approach to answering this question
            2. Key points that should be included in the answer
            3. Common mistakes to avoid
            4. Examples or frameworks that could be used (if applicable)
            5. How to tailor the answer to highlight relevant skills from the JD

            Format your response in a clear, concise manner with bullet points and sections.`;

        // Call Google Generative AI API to get guidance
        const result = await model.generateContent(prompt);
        const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'No response from AI.';
        const htmlContent = marked(rawMarkdown);

        // Return the guidance
        res.json({ guidance: htmlContent });
    } catch (error) {
        console.error('Error generating guidance:', error);
        res.status(500).json({ error: 'Failed to generate guidance.' });
    }
};