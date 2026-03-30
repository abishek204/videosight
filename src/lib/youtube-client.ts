/**
 * SERVER-ACTION YouTube Transcript Fetcher
 * Uses youtubei.js with proper error handling
 */

import { Innertube, UniversalCache } from 'youtubei.js';

/**
 * Parse YouTube caption XML
 */
function parseCaptionXML(xmlText: string): { text: string, offset: number }[] {
  const transcriptItems: { text: string, offset: number }[] = [];
  const textRegex = /<text\s+start="([^"]+)"(?:\s+dur="[^"]*")?>([\s\S]*?)<\/text>/g;
  let match;
  
  while ((match = textRegex.exec(xmlText)) !== null) {
    const startTime = parseFloat(match[1]) * 1000;
    const text = match[2]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8203;/g, '')
      .replace(/&#x200B;/g, '')
      .trim();
    
    if (text) {
      transcriptItems.push({ text, offset: startTime });
    }
  }

  return transcriptItems;
}

/**
 * Fetch transcript using youtubei.js - the most reliable method
 */
export async function fetchTranscript(videoId: string, lang: string = 'en'): Promise<{ fullText: string; segments: { text: string; offset: number }[] }> {
  console.log(`[fetchTranscript] Starting for video=${videoId}, lang=${lang}`);
  
  // METHOD 1: youtubei.js
  try {
    console.log('[Method 1] Initializing Innertube...');
    
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
    
    console.log('[Method 1] Innertube created, getting video info...');

    const info = await yt.getInfo(videoId);
    console.log('[Method 1] Video info loaded');
    
    if (!info.captions) {
      console.log('[Method 1] No captions object found');
      throw new Error('No captions available');
    }
    
    const captionTracks = info.captions.caption_tracks || [];
    console.log(`[Method 1] Found ${captionTracks.length} caption tracks`);
    
    if (!captionTracks || captionTracks.length === 0) {
      console.log('[Method 1] No caption tracks in array');
      throw new Error('No caption tracks available');
    }
    
    // Find best matching track
    let captionTrack = captionTracks.find((ct: any) => ct.language_code === lang);
    console.log(`[Method 1] Exact lang match: ${!!captionTrack}`);
    
    if (!captionTrack) {
      captionTrack = captionTracks.find((ct: any) => ct.language_code.startsWith(lang.split('-')[0]));
      console.log(`[Method 1] Lang prefix match: ${!!captionTrack}`);
    }
    if (!captionTrack) {
      captionTrack = captionTracks.find((ct: any) => ct.language_code.startsWith('en'));
      console.log(`[Method 1] English match: ${!!captionTrack}`);
    }
    if (!captionTrack) {
      captionTrack = captionTracks[0];
      console.log(`[Method 1] Using first track: ${captionTrack.language_code}`);
    }

    if (!captionTrack?.base_url) {
      console.log('[Method 1] No base_url on caption track');
      throw new Error('No caption URL available');
    }

    console.log(`[Method 1] Fetching caption from: ${captionTrack.base_url.substring(0, 100)}...`);
    
    // Use global fetch (Node 18+)
    const response = await globalThis.fetch(captionTrack.base_url);
    console.log(`[Method 1] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Caption fetch failed: ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log(`[Method 1] XML length: ${xmlText.length}`);
    
    const transcript = parseCaptionXML(xmlText);
    console.log(`[Method 1] Parsed ${transcript.length} segments`);
    
    if (transcript.length === 0) {
      throw new Error('Empty transcript');
    }
    
    console.log('[Method 1] SUCCESS!');
    return {
      fullText: transcript.map(t => t.text).join(' '),
      segments: transcript
    };
  } catch (error: any) {
    console.error('[Method 1] ERROR:', error.message);
    console.error('[Method 1] Stack:', error.stack);
  }

  // METHOD 2: youtube-transcript library
  try {
    console.log('[Method 2] Trying youtube-transcript library...');
    
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    
    if (transcript && transcript.length > 0) {
      console.log('[Method 2] SUCCESS!');
      return {
        fullText: transcript.map(t => t.text).join(' '),
        segments: transcript.map(t => ({ text: t.text, offset: t.offset }))
      };
    }
  } catch (error: any) {
    console.error('[Method 2] ERROR:', error.message);
  }

  // METHOD 3: youtube-transcript any language
  try {
    console.log('[Method 3] Trying youtube-transcript without language...');
    
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcript && transcript.length > 0) {
      console.log('[Method 3] SUCCESS!');
      return {
        fullText: transcript.map(t => t.text).join(' '),
        segments: transcript.map(t => ({ text: t.text, offset: t.offset }))
      };
    }
  } catch (error: any) {
    console.error('[Method 3] ERROR:', error.message);
  }

  console.error('[fetchTranscript] ALL METHODS FAILED');
  throw new Error('This video does not have captions available.');
}
