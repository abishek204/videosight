'use server';
/**
 * AI chat helper for YouTube video content.
 * 
 * Architecture:
 * 1. Try AI-powered answer (Groq → Gemini → OpenAI via generateContent)
 * 2. If ALL AI providers fail, generate an answer directly from the
 *    transcript/summary/keypoints context using keyword extraction.
 * 3. The user NEVER sees "I'm having trouble processing your question."
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

/**
 * GUARANTEED FALLBACK: Answer the user's question directly from the context.
 * No AI needed — uses keyword matching + context extraction.
 */
function answerFromContext(question: string, context: string): string {
  console.log('[Chat Fallback] Generating answer from context (no AI)...');
  
  const lowerQ = question.toLowerCase().trim();
  const contextLower = context.toLowerCase();
  
  // Split context into logical sections
  const sections: { label: string; content: string }[] = [];
  
  // Extract overview section
  const overviewMatch = context.match(/=== AI-GENERATED OVERVIEW ===([\s\S]*?)(?:===|$)/);
  if (overviewMatch) sections.push({ label: 'Overview', content: overviewMatch[1].trim() });
  
  // Extract key points section
  const keyPointsMatch = context.match(/=== KEY POINTS ===([\s\S]*?)(?:===|$)/);
  if (keyPointsMatch) sections.push({ label: 'Key Points', content: keyPointsMatch[1].trim() });
  
  // Extract summary section
  const summaryMatch = context.match(/=== DETAILED SUMMARY ===([\s\S]*?)(?:===|$)/);
  if (summaryMatch) sections.push({ label: 'Summary', content: summaryMatch[1].trim() });
  
  // The rest is the transcript itself
  const transcriptPart = context.split('=== AI-GENERATED OVERVIEW ===')[0]?.trim() || context;
  if (transcriptPart) sections.push({ label: 'Transcript', content: transcriptPart });

  // --- Handle common question types ---
  
  // "What is this video about?" / "Summarize" / "Overview" type questions
  if (lowerQ.match(/what.*(about|video|this)|summar|overview|explain|tell me/)) {
    if (overviewMatch) {
      return `Based on the video content:\n\n${overviewMatch[1].trim()}`;
    }
    if (summaryMatch) {
      return `Here's what the video covers:\n\n${summaryMatch[1].trim().substring(0, 1500)}`;
    }
    // Use first chunk of transcript
    const sentences = transcriptPart.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 8);
    return `Based on the transcript, here's what the video covers:\n\n${sentences.join('. ').trim()}.`;
  }
  
  // "Key points" / "Main points" / "Highlights" type questions
  if (lowerQ.match(/key\s*point|main\s*point|highlight|takeaway|important/)) {
    if (keyPointsMatch) {
      return `Here are the key points from the video:\n\n${keyPointsMatch[1].trim()}`;
    }
  }

  // --- Keyword-based search across all context ---
  // Extract meaningful keywords from the question (skip stop words)
  const stopWords = new Set(['what', 'is', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'it', 'this', 'that', 'how', 'why', 'when', 'where', 'who', 'which', 'do', 'does', 'did', 'was', 'were', 'are', 'been', 'be', 'have', 'has', 'had', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'about', 'with', 'from', 'they', 'them', 'their', 'there', 'here', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'into', 'than', 'then', 'also', 'just', 'only', 'very', 'much', 'really', 'please', 'tell', 'me', 'you', 'your', 'my', 'its', 'his', 'her']);
  
  const keywords = lowerQ
    .replace(/[?!.,;:'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Split context into sentences and score them by keyword relevance
  const allSentences = context
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
  
  const scored = allSentences.map(sentence => {
    const sentLower = sentence.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (sentLower.includes(kw)) score += 1;
      // Bonus for exact phrase matches
      if (sentLower.includes(kw + ' ') || sentLower.includes(' ' + kw)) score += 0.5;
    }
    return { sentence, score };
  });
  
  // Sort by relevance and take top results
  scored.sort((a, b) => b.score - a.score);
  const relevantSentences = scored.filter(s => s.score > 0).slice(0, 6);
  
  if (relevantSentences.length > 0) {
    const answer = relevantSentences.map(s => s.sentence).join('. ');
    return `Based on the video content, here's what I found:\n\n${answer}.`;
  }
  
  // --- Last resort: Return a summary of all available content ---
  const overviewText = overviewMatch ? overviewMatch[1].trim() : '';
  const summaryText = summaryMatch ? summaryMatch[1].trim().substring(0, 800) : '';
  const transcriptPreview = transcriptPart.substring(0, 800);
  
  const bestContent = overviewText || summaryText || transcriptPreview;
  
  if (bestContent) {
    return `I couldn't find a specific answer to "${question}" in the video, but here's the video content for context:\n\n${bestContent}`;
  }
  
  return `The video discusses the following topics. You can ask more specific questions about the content:\n\n${context.substring(0, 1000)}`;
}

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
      // Extract the value of "answer" manually
      const match = cleaned.match(/"answer"\s*:\s*"([\s\S]*)"\s*}/);
      if (match && match[1]) {
        return { answer: match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
      }
      
      // Strip JSON wrapper and return whatever text there is
      const fallbackText = cleaned
        .replace(/^{?\s*"answer"\s*:\s*"?/, '')
        .replace(/"?\s*}?$/, '')
        .trim();
      
      if (fallbackText && fallbackText.length > 10) {
        return { answer: fallbackText };
      }
      
      // Even raw text from AI is better than nothing
      if (cleaned.length > 20) {
        return { answer: cleaned };
      }
    }
  } catch (error: any) {
    console.error('[chatAboutVideoContent] All AI providers failed:', error.message);
  }

  // === GUARANTEED FALLBACK: Answer from transcript/summary context directly ===
  console.log('[chatAboutVideoContent] Using context-based fallback (no AI)...');
  return { answer: answerFromContext(question, trimmedContent) };
}
