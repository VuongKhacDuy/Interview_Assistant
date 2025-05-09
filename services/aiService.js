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
        try {
            const result = await this.model.generateContent(prompt);
            const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'No response from AI.';
            return marked(rawMarkdown);
        } catch (error) {
            // Add retry logic for 503 errors
            if (error.status === 503) {
                // Wait for 2 seconds and try again
                await new Promise(resolve => setTimeout(resolve, 2000));
                const result = await this.model.generateContent(prompt);
                const rawMarkdown = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'No response from AI.';
                return marked(rawMarkdown);
            }
            throw error;
        }
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

    async translate(sourceText, sourceLanguage, targetLanguage, translationType, preserveFormatting = false) {
        let prompt;
        if (preserveFormatting) {
            prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
            Translation type: ${translationType}.
            IMPORTANT: Preserve all formatting, including line breaks, spaces, and special characters exactly as they appear in the source text.

            Source text:
            ${sourceText}

            Translated text:`;
        } else {
            prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
            Translation type: ${translationType}.

            Source text:
            ${sourceText}

            Translated text:`;
        }

        try {
            const result = await this.model.generateContent(prompt);
            return result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Translation failed';
        } catch (error) {
            console.error('Translation error:', error);
            throw error;
        }
    }

async evaluateCV(cvContent, jdText) {
    const prompt = `Bạn là một chuyên gia tuyển dụng có kinh nghiệm. Hãy đánh giá CV của ứng viên dựa trên yêu cầu công việc (JD).
        
        JD: ${jdText}
        CV: ${cvContent}

        Hãy đánh giá và cung cấp phản hồi theo các tiêu chí sau:
        1. Mức độ phù hợp tổng thể (thang điểm 1-10)
        2. Điểm mạnh của ứng viên
        3. Các kỹ năng còn thiếu so với yêu cầu
        4. Đề xuất cải thiện
        5. Nhận xét chung

        Trả về kết quả dưới dạng JSON với cấu trúc:
        {
            "overallScore": number,
            "strengths": ["điểm mạnh 1", "điểm mạnh 2", ...],
            "missingSkills": ["kỹ năng 1", "kỹ năng 2", ...],
            "improvements": ["đề xuất 1", "đề xuất 2", ...],
            "generalComment": "nhận xét chung"
        }`;

    try {
        const result = await this.model.generateContent(prompt);
        const responseText = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || '{}';
        
        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : responseText;
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error evaluating CV:", error);
        throw new Error("Failed to evaluate CV");
    }
}

async generateOptimizedCV(cvContent, jdText) {
    const prompt = `Based on the current CV and job description (JD), create an optimized CV for the position.
    Return the result in HTML format with the following sections:
    - Personal Information
    - Summary (Follow these guidelines for the summary:
        * Start with a strong professional title based on years of experience
        * Highlight specific expertise and technical proficiency from the CV
        * Mention notable achievements and impact
        * Include relevant certifications and specializations
        * Show alignment with the target role's requirements
        * Use formal, professional language
        * Keep it concise but comprehensive (3-4 sentences)
        * Emphasize unique value proposition
        * Use industry-specific terminology from the CV
        * Maintain a professional and scholarly tone throughout)
    - Work Experience
    - Skills
    - Education

    Important: For the Summary section:
    - Use formal academic language
    - Be specific to the individual's actual experience from their CV
    - Highlight concrete achievements and specializations
    - Maintain professionalism and sophistication in tone
    - Focus on unique qualifications and expertise
    - Ensure it aligns with both the CV content and job requirements

    Current CV: ${cvContent}
    Job Description: ${jdText}

    Return only the HTML content with appropriate formatting and styling.`;

    try {
        const result = await this.model.generateContent(prompt);
        const optimizedCV = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'Could not generate CV';
        return optimizedCV;
    } catch (error) {
        console.error("Error generating optimized CV:", error);
        throw new Error("Failed to generate optimized CV");
    }
}

async solveAlgorithm(problem, language, outputLanguage) {
    const languageMap = {
        'vi': 'Vietnamese',
        'en': 'English'
    };

    const prompt = `As an expert programmer, analyze and solve this algorithm problem.
Please provide the explanation in ${languageMap[outputLanguage] || 'Vietnamese'}.

Problem: ${problem}

Please provide a comprehensive solution in ${language} with:
1. Problem Analysis
   - Understanding of the problem
   - Input/Output examples
   - Edge cases to consider

2. Solution Approach
   - Algorithm explanation
   - Time and Space complexity analysis
   - Key considerations

3. Implementation
   - Well-commented code in ${language}
   - Explanation of key steps
   - Test cases

4. Alternative Approaches (if applicable)
   - Other possible solutions
   - Trade-offs between approaches

Format your response in markdown with clear sections and code blocks.
All explanations should be in ${languageMap[outputLanguage] || 'Vietnamese'}, but keep code and technical terms in English.`;

    try {
        const result = await this.model.generateContent(prompt);
        const solution = result?.response?.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'Could not generate solution.';
        return marked(solution); // Convert markdown to HTML
    } catch (error) {
        console.error('Error solving algorithm:', error);
        throw new Error('Failed to solve algorithm problem');
    }
}
    async translateImageText(text, targetLanguage, contentType = 'text') {
        console.log('1 >>>>>>>>>>>> Text:', text);
        console.log('1 >>>>>>>>>>>> targetLanguage:', targetLanguage);

        const prompt = `Translate this ${text} to ${targetLanguage}. 
        IMPORTANT:
        - Translate ONLY the exact text provided
        - Do NOT add any explanations
        - Do NOT add any interpretations
        - Do NOT add any additional context
        - Keep the same formatting and structure
        - Maintain line breaks and spacing exactly as in the source

        Text to translate:
        ${text}

        Translation:`;    

        try {
            const result = await this.model.generateContent(prompt);
            const translation = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Translation failed';
            return translation.trim();
        } catch (error) {
            throw new Error('Failed to translate text');
        }
    }
}

module.exports = AIService;