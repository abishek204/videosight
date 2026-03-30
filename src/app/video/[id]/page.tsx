"use client";

import { useEffect, useState, use } from "react";
import {
  MessageSquare,
  Download,
  ChevronLeft,
  Loader2,
  Sparkles,
  Share2,
  RefreshCcw,
  AlertCircle,
  Clock,
  Check,
  Copy,
  FileText,
  Brain,
  ListTodo,
  MessageCircle,
  ArrowRight,
  Globe
} from "lucide-react";
import jsPDF from "jspdf";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { summarizeYouTubeVideo, SummarizeYouTubeVideoOutput } from "@/ai/flows/summarize-youtube-video";
import { chatAboutVideoContent } from "@/ai/flows/chat-about-video-content";
import { fetchVideoMetadata, formatTimestamp } from "@/lib/youtube-utils";
import { fetchTranscriptAction } from "@/app/actions/youtube";
import { saveSummaryAction } from "@/app/actions/history";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type SummaryLength = 'short' | 'medium' | 'long';

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  
  // State
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<SummarizeYouTubeVideoOutput | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', message: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<{ text: string, offset: number }[]>([]);
  const [reportLength, setReportLength] = useState<SummaryLength>('medium');
  const [language, setLanguage] = useState<string>('en');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("tldr");

  // Main analysis function with auto-retry
  async function performAnalysis(length: SummaryLength, currentLang: string, forceFetch: boolean = false, retryCount: number = 0) {
    const MAX_CLIENT_RETRIES = 2;
    if (!forceFetch && !loading) setRecalculating(true);
    if (retryCount === 0) setError(null);

    try {
      let meta = videoData;

      // 1. Get Metadata
      if (!meta) {
        meta = await fetchVideoMetadata(id);
        setVideoData(meta);
      }

      // 2. Fetch Transcript (never throws — returns {error} on failure)
      const rawTranscriptData = await fetchTranscriptAction(id, currentLang);
      if (rawTranscriptData.error || !rawTranscriptData.fullText) {
        throw new Error(rawTranscriptData.error || 'Transcript unavailable');
      }
      setTranscriptText(rawTranscriptData.fullText);
      setTranscriptSegments(rawTranscriptData.segments);

      // 3. Generate AI Summary (never throws — returns {error} on failure)
      const summary = await summarizeYouTubeVideo({
        videoTitle: meta?.title || "Video",
        transcript: rawTranscriptData.fullText,
        length: length
      });
      if (summary.error || !summary.tldr) {
        throw new Error(summary.error || 'Summary generation failed');
      }
      setSummaryData(summary);
      setError(null);

      // 4. Save to history if user is logged in
      if (user?.isLoggedIn && forceFetch) {
        try {
          await saveSummaryAction(user.uid, id, meta, summary);
        } catch {
          // Silently fail - saving history shouldn't block the user
        }
      }

    } catch (err: any) {
      const errMsg = err?.message || '';
      console.error(`[performAnalysis] Attempt ${retryCount + 1} failed:`, errMsg);
      
      // Auto-retry on any error (the server actions already retried internally)
      if (retryCount < MAX_CLIENT_RETRIES) {
        console.log(`[performAnalysis] Auto-retrying in ${(retryCount + 1) * 2}s...`);
        await new Promise(r => setTimeout(r, (retryCount + 1) * 2000));
        return performAnalysis(length, currentLang, forceFetch, retryCount + 1);
      }

      // All retries exhausted — show the real error (not the sanitized one)
      const cleanMsg = errMsg.includes('Server Components')
        ? 'Analysis temporarily unavailable. Please try again.'
        : (errMsg || 'Analysis failed. Please try again.');
      setError(cleanMsg);
      toast({
        title: "ANALYSIS ERROR",
        description: cleanMsg,
        variant: "destructive"
      });
    } finally {
      if (retryCount >= MAX_CLIENT_RETRIES || retryCount === 0) {
        setLoading(false);
        setRecalculating(false);
      }
    }
  }

  // Initial load
  useEffect(() => {
    performAnalysis(reportLength, language, true);
  }, [id]);

  // Handle asking questions
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || chatLoading || !transcriptText) return;

    const userMessage = question.trim();
    setQuestion("");
    setChatHistory(prev => [...prev, { role: 'user', message: userMessage }]);
    setChatLoading(true);

    try {
      // Build rich context: transcript + AI-generated insights
      let richContext = transcriptText || '';
      if (summaryData) {
        const summaryContext = [
          `\n\n=== AI-GENERATED OVERVIEW ===`,
          summaryData.tldr || '',
          `\n=== KEY POINTS ===`,
          ...(summaryData.keyPoints || []).map((p, i) => `${i + 1}. ${p}`),
          `\n=== DETAILED SUMMARY ===`,
          summaryData.detailedSummary || '',
        ].join('\n');
        richContext = richContext + summaryContext;
      }

      const response = await chatAboutVideoContent({
        transcript: richContext || videoData?.title || '',
        chatHistory: chatHistory.map(h => ({ role: h.role as 'user' | 'assistant', message: h.message })),
        question: userMessage
      });
      setChatHistory(prev => [...prev, { role: 'assistant', message: response.answer }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', message: "Sorry, I couldn't process that question. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Sanitize text for PDF (replace non-ASCII chars that jsPDF can't render)
  const sanitizeForPDF = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/[\u2018\u2019]/g, "'")  // smart single quotes
      .replace(/[\u201C\u201D]/g, '"')  // smart double quotes
      .replace(/\u2013/g, '-')           // en dash
      .replace(/\u2014/g, '--')          // em dash
      .replace(/\u2026/g, '...')         // ellipsis
      .replace(/\u00A0/g, ' ')           // non-breaking space
      .replace(/[^\x00-\x7F]/g, '');     // strip remaining non-ASCII
  };

  // PDF Export (Client-side, 100% free)
  const handleExportPDF = () => {
    if (!summaryData || !videoData) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = 5.5;
    let yPos = margin;

    // Helper: check if we need a new page
    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Helper: write wrapped text block and return new yPos
    const writeTextBlock = (text: string, fontSize: number, fontStyle: string = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      const sanitized = sanitizeForPDF(text);
      const lines: string[] = doc.splitTextToSize(sanitized, contentWidth);
      for (const line of lines) {
        checkPageBreak(lineHeight + 2);
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      }
    };

    // === Header ===
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('VidInsight - Video Summary', margin, yPos);
    yPos += 10;

    // Divider line
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // === Video Title ===
    writeTextBlock(videoData.title, 14, 'bold');
    yPos += 3;

    // === Channel & Date ===
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(sanitizeForPDF(`Channel: ${videoData.channelName}`), margin, yPos);
    yPos += 5;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 10;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // === Quick Overview ===
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Quick Overview', margin, yPos);
    yPos += 7;
    writeTextBlock(summaryData.tldr, 11);
    yPos += 8;

    // === Key Points ===
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Points', margin, yPos);
    yPos += 7;

    summaryData.keyPoints.forEach((point, idx) => {
      checkPageBreak(12);
      const prefix = `${idx + 1}. `;
      const sanitized = sanitizeForPDF(point);
      const lines: string[] = doc.splitTextToSize(prefix + sanitized, contentWidth - 5);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      for (const line of lines) {
        checkPageBreak(lineHeight + 2);
        doc.text(line, margin + 2, yPos);
        yPos += lineHeight;
      }
      yPos += 2;
    });
    yPos += 5;

    // === Detailed Summary ===
    if (summaryData.detailedSummary) {
      checkPageBreak(20);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Summary', margin, yPos);
      yPos += 7;
      writeTextBlock(summaryData.detailedSummary, 11);
    }

    // === Footer on last page ===
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('Generated by VidInsight - vidinsight.app', margin, pageHeight - 10);

    // Save with sanitized filename
    const safeTitle = sanitizeForPDF(videoData.title).substring(0, 30).replace(/[^a-zA-Z0-9 ]/g, '');
    doc.save(`${safeTitle}-summary.pdf`);
    
    toast({
      title: "PDF DOWNLOADED",
      description: "Your summary has been exported successfully.",
    });
  };

  // Share (Web Share API - 100% free)
  const handleShare = async () => {
    try {
      const shareData = {
        title: videoData?.title || "Video Summary",
        text: `Check out this video summary: ${videoData?.title}`,
        url: typeof window !== 'undefined' ? window.location.href : ''
      };

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share(shareData);
          toast({ title: "SHARED", description: "Summary shared successfully!" });
        } catch {
          // User cancelled or share failed
        }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: "LINK COPIED", description: "URL copied to clipboard!" });
      }
    } catch {
      // Suppress all share errors
    }
  };

  // Copy summary to clipboard
  const handleCopySummary = async () => {
    if (!summaryData) return;
    
    try {
      const textToCopy = `
${videoData?.title || "Video Summary"}

QUICK OVERVIEW:
${summaryData.tldr}

KEY POINTS:
${(summaryData.keyPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n')}

DETAILED SUMMARY:
${summaryData.detailedSummary}
      `.trim();

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({ title: "COPIED", description: "Summary copied to clipboard!" });
    } catch {
      // Suppress clipboard errors
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-black/10 blur-xl rounded-full"></div>
            <Loader2 className="h-16 w-16 text-black animate-spin relative" />
          </div>
          <div className="space-y-3 max-w-md">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Analyzing Video</h2>
            <p className="text-black/50 font-medium">
              Extracting transcript, generating insights, and preparing your summary...
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-xs text-black/40">
                <Brain className="h-3.5 w-3.5" />
                AI Processing
              </div>
              <div className="flex items-center gap-2 text-xs text-black/40">
                <FileText className="h-3.5 w-3.5" />
              Extracting Transcript
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50 flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-7xl mx-auto py-8 px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/10">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="w-fit gap-2 text-sm font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to History
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Select */}
            <Select value={language} onValueChange={(val) => { setLanguage(val); performAnalysis(reportLength, val, true); }}>
              <SelectTrigger className="w-[120px] h-10 text-sm">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>

            {/* Report Length */}
            <Select value={reportLength} onValueChange={(val: SummaryLength) => { setReportLength(val); performAnalysis(val, language); }}>
              <SelectTrigger className="w-[160px] h-10 text-sm">
                <FileText className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Quick Overview</SelectItem>
                <SelectItem value="medium">Standard Summary</SelectItem>
                <SelectItem value="long">Deep Dive</SelectItem>
              </SelectContent>
            </Select>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopySummary}
              className="h-10 w-10"
              title="Copy summary"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10"
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="default"
              size="icon"
              onClick={handleExportPDF}
              className="h-10 w-10 bg-black hover:bg-black/90"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => performAnalysis(reportLength, language, true)}
              disabled={recalculating}
              className="h-10 w-10"
              title="Regenerate"
            >
              <RefreshCcw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive" className="my-8">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">Content Unavailable</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
            </AlertDescription>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => performAnalysis(reportLength, language, true)}
              className="mt-4"
            >
              Try Again
            </Button>
          </Alert>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video Player */}
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${id}`}
                  className="h-full w-full"
                  allowFullScreen
                  title={videoData?.title || 'Video player'}
                />
              </div>

              {/* Video Info */}
              <div className="space-y-4">
                <h1 className="text-2xl md:text-3xl font-black leading-tight">
                  {videoData?.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-black/50">
                  <Badge variant="outline" className="font-semibold">
                    {videoData?.channelName}
                  </Badge>
                  <span>•</span>
                  <span>{videoData?.publishedAt}</span>
                  <span>•</span>
                  <Badge className="bg-black text-white font-semibold">
                    {reportLength === 'short' ? 'QUICK' : reportLength === 'long' ? 'DETAILED' : 'STANDARD'}
                  </Badge>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start h-auto bg-transparent border-b border-black/10 rounded-none p-0 mb-6 gap-1">
                  <TabsTrigger 
                    value="tldr" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3 font-semibold text-sm transition-all opacity-60 data-[state=active]:opacity-100"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="detailed"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3 font-semibold text-sm transition-all opacity-60 data-[state=active]:opacity-100"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger 
                    value="points"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3 font-semibold text-sm transition-all opacity-60 data-[state=active]:opacity-100"
                  >
                    <ListTodo className="h-4 w-4 mr-2" />
                    Key Points
                  </TabsTrigger>
                  <TabsTrigger 
                    value="transcript"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent px-4 py-3 font-semibold text-sm transition-all opacity-60 data-[state=active]:opacity-100"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Transcript
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tldr" className="m-0">
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-6">
                      <p className="text-lg leading-relaxed font-medium">
                        {summaryData?.tldr}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="detailed" className="m-0">
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-6">
                      <div className="prose prose-sm max-w-none">
                        <p className="text-base leading-7 whitespace-pre-wrap">
                          {summaryData?.detailedSummary}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="points" className="m-0">
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-6">
                      <div className="grid gap-4">
                        {(summaryData?.keyPoints || []).map((point, idx) => (
                          <div key={idx} className="flex gap-4 p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shrink-0">
                              {idx + 1}
                            </div>
                            <p className="text-base font-medium leading-relaxed pt-1">
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="transcript" className="m-0">
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-6">
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                          {transcriptSegments.map((seg, idx) => (
                            <div key={idx} className="flex gap-4 py-3 border-b border-black/5 last:border-0">
                              <div className="flex items-center gap-2 shrink-0">
                                <Clock className="h-4 w-4 text-black/30" />
                                <span className="text-xs font-mono font-medium text-black/50">
                                  {formatTimestamp(seg.offset)}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">
                                {seg.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Chat Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-[calc(100vh-200px)] sticky top-8 flex flex-col border shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="border-b bg-gradient-to-r from-black to-zinc-800 text-white p-6 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Ask About This Video</CardTitle>
                      <p className="text-xs text-white/60">Get instant answers from the content</p>
                    </div>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {chatHistory.length === 0 && (
                      <div className="text-center py-12 space-y-4">
                        <div className="h-16 w-16 bg-black/5 rounded-2xl flex items-center justify-center mx-auto">
                          <Sparkles className="h-8 w-8 text-black/20" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-bold">Ask anything about this video</p>
                          <p className="text-xs text-black/50">
                            I'll search the transcript and give you precise answers.
                          </p>
                        </div>
                      </div>
                    )}

                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-3 text-sm rounded-2xl ${
                            msg.role === 'user'
                              ? 'bg-black text-white'
                              : 'bg-zinc-100 border border-black/5'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-zinc-100 border border-black/5 rounded-2xl px-4 py-3 flex gap-2">
                          <div className="h-2 w-2 bg-black/30 rounded-full animate-pulse" />
                          <div className="h-2 w-2 bg-black/30 rounded-full animate-pulse [animation-delay:0.2s]" />
                          <div className="h-2 w-2 bg-black/30 rounded-full animate-pulse [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <form onSubmit={handleAskQuestion} className="p-4 border-t bg-white shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask a question..."
                      className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-xl border-black/10 focus-visible:ring-black/20 text-sm"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAskQuestion(e);
                        }
                      }}
                      disabled={chatLoading || !transcriptText}
                      rows={1}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={chatLoading || !transcriptText}
                      className="h-[44px] w-[44px] rounded-xl bg-black hover:bg-black/90 shrink-0"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-black/40 text-center mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </form>
              </Card>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-black/5 py-8 mt-16 bg-white">
        <div className="container text-center">
          <p className="text-xs text-black/40 font-medium">
            Protected Private Analysis • Your data is secure
          </p>
        </div>
      </footer>
    </div>
  );
}
