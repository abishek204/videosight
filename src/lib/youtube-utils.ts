/**
 * YouTube utility functions - client-safe helpers only.
 * Server actions should be imported directly from '@/app/actions/youtube'.
 */

export function extractYoutubeId(url: string): string | null {
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
}

export async function fetchVideoMetadata(videoId: string) {
  // Use the oembed API directly from client side - no server action needed
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (!response.ok) throw new Error('Not found');
    const data = await response.json();
    return {
      title: data.title,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelName: data.author_name,
      publishedAt: "YouTube Video",
    };
  } catch (error) {
    return {
      title: `Video (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channelName: "YouTube Channel",
      publishedAt: "Recent",
    };
  }
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
