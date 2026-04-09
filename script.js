document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('evaluationForm');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const resultContent = document.getElementById('resultContent');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('span');
    const btnLoader = document.getElementById('btnLoader');
    const copyBtn = document.getElementById('copyBtn');
    const demoBtn = document.getElementById('demoBtn');

    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            document.getElementById('name').value = "Alex Johnson";
            document.getElementById('role').value = "Senior Software Engineer";
            document.getElementById('manager_rating').value = "4";
            document.getElementById('peer_rating').value = "5";
            document.getElementById('self_rating').value = "3";
            document.getElementById('comments').value = "Manager: Alex is a highly technical engineer who always delivers robust code, but sometimes struggles to speak up in larger architectural meetings.\nPeer: Alex is incredibly helpful and a great mentor. Always willing to pair program.\nSelf: I feel my technical skills are okay, but I need to improve my communication and confidence.";
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get input values
        const apiKey = document.getElementById('api_key').value.trim();
        const data = {
            name: document.getElementById('name').value,
            role: document.getElementById('role').value,
            managerRating: parseInt(document.getElementById('manager_rating').value),
            peerRating: parseInt(document.getElementById('peer_rating').value),
            selfRating: parseInt(document.getElementById('self_rating').value),
            comments: document.getElementById('comments').value
        };

        if (!apiKey) {
            alert("Please provide a Gemini API Key.");
            return;
        }

        // 2. UI State logic
        emptyState.classList.add('hidden');
        resultContent.classList.add('hidden');
        loadingState.classList.remove('hidden');
        
        btnText.textContent = "Analyzing limitlessly...";
        btnLoader.classList.remove('hidden');
        generateBtn.disabled = true;

        // 3. Generate Evaluation using Gemini
        try {
            const promptText = `
You are an AI performance review assistant designed to generate fair, consistent, and unbiased employee evaluations.
Analyze the following data:
- Employee Name: ${data.name}
- Role: ${data.role}
- Manager Rating (1-5): ${data.managerRating}
- Peer Rating (1-5): ${data.peerRating}
- Self Rating (1-5): ${data.selfRating}
- Comments: ${data.comments}

Instructions:
1. Calculate overall performance understanding based on ratings.
2. Identify strengths and positive behaviors.
3. Identify areas for improvement.
4. Check for any inconsistency or rating mismatch (possible bias).
5. Generate a professional and neutral performance review.
6. Suggest 2-3 actionable goals for improvement.
7. Keep the tone fair, constructive, and unbiased.
8. Do NOT favor any single feedback source.

Format your response strictly as JSON with exactly these keys:
{
  "summary": "Overall Performance Summary string",
  "strengths": ["list", "of", "key strengths"],
  "areas": ["list", "of", "areas of improvement"],
  "goals": ["list", "of", "future goals"]
}
Return ONLY valid JSON.
            `;

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: promptText }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                let errorMsg = `HTTP error ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error?.message || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }

            const responseData = await response.json();
            if (!responseData.candidates || responseData.candidates.length === 0) {
                throw new Error("Gemini API blocked the response. This is likely due to Safety Filters triggering on the input data.");
            }
            const textContent = responseData.candidates[0].content.parts[0].text;
            
            // Clean markdown blocks if Gemini includes them
            let cleanedText = textContent.replace(/```json/gi, '').replace(/```/gi, '').trim();
            
            // Parse JSON 
            const evaluation = JSON.parse(cleanedText);
            
            // 4. Populate UI
            document.getElementById('out-summary').textContent = evaluation.summary;
            populateList('out-strengths', evaluation.strengths);
            populateList('out-areas', evaluation.areas);
            populateList('out-goals', evaluation.goals);

            // 5. Update visibility
            loadingState.classList.add('hidden');
            resultContent.classList.remove('hidden');
            
        } catch (error) {
            console.error("Error generating evaluation:", error);
            alert("Error generating evaluation: " + error.message);
            emptyState.classList.remove('hidden');
            loadingState.classList.add('hidden');
        } finally {
            btnText.textContent = "Generate Evaluation";
            btnLoader.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', () => {
        const text = `
Overall Performance Summary
${document.getElementById('out-summary').textContent}

Key Strengths
${Array.from(document.getElementById('out-strengths').children).map(li => '- ' + li.textContent).join('\n')}

Areas of Improvement
${Array.from(document.getElementById('out-areas').children).map(li => '- ' + li.textContent).join('\n')}

Future Goals
${Array.from(document.getElementById('out-goals').children).map(li => '- ' + li.textContent).join('\n')}
        `.trim();

        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            copyBtn.style.background = "rgba(16, 185, 129, 0.2)";
            copyBtn.style.borderColor = "#10b981";
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = "transparent";
                copyBtn.style.borderColor = "var(--primary-color)";
            }, 2000);
        });
    });

    function populateList(elementId, itemsArray) {
        const ul = document.getElementById(elementId);
        ul.innerHTML = ''; // clear previous
        if (!itemsArray || !Array.isArray(itemsArray)) return;
        itemsArray.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });
    }
});
