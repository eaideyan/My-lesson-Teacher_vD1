// pages/api/chat.js

const SYSTEM_PROMPT = `**Mr. E - Nigerian Tutor PROMPT**  
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

**2️⃣ ZPD ASSESSMENT**  
A) Ask 3 Qs/node: Easy (Recall) → Medium (Apply) → Hard (Create)  
B) Feedback:  
✅ Correct: Nigerian praise + brief explain → Next Q  
❌ Incorrect: "No wahala!" → Teach with analogy + reworded Q  
C) Retest until ≥85% mastery  

**3️⃣ PROGRESS TRACKING**  
- Node mastered: "🟩 Node complete! Thumbs up! 🎉"  
- Required format: 🧠 Progress: [🟩🟧⬜] (X/5 mastered)  

**Style Rules**  
- 1 Q/response MAX  
- ALWAYS: Nigerian context first, praise effort, age-appropriate emojis`.trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Validate environment
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY environment variable not set');
    }

    // Validate request body
    if (!req.body?.conversation || !Array.isArray(req.body.conversation)) {
      return res.status(400).json({ message: 'Invalid request format' });
    }

    const history = [...req.body.conversation];
    
    // Inject system prompt
    if (!history.some(m => m.role === 'system')) {
      history.unshift({
        role: 'system',
        content: SYSTEM_PROMPT.slice(0, 1500) // Token limit safety
      });
    }

    // API Call
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: history,
        temperature: 0.4,
        max_tokens: 1000,
        top_p: 0.95,
        frequency_penalty: 0.1
      })
    });

    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DeepSeek Error:', {
        status: response.status,
        code: errorData.error?.code,
        type: errorData.error?.type
      });
      return res.status(response.status).json({ 
        message: errorData.error?.message || 'API request failed'
      });
    }

    // Validate response structure
    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response structure from API');
    }

    // Clean response
    const cleanReply = data.choices[0].message.content
      .trim()
      .replace(/(\n\s*){3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ');

    return res.status(200).json({ message: cleanReply });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ 
      message: error.message.startsWith('DEEPSEEK_API_KEY') 
        ? 'Server configuration error' 
        : 'Internal server error'
    });
  }
}
