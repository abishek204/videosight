import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('[genkit] WARNING: GEMINI_API_KEY is not set!');
}

export const ai = new GoogleGenAI({ apiKey });

export async function generateContent(prompt: string): Promise<string> {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGroq = !!process.env.GROQ_API_KEY;
  console.log(`[AI] Available providers: Gemini=${hasGemini}, OpenAI=${hasOpenAI}, Groq=${hasGroq}`);

  // === PROVIDER 1: GEMINI (Primary) ===
  try {
    if (apiKey) {
      console.log('[AI] Calling Provider 1: Gemini (gemini-flash-latest)');
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
    } else {
      console.log('[AI] Skipping Gemini (No API key)');
    }
  } catch (error: any) {
    console.error(`[AI] Gemini failed: ${error.message}`);
  }

  // === PROVIDER 2: OPENAI (Fallback 1) ===
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (openaiKey) {
      console.log(`[AI] Calling Provider 2: OpenAI (${openaiModel})`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          console.log(`[AI] OpenAI succeeded (${text.length} chars)`);
          return text;
        }
      } else {
        const errData = await response.text();
        console.error(`[AI] OpenAI error (${response.status}): ${errData.substring(0, 200)}`);
      }
    } else {
      console.log('[AI] Skipping OpenAI (No API key)');
    }
  } catch (error: any) {
    console.error(`[AI] OpenAI failed: ${error.message}`);
  }

  // === PROVIDER 3: GROQ (Fallback 2) ===
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    if (groqKey) {
      console.log(`[AI] Calling Provider 3: Groq (${groqModel})`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (text) {
          console.log(`[AI] Groq succeeded (${text.length} chars)`);
          return text;
        }
      } else {
        const errData = await response.text();
        console.error(`[AI] Groq error (${response.status}): ${errData.substring(0, 200)}`);
      }
    } else {
      console.log('[AI] Skipping Groq (No API key)');
    }
  } catch (error: any) {
    console.error(`[AI] Groq failed: ${error.message}`);
  }

  throw new Error('All AI providers failed to generate content');
}
