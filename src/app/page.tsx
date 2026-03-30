"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, Zap, Shield, Clock, ArrowRight, Brain, MessageSquare, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import { extractYoutubeId } from "@/lib/youtube-utils";
import { toast } from "@/hooks/use-toast";

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYoutubeId(url);

    if (!id) {
      toast({
        title: "INVALID LINK",
        description: "Please paste a valid YouTube video URL.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    router.push(`/video/${id}`);
  };

  const features = [
    {
      icon: Brain,
      title: "AI Summaries",
      description: "Get concise, intelligent summaries of any YouTube video in seconds.",
      color: "bg-blue-600"
    },
    {
      icon: MessageSquare,
      title: "Ask Questions",
      description: "Chat with the video and get specific answers from the content.",
      color: "bg-green-600"
    },
    {
      icon: Bookmark,
      title: "Save History",
      description: "All your summaries are saved and accessible anytime.",
      color: "bg-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-body">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-4 bg-white">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <Zap className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-bold text-green-700">100% Free • No Signup Required</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
              Understand Any Video
              <br />
              <span className="text-gray-400">In Seconds</span>
            </h1>

            <p className="text-base md:text-lg text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Transform lengthy YouTube videos into clear, actionable summaries.
              Ask questions, get key insights, and save time on every video you watch.
            </p>

            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto pt-8">
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-gray-100 rounded-lg border border-gray-200">
                <div className="flex-1 flex items-center px-6 gap-4 bg-white rounded-md">
                  <Youtube className="h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Paste YouTube URL here..."
                    className="bg-transparent border-none focus-visible:ring-0 text-base font-medium h-14 p-0 placeholder:text-gray-400"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-md px-8 font-bold text-base h-14 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {isLoading ? "Analyzing..." : "Summarize"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-8 pt-8">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Private & Secure</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>Save Hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Brain className="h-4 w-4 text-orange-600" />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
                Everything You Need
              </h2>
              <p className="text-gray-600 font-medium max-w-xl mx-auto">
                Powerful features to help you learn faster and retain more.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-8 bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className={`h-12 w-12 ${feature.color} rounded-md flex items-center justify-center mb-6`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 font-medium leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 bg-white border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
                How It Works
              </h2>
              <p className="text-gray-600 font-medium max-w-xl mx-auto">
                Three simple steps to video understanding.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              {[
                {
                  step: "01",
                  title: "Paste Link",
                  description: "Copy any YouTube video URL and paste it above."
                },
                {
                  step: "02",
                  title: "AI Analysis",
                  description: "Our AI extracts and analyzes the video content."
                },
                {
                  step: "03",
                  title: "Get Insights",
                  description: "Receive a summary, key points, and ask questions."
                }
              ].map((item, index) => (
                <div key={index} className="text-center space-y-4">
                  <div className="text-6xl font-black text-gray-100 mb-4">{item.step}</div>
                  <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                  <p className="text-gray-600 font-medium">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-md">
              <Youtube className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-700">VidInsight</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">© 2024 VidInsight. Built for education.</p>
          <div className="flex gap-6 text-xs font-medium text-gray-500">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
