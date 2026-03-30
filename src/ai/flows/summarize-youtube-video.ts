
'use server';
/**
 * @fileOverview Video summarization flow that generates massive, comprehensive reports.
 *
 * - summarizeYouTubeVideo - Generates summaries based on video transcript data.
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

export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput> {
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

  try {
    const result = await generateContent(prompt);
    const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
    return parsed;
  } catch (error: any) {
    console.error('[summarizeYouTubeVideo] Error:', error.message);
    throw new Error('Failed to generate summary: ' + error.message);
  }
}
