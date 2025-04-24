const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');

/**
 * Service for interacting with Google Generative AI
 */
class AIService {
    /**
     * Initialize the AI service with an API key
     * @param {string} apiKey - Google Generative AI API key
     */
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    /**
     * Generate content using the AI model
     * @param {string} prompt - The prompt to send to the AI
     * @returns {string} HTML content generated from markdown response
     */
    async generateContent(prompt) {
        const result = await this.model.generateContent(prompt);
        const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'No response from AI.';
        return marked(rawMarkdown);
    }

    /**
     * Generate an interview question based on a job description
     * @param {string} jdText - Job description text
     * @param {string} targetLanguage - Target language for the response
     * @returns {string} HTML content with the generated question
     */
    async generateQuestion(jdText, targetLanguage) {
        const prompt = `You are an assistant who creates interview questions based on the job description (JD) below.

                First, check if the input contains the typical elements of a job description (e.g., tasks, responsibilities, professional requirements, required skills, etc.).

                - If not, reply: "The input is not a job description (JD)".

                - If valid, suggest some interview questions that are relevant to that field that match the number of years of experience and level in the JD, then select one question for the user to answer (if the JD is about programming, you can ask about code, algorithm and solution questions at the level that matches the required number of years of experience in the JD).
                Response language: ${targetLanguage}.

        -----------------------
        ${jdText}
        -----------------------

        Reply in language ${targetLanguage}.`;

        return this.generateContent(prompt);
    }

    /**
     * Evaluate an answer to an interview question
     * @param {string} jdText - Job description text
     * @param {string} question - Interview question
     * @param {string} answer - Candidate's answer
     * @returns {string} HTML content with the evaluation
     */
    async evaluateAnswer(jdText, question, answer) {
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

        return this.generateContent(prompt);
    }

    /**
     * Generate guidance on how to answer an interview question
     * @param {string} jdText - Job description text
     * @param {string} question - Interview question
     * @returns {string} HTML content with the guidance
     */
    async generateGuidance(jdText, question) {
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

        return this.generateContent(prompt);
    }

    /**
     * Generate a sample answer to an interview question
     * @param {string} jdText - Job description text
     * @param {string} question - Interview question
     * @param {string} guidance - Optional guidance for answering
     * @returns {string} HTML content with the sample answer
     */
    async generateAnswer(jdText, question, guidance = '') {
        const prompt = `You are an expert candidate interviewing for a position. Based on the following job description (JD), interview question, and guidance (if provided), generate a high-quality sample answer.

            JD: ${jdText}

            Interview Question: ${question}
            
            ${guidance ? `Guidance: ${guidance}` : ''}

            Please provide a comprehensive, well-structured answer that:
            1. Directly addresses the question
            2. Demonstrates relevant skills and experience
            3. Uses specific examples where appropriate
            4. Aligns with the requirements in the job description
            5. Shows enthusiasm and cultural fit

            Format your response as if you are the candidate speaking in an interview. Make it sound natural and conversational while being professional.`;

        return this.generateContent(prompt);
    }

    /**
     * Generate an answer for a specific interview question
     * @param {string} jdText - Job description text
     * @param {string} specificQuestion - The specific interview question
     * @returns {string} HTML content with the answer
     */
    async answerSpecificQuestion(jdText, specificQuestion) {
        const prompt = `You are an expert candidate interviewing for a position. Based on the following job description (JD) and specific interview question, generate a high-quality answer.

            JD: ${jdText}

            Specific Interview Question: ${specificQuestion}

            Please provide a comprehensive, well-structured answer that:
            1. Directly addresses the question
            2. Demonstrates relevant skills and experience that match the JD
            3. Uses specific examples where appropriate
            4. Aligns with the requirements in the job description
            5. Shows enthusiasm and cultural fit

            Format your response as if you are the candidate speaking in an interview. Make it sound natural and conversational while being professional.`;

        return this.generateContent(prompt);
    }

    /**
     * Translate text to a target language
     * @param {string} text - Text to translate
     * @param {string} targetLanguage - Target language name (e.g., "Vietnamese")
     * @param {string} contentType - Type of content being translated
     * @returns {string} HTML content with the translated text
     */
    async translateText(text, targetLanguage, contentType = 'text') {
        const prompt = `Translate the following ${contentType} to ${targetLanguage}. Maintain all formatting, including markdown, bullet points, and numbered lists:

${text}

Translation:`;

        return this.generateContent(prompt);
    }
}

module.exports = AIService;