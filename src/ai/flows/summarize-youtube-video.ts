
'use server';

/**
 * @fileOverview Video summarization.
 * 
 * Uses AI (Gemini → OpenAI → Groq) to generate quality summaries
 * from the transcript. If all AI providers are rate-limited,
 * falls back to extractive summary from the transcript text.
 * 
 * NEVER fails — always returns content.
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
 * Fallback: Generate summary from transcript text (no AI).
 */
function extractiveFallback(title: string, transcript: string, length: string): SummarizeYouTubeVideoOutput {
  console.log('[Summary] Using extractive fallback (no AI)');
  const clean = transcript.replace(/\[.*?\]/g, '').replace(/♪[^♪]*♪/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(s => s.length > 10);
  const chunks = sentences.length >= 5 ? sentences : clean.split(/,\s+|\s{2,}/).filter(s => s.length > 10);
  const usable = chunks.length >= 3 ? chunks : [clean];

  const tldrCount = length === 'short' ? 2 : length === 'long' ? 5 : 3;
  const tldr = usable.slice(0, Math.min(tldrCount, usable.length)).join(' ') || `Content from: ${title}`;

  const numPts = length === 'short' ? 3 : length === 'long' ? 8 : 5;
  const step = Math.max(1, Math.floor(usable.length / numPts));
  const keyPoints: string[] = [];
  for (let i = 0; i < usable.length && keyPoints.length < numPts; i += step) {
    let p = usable[i]; if (p.length > 200) p = p.substring(0, 197) + '...';
    keyPoints.push(p);
  }
  if (keyPoints.length === 0) keyPoints.push(clean.substring(0, 200));

  let detailedSummary: string;
  const sel = length === 'short' ? usable.slice(0, 5) : length === 'long' ? usable : usable.slice(0, Math.ceil(usable.length * 0.6));
  const pSize = Math.ceil(sel.length / (length === 'short' ? 1 : 3));
  const paras: string[] = [];
  for (let i = 0; i < sel.length; i += pSize) paras.push(sel.slice(i, i + pSize).join(' '));
  detailedSummary = paras.join('\n\n');

  return { tldr, detailedSummary, keyPoints, topicsWithTimestamps: [] };
}

export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput> {
  const { videoTitle, transcript, length } = input;

  const prompt = `You are an Elite Intelligence Analyst. Transform this video transcript into a professional report.

TARGET DEPTH: ${length}
Video Title: ${videoTitle}

Transcript:
${transcript.substring(0, 20000)}

STRUCTURE:
1. Quick Overview: A punchy, authoritative summary paragraph.
2. Detailed Summary:
   - 'short': Core message only.
   - 'medium': Thorough section-by-section walkthrough.
   - 'long': A massive, multi-section deep dive.
3. Key Takeaways: High-impact points.
4. Topics Map: Significant segments with time markers.

Respond ONLY with valid JSON, no markdown fences:
{"tldr": "overview", "detailedSummary": "summary", "keyPoints": ["point1", "point2"], "topicsWithTimestamps": [{"topic": "topic", "timestamp": "MM:SS"}]}`;

  // Try AI once (generateContent already tries Gemini → OpenAI → Groq internally)
  try {
    console.log(`[Summary] Calling AI for ${length} summary...`);
    const result = await generateContent(prompt);
    const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    const jsonString = (firstBrace !== -1 && lastBrace > firstBrace)
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;

    const parsed = JSON.parse(jsonString);
    console.log('[Summary] AI succeeded');
    return {
      tldr: parsed.tldr || '',
      detailedSummary: parsed.detailedSummary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      topicsWithTimestamps: Array.isArray(parsed.topicsWithTimestamps) ? parsed.topicsWithTimestamps : [],
    };
  } catch (error: any) {
    console.error('[Summary] AI failed, using fallback:', error.message);
  }

  // Fallback: generate from transcript directly
  return extractiveFallback(videoTitle, transcript, length);
}
