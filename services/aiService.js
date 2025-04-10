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
     * Generate interview questions based on a job description
     * @param {string} jdText - Job description text
     * @param {string} targetLanguage - Target language for the response
     * @returns {Object} JSON object containing questions and HTML formatted content
     */
    async generateQuestion(jdText, targetLanguage) {
        const prompt = `You are an assistant who creates interview questions based on the job description (JD) below.

                First, check if the input contains the typical elements of a job description (e.g., tasks, responsibilities, professional requirements, required skills, etc.).

                - If not, reply with a JSON object: {"isValid": false, "message": "The input is not a job description (JD)"}

                - If valid, create 5-10 interview questions that are relevant to that field that match the number of years of experience and level in the JD. If the JD is about programming, include code, algorithm and solution questions at the level that matches the required number of years of experience in the JD.

                Return your response as a JSON object with this structure:
                {
                  "isValid": true,
                  "questions": [
                    {
                      "id": 1,
                      "question": "Full text of question 1"
                    },
                    {
                      "id": 2,
                      "question": "Full text of question 2"
                    },
                    ...
                  ],
                  "introduction": "A brief introduction to the questions (optional)"
                }

                If the JD is not about programming, return the questions in a simple and straightforward manner.

                If the JD is about programming, include code, algorithm and solution questions at the level that matches the required number of years of experience in the JD.
                Response language: ${targetLanguage}.

        -----------------------
        ${jdText}
        -----------------------

        Reply in language ${targetLanguage}.`;

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || '{"isValid": false, "message": "No response from AI."}';
            
            // Enhanced JSON parsing with cleanup
            let jsonResponse;
            try {
                // Clean up common issues that might break JSON parsing
                let cleanedResponse = responseText
                    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                    .replace(/\\(?!["\\/bfnrtu])/g, '\\\\') // Fix invalid escapes
                    .replace(/\n/g, '\\n') // Handle newlines
                    .replace(/\r/g, '\\r'); // Handle carriage returns

                // Find the JSON content (everything between the first { and last })
                const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : cleanedResponse;

                // Parse the cleaned JSON
                jsonResponse = JSON.parse(jsonString);
            } catch (error) {
                console.error("Failed to parse JSON response:", error);
                console.log("Raw response:", responseText);
                
                // Create a fallback response
                jsonResponse = {
                    isValid: true,
                    questions: [{
                        id: 1,
                        question: "Failed to parse response. Please try again."
                    }],
                    introduction: "Error parsing response"
                };
            }

            // Generate HTML version for backward compatibility
            let htmlContent = '';
            if (jsonResponse.isValid) {
                htmlContent = `<div class="interview-questions">`;
                if (jsonResponse.introduction) {
                    htmlContent += `<p>${jsonResponse.introduction}</p>`;
                }
                htmlContent += `<ol>`;
                jsonResponse.questions.forEach(q => {
                    htmlContent += `<li>${q.question}</li>`;
                });
                htmlContent += `</ol></div>`;
            } else {
                htmlContent = `<p>${jsonResponse.message || "Invalid job description"}</p>`;
            }
            
            // Return both JSON and HTML
            return {
                json: jsonResponse,
                html: htmlContent
            };
        } catch (error) {
            console.error("Error generating questions:", error);
            return {
                json: {
                    isValid: false,
                    message: "Error generating questions"
                },
                html: "<p>Error generating questions</p>"
            };
        }
    }

    /**
     * Evaluate an answer to an interview question
     * @param {string} jdText - Job description text
     * @param {string} question - Interview question
     * @param {string} answer - Candidate's answer
     * @returns {string} HTML content with the evaluation
     */
    async evaluateAnswer(jdText, question, answer) {
        const prompt = `You are an experienced and very demanding HR professional. Evaluate the candidate's response to the interview question based on the job description (JD).
            
            JD: ${jdText}
            Interview Question: ${question}
            Candidate's Answer: ${answer}

            Provide your evaluation in the following JSON format:
            {
                "score": number (0-10),
                "relevance": "assessment of answer's relevance to JD and question",
                "strengths": ["list", "of", "strengths"],
                "weaknesses": ["list", "of", "weaknesses"],
                "detailedFeedback": {
                    "clarity": {
                        "score": number (0-10),
                        "comments": "evaluation of answer clarity"
                    },
                    "content": {
                        "score": number (0-10),
                        "comments": "evaluation of answer content"
                    },
                    "delivery": {
                        "score": number (0-10),
                        "comments": "evaluation of answer structure and delivery"
                    }
                },
                "improvementSuggestions": ["list", "of", "specific", "suggestions"],
                "overallComment": "general assessment and conclusion"
            }

            Ensure the response is a valid JSON object. Answer in the language of the Interview Question.`;
    
        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || '{}';
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : responseText;
            const evaluation = JSON.parse(jsonString);
            
            // Generate HTML for backward compatibility
            const htmlContent = this.formatEvaluationHtml(evaluation);
            
            return {
                json: evaluation,
                html: htmlContent
            };
        } catch (error) {
            console.error("Error evaluating answer:", error);
            return {
                json: {
                    score: 0,
                    error: "Failed to evaluate answer"
                },
                html: "<p>Error evaluating answer</p>"
            };
        }
    }

    // Add this helper method to format JSON evaluation as HTML
    formatEvaluationHtml(evaluation) {
        return `
            <div class="evaluation-result">
                <h4>Overall Score: ${evaluation.score}/10</h4>
                <p><strong>Relevance:</strong> ${evaluation.relevance}</p>
                
                <h5>Strengths:</h5>
                <ul>
                    ${evaluation.strengths.map(s => `<li>${s}</li>`).join('')}
                </ul>
                
                <h5>Areas for Improvement:</h5>
                <ul>
                    ${evaluation.weaknesses.map(w => `<li>${w}</li>`).join('')}
                </ul>
                
                <h5>Detailed Feedback:</h5>
                <div class="detailed-scores">
                    <p><strong>Clarity:</strong> ${evaluation.detailedFeedback.clarity.score}/10 - ${evaluation.detailedFeedback.clarity.comments}</p>
                    <p><strong>Content:</strong> ${evaluation.detailedFeedback.content.score}/10 - ${evaluation.detailedFeedback.content.comments}</p>
                    <p><strong>Delivery:</strong> ${evaluation.detailedFeedback.delivery.score}/10 - ${evaluation.detailedFeedback.delivery.comments}</p>
                </div>
                
                <h5>Suggestions for Improvement:</h5>
                <ul>
                    ${evaluation.improvementSuggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
                
                <p><strong>Overall Assessment:</strong> ${evaluation.overallComment}</p>
            </div>
        `;
    }

    /**
     * Generate guidance on how to answer an interview question
     * @param {string} jdText - Job description text
     * @param {string} question - Interview question
     * @returns {string} HTML content with the guidance
     */
    async generateGuidance(jdText, questions) {
        const guidancePromises = questions.map(async (question) => {
            const prompt = `You are an expert interview coach. Based on the following job description (JD) and interview question, provide guidance on how to effectively answer this question.

                JD: ${jdText}

                Interview Question: ${question.question}

                Please provide:
                1. Key Points to Include
                2. Structure for Your Answer
                3. Common Mistakes to Avoid
                4. Example Framework (if applicable)
                5. Relevant Skills to Highlight

                Format your response in markdown with clear headings and bullet points.`;

            const response = await this.model.generateContent(prompt);
            const guidance = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No guidance generated.';
            
            return {
                id: question.id,
                question: question.question,
                guidance: guidance
            };
        });
    
        return Promise.all(guidancePromises);
    }

    /**
     * Generate a sample answer to an interview question
     * @param {string} jdText - Job description text
     * @param {string} question - Interview question
     * @param {string} guidance - Optional guidance for answering
     * @returns {string} HTML content with the sample answer
     */
    async generateAnswer(jdText, questions, guidance = '') {
        // Handle array of questions
        if (Array.isArray(questions)) {
            const answerPromises = questions.map(async (q) => {
                const prompt = `You are an expert candidate interviewing for a position. Based on the following job description (JD), interview question, and guidance (if provided), generate a high-quality sample answer.

                    JD: ${jdText}

                    Interview Question: ${q.question}
                    
                    ${guidance ? `Guidance: ${guidance}` : ''}

                    Please provide a comprehensive, well-structured answer that:
                    1. Directly addresses the question
                    2. Demonstrates relevant skills and experience
                    3. Uses specific examples where appropriate
                    4. Aligns with the requirements in the job description
                    5. Shows enthusiasm and cultural fit

                    Format your response as if you are the candidate speaking in an interview. Make it sound natural and conversational while being professional.`;

                const answer = await this.generateContent(prompt);
                return {
                    id: q.id,
                    question: q.question,
                    answer: answer
                };
            });

            const results = await Promise.all(answerPromises);
            
            // Format all answers into a single HTML document
            let combinedHtml = '<div class="sample-answers-container">';
            for (const result of results) {
                combinedHtml += `
                    <div class="sample-answer-item mb-4">
                        <h4>Question ${result.id}: ${result.question}</h4>
                        <div class="sample-answer-content">${result.answer}</div>
                    </div>
                `;
            }
            combinedHtml += '</div>';
            
            return combinedHtml;
        } else {
            // Handle single question case (backward compatibility)
            const prompt = `You are an expert candidate...`;
            return this.generateContent(prompt);
        }
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