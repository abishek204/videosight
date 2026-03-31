
'use server';


/**
 * @fileOverview Video summarization flow.
 * 
 * Architecture:
 * 1. Try AI-powered summarization (Groq → Gemini → OpenAI)
 * 2. If ALL AI providers fail, generate summary from transcript text directly
 * 3. The result is GUARANTEED — the user never sees "Content Unavailable"
 * 
 * AI is only truly required for the chatbot (chat-about-video-content.ts).
 */

import { generateContent } from '@/ai/genkit';
import { z } from 'zod';

const SummarizeYouTubeVideoInputSchema = z.object({
  videoTitle: z.string().describe('The title of the video.'),
  transcript: z.string().describe('The full transcript of the video.'),
  length: z.enum(['short', 'medium', 'long']).default('medium').describe('How detailed the summary should be.'),
});
export type SummarizeYouTubeVideoInput = z.infer<typeof SummarizeYouTubeVideoInputSchema>;

const SummarizeYouTubeVideoOutputSchema = z.object({
  tldr: z.string().describe('Quick overview (one paragraph).'),
  detailedSummary: z.string().describe('The main detailed summary.'),
  keyPoints: z.array(z.string()).describe('List of important points from the video.'),
  topicsWithTimestamps: z.array(
    z.object({
      topic: z.string().describe('Main topic or segment.'),
      timestamp: z.string().describe('When it happens (MM:SS).'),
    })
  ).describe('A map of topics discussed in the video.'),
});
export type SummarizeYouTubeVideoOutput = z.infer<typeof SummarizeYouTubeVideoOutputSchema>;

/**
 * GUARANTEED fallback: Generate summary directly from transcript text.
 * No AI needed. Extracts structure from raw transcript.
 */
function generateFallbackSummary(title: string, transcript: string, length: string): SummarizeYouTubeVideoOutput {
  console.log('[Fallback Summary] Generating summary from transcript text (no AI)...');
  
  // Clean and split transcript into sentences
  const cleanText = transcript
    .replace(/\[.*?\]/g, '') // remove [Music], [Applause] etc
    .replace(/♪[^♪]*♪/g, '') // remove music notes
    .replace(/\s+/g, ' ')
    .trim();
  
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15); // skip tiny fragments
  
  // If sentences couldn't be split (common for transcripts without punctuation), split by chunks
  const chunks = sentences.length >= 5 ? sentences : cleanText.split(/\s{2,}|,\s+/).filter(s => s.length > 15);
  const usable = chunks.length >= 3 ? chunks : [cleanText];

  // --- TLDR (Overview) ---
  const tldrSentenceCount = length === 'short' ? 2 : length === 'long' ? 5 : 3;
  const tldr = usable.slice(0, Math.min(tldrSentenceCount, usable.length)).join(' ');

  // --- Key Points ---
  // Pick evenly-spaced sentences from across the transcript
  const numPoints = length === 'short' ? 3 : length === 'long' ? 8 : 5;
  const keyPoints: string[] = [];
  const step = Math.max(1, Math.floor(usable.length / numPoints));
  for (let i = 0; i < usable.length && keyPoints.length < numPoints; i += step) {
    const point = usable[i].length > 200 ? usable[i].substring(0, 200) + '...' : usable[i];
    keyPoints.push(point);
  }
  // Ensure we have at least some points
  if (keyPoints.length === 0 && cleanText.length > 0) {
    keyPoints.push(cleanText.substring(0, 200));
  }

  // --- Detailed Summary ---
  let detailedSummary: string;
  if (length === 'short') {
    detailedSummary = usable.slice(0, Math.min(5, usable.length)).join(' ');
  } else if (length === 'long') {
    // For long, use the entire transcript organized into paragraphs
    const paragraphs: string[] = [];
    const pSize = Math.ceil(usable.length / 6);
    for (let i = 0; i < usable.length; i += pSize) {
      paragraphs.push(usable.slice(i, i + pSize).join(' '));
    }
    detailedSummary = paragraphs.join('\n\n');
  } else {
    // Medium: use ~60% of sentences, organized into 3-4 paragraphs
    const selected = usable.slice(0, Math.ceil(usable.length * 0.6));
    const pSize = Math.ceil(selected.length / 3);
    const paragraphs: string[] = [];
    for (let i = 0; i < selected.length; i += pSize) {
      paragraphs.push(selected.slice(i, i + pSize).join(' '));
    }
    detailedSummary = paragraphs.join('\n\n');
  }

  // --- Topics with Timestamps ---
  // Divide transcript into ~5 equal time segments
  const words = cleanText.split(/\s+/);
  const numTopics = Math.min(5, Math.ceil(words.length / 50));
  const topicsWithTimestamps: { topic: string; timestamp: string }[] = [];
  const topicSize = Math.ceil(words.length / numTopics);
  
  for (let i = 0; i < numTopics; i++) {
    const segWords = words.slice(i * topicSize, (i + 1) * topicSize);
    const topicPreview = segWords.slice(0, 10).join(' ');
    const minuteEstimate = Math.floor((i * topicSize / words.length) * (words.length / 3)); // rough minute estimate
    const mins = Math.floor(minuteEstimate / 60);
    const secs = minuteEstimate % 60;
    topicsWithTimestamps.push({
      topic: topicPreview + (segWords.length > 10 ? '...' : ''),
      timestamp: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    });
  }

  console.log(`[Fallback Summary] Generated: tldr=${tldr.length}chars, points=${keyPoints.length}, summary=${detailedSummary.length}chars`);
  
  return {
    tldr: tldr || `This video titled "${title}" covers the following content from the transcript.`,
    detailedSummary: detailedSummary || cleanText.substring(0, 2000),
    keyPoints: keyPoints.length > 0 ? keyPoints : [`Content from: ${title}`],
    topicsWithTimestamps,
  };
}

export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput & { error?: string }> {
  const { videoTitle, transcript, length } = input;

  const prompt = `You are an Elite Intelligence Analyst. Your task is to transform a video transcript into a professional, high-fidelity report. 

TARGET DEPTH: ${length}

Video Title: ${videoTitle}

Transcript Content:
${transcript}

REQUIRED STRUCTURE:
1. Quick Overview: A punchy, authoritative summary.
2. Detailed Summary: 
   - 'short': Core message only.
   - 'medium': Thorough section-by-section walkthrough.
   - 'long': A massive, multi-section deep dive covering every possible detail found in the text.
3. Key Takeaways: High-impact points for a professional reader.
4. Topics Map: Every significant segment with its time marker.

Respond in this JSON format:
{"tldr": "quick overview", "detailedSummary": "detailed summary", "keyPoints": ["point1", "point2"], "topicsWithTimestamps": [{"topic": "topic", "timestamp": "MM:SS"}]}`;

  // Try AI-powered summarization (fast: single attempt with short delay)
  const maxRetries = 2;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[summarizeYouTubeVideo] AI Attempt ${attempt}/${maxRetries}`);
      const result = await generateContent(prompt);
      const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      let jsonString = cleaned;
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = cleaned.slice(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(jsonString);
      return {
        tldr: parsed.tldr || '',
        detailedSummary: parsed.detailedSummary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        topicsWithTimestamps: Array.isArray(parsed.topicsWithTimestamps) ? parsed.topicsWithTimestamps : [],
      };
    } catch (error: any) {
      lastError = error;
      console.error(`[summarizeYouTubeVideo] AI Attempt ${attempt} failed:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // === GUARANTEED FALLBACK: Generate summary from transcript text directly ===
  console.log('[summarizeYouTubeVideo] All AI attempts failed. Using transcript-based fallback...');
  return generateFallbackSummary(videoTitle, transcript, length);
}
