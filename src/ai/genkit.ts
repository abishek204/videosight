import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('[genkit] WARNING: GEMINI_API_KEY is not set!');
}

export const ai = new GoogleGenAI({ apiKey });

export async function generateContent(prompt: string): Promise<string> {
  try {
    console.log('[genkit] Calling Gemini API with model: gemini-flash-latest');
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    });
    const text = response.text || '';
    console.log('[genkit] Response length:', text.length);
    return text;
  } catch (error: any) {
    console.error('[genkit] API Error:', error.message);
    console.error('[genkit] API Key present:', !!apiKey);
    throw error;
  }
}
