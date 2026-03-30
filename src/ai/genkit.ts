import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('[genkit] WARNING: GEMINI_API_KEY is not set!');
}

export const ai = new GoogleGenAI({ apiKey });

export async function generateContent(prompt: string): Promise<string> {
  // === PROVIDER 1: GEMINI (Primary) ===
  try {
    console.log('[AI] Calling primary model: gemini-flash-latest');
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });
    const text = response.text || '';
    if (text) {
      console.log(`[AI] Gemini succeeded (${text.length} chars)`);
      return text;
    }
  } catch (error: any) {
    console.error(`[AI] Gemini failed: ${error.message}. Triggering Fallback 1...`);
  }

  // === PROVIDER 2: OPENAI (Fallback 1) ===
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    if (openaiKey) {
      console.log(`[AI] Calling Fallback 1: OpenAI (${openaiModel})`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          console.log(`[AI] OpenAI succeeded (${text.length} chars)`);
          return text;
        }
      } else {
        const errData = await response.text();
        console.error(`[AI] OpenAI error response: ${errData}`);
      }
    } else {
      console.log('[AI] Skipping OpenAI (No API key found)');
    }
  } catch (error: any) {
    console.error(`[AI] OpenAI fetch failed: ${error.message}. Triggering Fallback 2...`);
  }

  // === PROVIDER 3: GROQ (Fallback 2) ===
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    // Use fallback hardcoded if not strictly set
    const finalGroqModel = groqModel === 'llama-3.1-8b-instant' ? 'llama-3.1-8b-instant' : groqModel;
    
    if (groqKey) {
      console.log(`[AI] Calling Fallback 2: Groq (${finalGroqModel})`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: finalGroqModel,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          console.log(`[AI] Groq succeeded (${text.length} chars)`);
          return text;
        }
      } else {
        const errData = await response.text();
        console.error(`[AI] Groq error response: ${errData}`);
      }
    } else {
      console.log('[AI] Skipping Groq (No API key found)');
    }
  } catch (error: any) {
    console.error(`[AI] Groq fetch failed: ${error.message}`);
  }

  throw new Error('All AI providers failed to generate content');
}
