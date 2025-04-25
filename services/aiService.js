const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const constants = require('../config/constants');

class AIService {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ 
            model: constants.API.MODELS.GEMINI_2_FLASH
        });
    }

    /**
     * Generates interview questions based on job description
     * @param {string} jdText - Job description text
     * @param {string} targetLanguage - Target language for questions
     * @returns {Promise<Object>} Generated questions and HTML formatted content
     * @throws {Error} If generation fails
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
        if (Array.isArray(questions)) {
            const answerPromises = questions.map(async (q) => {
                const prompt = `Based on this exact Job Description:
    ${jdText}
    
    As a professional matching these requirements, answer this interview question:
    
    Question: ${q.question}
    
    Structure your answer to:
    1. Use the exact technologies, skills, and requirements mentioned in this JD
    2. Show experience level matching the JD requirements
    3. Follow STAR method with examples specific to this role:
       - Situation: Use scenario relevant to this job's industry
       - Task: Address challenges mentioned in the JD
       - Action: Apply skills listed in the JD
       - Result: Show impacts relevant to the role's requirements
    
    For technical questions, use examples with the specific technologies mentioned in the JD.`;
    
                const answer = await this.generateContent(prompt);
                return {
                    id: q.id,
                    question: q.question,
                    answer: answer
                };
            });
    
            const answers = await Promise.all(answerPromises);
            return { answers }; // Return in the format expected by frontend
        } else {
            // Handle single question case
            const prompt = `Based on this Job Description:
    ${jdText}
    
    Answer this interview question:
    ${questions}
    
    Use the exact requirements and skills from the JD in your answer.`;
            const answer = await this.generateContent(prompt);
            return { 
                answers: [{
                    id: 1,
                    question: questions,
                    answer: answer
                }]
            };
        }
    }

    async answerSpecificQuestion(jdText, question) {
        const prompt = `Based on this Job Description:
    ${jdText}

    Please provide a detailed answer to this specific interview question:
    ${question}

    Structure your answer to:
    1. Directly address the question
    2. Use relevant experience and skills from the JD
    3. Follow the STAR method where applicable:
       - Situation: Context relevant to the role
       - Task: Specific challenges
       - Action: Steps taken using skills from JD
       - Result: Measurable outcomes

    If it's a technical question, include specific examples using technologies mentioned in the JD.`;

        try {
            const result = await this.model.generateContent(prompt);
            const rawAnswer = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || '';
            const htmlAnswer = marked(rawAnswer); // Convert markdown to HTML
            
            return {
                success: true,
                question: question,
                answer: htmlAnswer
            };
        } catch (error) {
            console.error('Error generating specific answer:', error);
            return {
                success: false,
                error: 'Failed to generate answer'
            };
        }
    }
    
    async generateCoverLetter(jdText, userInfo = {}) {
        const { 
            fullName = '', 
            phone = '', 
            email = '', 
            recipientName = 'Hiring Manager',
            date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        } = userInfo;
    
        const prompt = `Create a professional cover letter with exact formatting as follows:
    
        ${fullName}
        ${phone}
        ${email}
    
        ${date}
    
        Dear ${recipientName},
    
        [First Paragraph: Express strong interest in the position based on the job description. Mention how your background aligns with the role.]
    
        [Second Paragraph: Highlight your most relevant achievements and experiences that match the job requirements. Use specific numbers and awards if applicable. Reference the following job description:
        ${jdText}
        ]
    
        [Final Paragraph: Thank them for their consideration, express enthusiasm about the opportunity, and include a call to action.]
    
        Sincerely,
        ${fullName}`;
    
        try {
            const result = await this.model.generateContent(prompt);
            const coverLetter = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate cover letter.';
            
            // Format the letter with proper styling and spacing
            const formattedLetter = `
                <div style="white-space: pre-line; font-family: Arial, sans-serif; line-height: 1.6; margin: 2em;">
                    ${coverLetter}
                </div>
            `;
            
            return {
                success: true,
                coverLetter: formattedLetter
            };
        } catch (error) {
            console.error('Error generating cover letter:', error);
            return {
                success: false,
                error: 'Failed to generate cover letter'
            };
        }
    }

    async translateText(text, targetLanguage, contentType = 'text') {
        const prompt = `Translate the following ${contentType} to ${targetLanguage}. Maintain all formatting, including markdown, bullet points, and numbered lists:
    
        ${text}
    
        Translation:`;
    
        try {
            const result = await this.model.generateContent(prompt);
            const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'Translation failed.';
            return marked(rawMarkdown);
        } catch (error) {
            console.error('Translation error:', error);
            throw new Error('Failed to translate text');
        }
    }
}

module.exports = AIService;