'use server';
/**
 * AI chat helper for YouTube video content
 */

import { generateContent } from '@/ai/genkit';
import { z } from 'zod';

const ChatAboutVideoContentInputSchema = z.object({
  transcript: z.string().describe('The full text transcript or video metadata'),
  chatHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      message: z.string(),
    })
  ).describe('Previous messages in this chat'),
  question: z.string().describe('The user\'s current question about the video'),
});
export type ChatAboutVideoContentInput = z.infer<typeof ChatAboutVideoContentInputSchema>;

const ChatAboutVideoContentOutputSchema = z.object({
  answer: z.string().describe('The AI\'s answer to the user\'s question'),
});
export type ChatAboutVideoContentOutput = z.infer<typeof ChatAboutVideoContentOutputSchema>;

export async function chatAboutVideoContent(input: ChatAboutVideoContentInput): Promise<ChatAboutVideoContentOutput> {
  const { transcript, chatHistory, question } = input;

  const historyText = chatHistory && chatHistory.length > 0 
    ? chatHistory.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.message}`).join('\n')
    : 'No previous messages';

  // Use a generous portion of the content so the AI has full context
  const maxContentLen = 25000;
  const trimmedContent = (transcript || '').substring(0, maxContentLen);
  
  console.log('[chatAboutVideoContent] Content length:', transcript?.length, 'Trimmed to:', trimmedContent.length);
  console.log('[chatAboutVideoContent] Question:', question);
  console.log('[chatAboutVideoContent] Chat history entries:', chatHistory?.length || 0);

  const prompt = `You are an intelligent AI assistant specialized in analyzing YouTube video content. You have access to the full video context below, which includes the video transcript, an AI-generated overview, key points, and a detailed summary. Use ALL of these sources to answer the user's question accurately, thoroughly, and helpfully.

VIDEO CONTENT:
${trimmedContent}

PREVIOUS CONVERSATION:
${historyText}

USER'S QUESTION: ${question}

INSTRUCTIONS:
- Answer based on ALL the video content provided above (transcript, overview, key points, and summary)
- Be specific and reference details from any of the provided sections
- If the content doesn't contain information to answer the question, say so honestly
- Be conversational and helpful
- When relevant, reference key points or summary insights for more structured answers

Respond in this exact JSON format:
{ "answer": "your detailed answer here" }

Respond ONLY with valid JSON, no markdown fences.`;

  try {
    const result = await generateContent(prompt);
    console.log('[chatAboutVideoContent] Raw result length:', result?.length);
    console.log('[chatAboutVideoContent] Raw result preview:', result?.substring(0, 200));
    
    // Clean up the response - remove markdown fences and extra whitespace
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      return { answer: parsed.answer || result };
    } catch (parseError) {
      console.log('[chatAboutVideoContent] JSON parse failed, extracting raw text...');
      // If it fails to parse (usually due to unescaped quotes or newlines), extract the value of "answer" manually
      const match = cleaned.match(/"answer"\s*:\s*"([\s\S]*)"\s*}/);
      if (match && match[1]) {
        return { answer: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
      }
      
      // If regex extraction fails, just strip the JSON wrapper and return whatever text there is
      const fallbackText = cleaned
        .replace(/^{?\s*"answer"\s*:\s*"?/, '')
        .replace(/"?\s*}?$/, '')
        .trim();
        
      return { answer: fallbackText || cleaned };
    }
  } catch (error: any) {
    console.error('[chatAboutVideoContent] API Error:', error.message);
    
    return {
      answer: "I'm having trouble processing your question right now. Please try rephrasing it or ask something else about the video!"
    };
  }
}
