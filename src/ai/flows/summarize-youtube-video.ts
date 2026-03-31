
'use server';

/**
 * @fileOverview Video summarization — 100% local, no AI needed.
 * 
 * Generates Overview, Summary, Key Points, and Topics directly
 * from the transcript text. Zero API calls. Instant results.
 * 
 * AI is reserved ONLY for the chatbot (chat-about-video-content.ts).
 */

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
 * Clean raw transcript text — remove music markers, extra whitespace, etc.
 */
function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, '')           // [Music], [Applause], etc.
    .replace(/♪[^♪]*♪/g, '')           // ♪ lyrics ♪
    .replace(/\(.*?\)/g, '')           // (background noise)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split text into sentences (handles transcripts without punctuation).
 */
function splitSentences(text: string): string[] {
  // Try splitting by punctuation first
  const bySentence = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  
  if (bySentence.length >= 5) return bySentence;

  // Fallback: split by commas / long pauses
  const byComma = text
    .split(/,\s+|\s{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  
  if (byComma.length >= 5) return byComma;

  // Last resort: chunk by ~80 words
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += 80) {
    const chunk = words.slice(i, i + 80).join(' ');
    if (chunk.length > 10) chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Generate Overview (TLDR)
 */
function generateOverview(title: string, sentences: string[], length: string): string {
  const count = length === 'short' ? 2 : length === 'long' ? 5 : 3;
  const picked = sentences.slice(0, Math.min(count, sentences.length));
  
  if (picked.length === 0) return `This video titled "${title}" covers the discussed topics in detail.`;
  
  return picked.join(' ');
}

/**
 * Generate Key Points — evenly sampled from across the transcript
 */
function generateKeyPoints(sentences: string[], length: string): string[] {
  const numPoints = length === 'short' ? 3 : length === 'long' ? 10 : 5;
  const points: string[] = [];
  const step = Math.max(1, Math.floor(sentences.length / numPoints));
  
  for (let i = 0; i < sentences.length && points.length < numPoints; i += step) {
    let point = sentences[i];
    // Capitalize first letter
    point = point.charAt(0).toUpperCase() + point.slice(1);
    // Trim if too long
    if (point.length > 250) point = point.substring(0, 247) + '...';
    // Ensure it ends with punctuation
    if (!/[.!?]$/.test(point)) point += '.';
    points.push(point);
  }
  
  if (points.length === 0) {
    points.push('Video content covers the discussed topics.');
  }
  
  return points;
}

/**
 * Generate Detailed Summary — organized into paragraphs
 */
function generateDetailedSummary(sentences: string[], length: string): string {
  if (sentences.length === 0) return 'No transcript content available for summarization.';
  
  let selected: string[];
  let numParagraphs: number;
  
  if (length === 'short') {
    selected = sentences.slice(0, Math.min(5, sentences.length));
    numParagraphs = 1;
  } else if (length === 'long') {
    selected = sentences; // Use everything
    numParagraphs = Math.min(6, Math.ceil(sentences.length / 4));
  } else {
    // Medium: use ~60% of sentences
    selected = sentences.slice(0, Math.ceil(sentences.length * 0.6));
    numParagraphs = Math.min(4, Math.ceil(selected.length / 3));
  }
  
  if (numParagraphs <= 1) return selected.join(' ');
  
  const pSize = Math.ceil(selected.length / numParagraphs);
  const paragraphs: string[] = [];
  for (let i = 0; i < selected.length; i += pSize) {
    paragraphs.push(selected.slice(i, i + pSize).join(' '));
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Generate Topics with Timestamps
 */
function generateTopics(sentences: string[], totalWords: number): { topic: string; timestamp: string }[] {
  const numTopics = Math.min(6, Math.max(2, Math.ceil(sentences.length / 5)));
  const topics: { topic: string; timestamp: string }[] = [];
  const step = Math.max(1, Math.floor(sentences.length / numTopics));
  
  for (let i = 0; i < numTopics; i++) {
    const idx = Math.min(i * step, sentences.length - 1);
    const sentence = sentences[idx] || '';
    // Use first ~8 words as topic label
    const topicWords = sentence.split(/\s+/).slice(0, 8).join(' ');
    const topicLabel = topicWords + (sentence.split(/\s+/).length > 8 ? '...' : '');
    
    // Rough timestamp estimate (assumes ~150 words per minute)
    const wordsBeforeThis = sentences.slice(0, idx).join(' ').split(/\s+/).length;
    const totalSeconds = Math.floor((wordsBeforeThis / 150) * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    topics.push({
      topic: topicLabel.charAt(0).toUpperCase() + topicLabel.slice(1),
      timestamp: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    });
  }
  
  return topics;
}

/**
 * Main entry point — generates everything from transcript, no AI.
 */
export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput> {
  const { videoTitle, transcript, length } = input;
  
  console.log(`[Summary] Generating from transcript (${transcript.length} chars, depth: ${length})`);
  
  const cleanText = cleanTranscript(transcript);
  const sentences = splitSentences(cleanText);
  const totalWords = cleanText.split(/\s+/).length;
  
  console.log(`[Summary] Cleaned: ${cleanText.length} chars, ${sentences.length} sentences, ${totalWords} words`);
  
  const tldr = generateOverview(videoTitle, sentences, length);
  const keyPoints = generateKeyPoints(sentences, length);
  const detailedSummary = generateDetailedSummary(sentences, length);
  const topicsWithTimestamps = generateTopics(sentences, totalWords);
  
  console.log(`[Summary] Done: overview=${tldr.length}c, summary=${detailedSummary.length}c, points=${keyPoints.length}, topics=${topicsWithTimestamps.length}`);
  
  return { tldr, detailedSummary, keyPoints, topicsWithTimestamps };
}
