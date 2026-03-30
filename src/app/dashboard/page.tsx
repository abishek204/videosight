
"use client";

import { useEffect, useState } from "react";
import { Search, History, ArrowRight, Loader2, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { getUserHistoryAction, deleteSummaryAction } from "@/app/actions/history";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadHistory() {
    if (!user || !user.isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getUserHistoryAction(user.uid);
    setHistory(data);
    setLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, [user?.isLoggedIn]);

  const handleDelete = async (id: string) => {
    const result = await deleteSummaryAction(id);
    if (result.success) {
      setHistory(prev => prev.filter(item => item.id !== id));
      toast({
        title: "DELETED",
        description: "The summary has been removed from your archive.",
      });
    }
  };

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.channelName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-7xl mx-auto py-12 px-4 md:px-8">
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-200">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <History className="h-5 w-5" />
                <span className="text-sm font-bold uppercase tracking-wide">Your Library</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900">Archive</h1>
              <p className="text-gray-600 font-medium text-sm">Your personalized video history.</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search your summaries..."
                className="pl-12 h-12 bg-white border border-gray-200 rounded-xl text-sm font-medium focus-visible:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-black" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Loading History...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-32 text-center space-y-10 max-w-md mx-auto">
              <div className="h-16 w-16 bg-secondary/50 rounded-none flex items-center justify-center mx-auto">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Archive Empty</h2>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px] leading-loose">
                  {!user?.isLoggedIn ? "Sign in to save your summaries." : searchQuery ? "No matches found for your search." : "You haven't generated any summaries yet. Paste a link to start."}
                </p>
              </div>
              <Button variant="outline" size="lg" className="font-black uppercase tracking-[0.3em] text-[10px] rounded-none px-12 h-14 border-foreground" asChild>
                <Link href={user?.isLoggedIn ? "/" : "/auth/login"}>{user?.isLoggedIn ? "New Summary" : "Sign In"}</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {filteredHistory.map((item) => (
                <Card key={item.id} className="group overflow-hidden rounded-none border-none bg-transparent hover:shadow-none transition-all duration-300">
                  <div className="aspect-video relative overflow-hidden bg-secondary/20 border mb-6">
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="default" className="font-black uppercase tracking-[0.2em] text-[9px] rounded-none px-8 h-10" asChild>
                        <Link href={`/video/${item.videoId}`}>
                          View Report
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-0 space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-black text-sm line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-primary transition-colors">{item.title}</h3>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">{item.date}</span>
                        <Badge variant="outline" className="text-[8px] uppercase font-black tracking-widest rounded-none border-foreground/20">Youtube</Badge>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-6 border-t border-dashed">
                      <Button variant="link" size="sm" className="p-0 h-auto font-black uppercase tracking-[0.2em] text-[9px] flex items-center gap-2" asChild>
                        <Link href={`/video/${item.videoId}`}>
                          Open <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive ml-auto transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-12 mt-24">
        <div className="container text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">Secure Archive Management</p>
        </div>
      </footer>
    </div>
  );
}
