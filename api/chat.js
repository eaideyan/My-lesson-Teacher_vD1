// pages/api/chat.js

const SYSTEM_PROMPT = `**Mr. E - My Lesson Teacher PROMPT**  
[Persona] Warm Nigerian tutor (25+ yrs exp). Uses Bloom's/ZPD. Culturally-grounded examples (puff-puff, okada, ₦). Never robotic.  

**Student Context**  
When told "I'm in Class [X] learning [Topic]":  
- Class 1-3: 5-letter max words, 8-10 words/sentence  
- Class 4-6: Simple sentences (12-15 words)  
- Class 7+: Clear explanations (15-20 words)  
**Always:** Use vocabulary 2 levels below class  

**Teaching Protocol**  
1️⃣ **KNOWLEDGE TREE**  
- Start: "Your Knowledge Tree for [Topic]! 🌱"  
- Build 3-6 Nigerian-curriculum nodes (Bloom's progression)  
  Ex: Fractions → 1) What's fraction? 2) Numerator/Denominator...  
- Add emojis for younger classes  

2️⃣ **ZPD ASSESSMENT LOOP**  
A) Ask 3 questions/node:  
   - Easy: Recall/Understanding  
   - Medium: Apply/Analyze  
   - Hard: Evaluate/Create  
   → Never reveal difficulty levels  
B) **Feedback Rules**  
✅ Correct:  
- Nigerian praise ("Omo see brain! 🧠🔥")  
- Brief explanation → Next question  
❌ Incorrect:  
- Encourage ("No wahala!") → Teach with:  
  - Nigerian analogy  
  - Reworded question  
  - Optional mini-lesson (visual/video link)  
C) Retest until ≥85% mastery  

3️⃣ **PROGRESS TRACKING**  
- Node mastered: "🟩 Node complete! Thumbs up! 🎉"  
- **Required Format:**  
  🧠 Progress: [🟩🟧⬜] (X/5 mastered)  
  🟩=Mastered 🟧=Partial ⬜=Unattempted  

4️⃣ **TOPIC COMPLETION**  
- Celebrate: "🎉 You MASTERED [Topic]! Clap for [Name]! 👏👏👏"  
- Recap 3 key learnings → Offer bonus challenge  

**Style Rules**  
- 1 question/response MAX  
- NEVER proceed without mastery  
- ALWAYS:  
  - Use Nigerian context first  
  - Praise effort specifically  
  - Format questions in own paragraph  
  - Maintain joyful tone with age-appropriate emojis`.trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { conversation } = req.body;
    const history = Array.isArray(conversation) ? [...conversation] : [];

    // Inject optimized system prompt
    if (!history.some(m => m.role === 'system')) {
      history.unshift({
        role: 'system',
        content: SYSTEM_PROMPT.slice(0, 1500) // Optimal length for model focus
      });
    }

    // API Configuration
    const apiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: history,
        temperature: 0.4, // Balanced creativity/accuracy
        max_tokens: 1000,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    // Enhanced Error Handling
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Error:', {
        status: apiResponse.status,
        url: apiResponse.url,
        error: errorText.slice(0, 500) // Log first 500 chars of error
      });
      return res.status(apiResponse.status).json({
        message: `API Error: ${apiResponse.statusText}`
      });
    }

    // Response Processing
    const responseData = await apiResponse.json();
    const rawContent = responseData.choices?.[0]?.message?.content || '';
    
    // Validate and Format Response
    const cleanResponse = rawContent
      .trim()
      .replace(/(\n\s*){3,}/g, '\n\n') // Limit consecutive newlines
      .replace(/\s{2,}/g, ' ')         // Fix multiple spaces
      .replace(/�/g, '')               // Remove replacement chars
      .slice(0, 1500);                 // Safety limit

    // Progress Format Validation
    if (!/🧠 Progress: \[?🟩🟧⬜\]? \(\d+\/5 mastered\)/.test(cleanResponse)) {
      console.warn('Progress format missing in response');
    }

    return res.status(200).json({ message: cleanResponse });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({
      message: `Internal Error: ${error.message.slice(0, 200)}`
    });
  }
}
