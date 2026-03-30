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

  const prompt = `You are a helpful AI assistant that answers questions about YouTube video content.

VIDEO CONTENT:
${(transcript || '').substring(0, 3000)}

CHAT HISTORY:
${historyText}

USER QUESTION: ${question}

Provide your answer in this JSON format:
{ "answer": "your answer here" }

Respond ONLY with valid JSON.`;

  try {
    const result = await generateContent(prompt);
    console.log('[chatAboutVideoContent] Raw result:', result);
    
    const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
    return { answer: parsed.answer || result };
  } catch (error: any) {
    console.error('[chatAboutVideoContent] Error:', error.message);
    return {
      answer: "I'm having trouble processing your question right now. Please try rephrasing it or ask something else about the video!"
    };
  }
}
