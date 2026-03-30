import { getVideoMetadataAction, fetchTranscriptAction } from "@/app/actions/youtube";

export function extractYoutubeId(url: string): string | null {
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\/shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
}


export async function fetchVideoMetadata(videoId: string) {
  return await getVideoMetadataAction(videoId);
}

export async function getTranscript(videoId: string, lang: string = 'en') {
  return await fetchTranscriptAction(videoId, lang);
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
