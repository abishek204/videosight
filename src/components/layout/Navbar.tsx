
"use client";

import Link from "next/link";
import { Youtube, History, LogIn, Menu, Plus, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-black bg-white">
      <div className="container flex h-20 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter uppercase text-black">
          <div className="bg-black p-1.5 transition-transform hover:scale-110">
            <Youtube className="h-5 w-5 text-white" />
          </div>
          <span className="hidden sm:inline">VidInsight</span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-[0.3em] text-black/50 hover:text-black transition-all flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </Link>
          
          {user?.isLoggedIn ? (
            <div className="flex items-center gap-8">
              <button 
                onClick={() => logout()}
                className="text-[10px] font-black uppercase tracking-[0.3em] text-black/50 hover:text-black transition-all flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
              <div className="h-10 w-10 bg-zinc-100 flex items-center justify-center border border-black/5 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="h-full w-full object-cover grayscale" />
                ) : (
                  <User className="h-4 w-4 text-black/40" />
                )}
              </div>
            </div>
          ) : (
            <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-black/50 hover:text-black transition-all flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          )}

          <Button variant="default" className="font-black uppercase tracking-[0.2em] text-[10px] px-8 h-12 rounded-none bg-black text-white hover:bg-black/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all" asChild>
            <Link href="/">
              <Plus className="h-3.5 w-3.5 mr-2" /> New Summary
            </Link>
          </Button>
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-none h-10 w-10 border border-black/10">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none border-black bg-white p-2 space-y-1">
              <DropdownMenuItem asChild className="rounded-none focus:bg-black focus:text-white p-3">
                <Link href="/dashboard" className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
                  <History className="h-4 w-4" /> My History
                </Link>
              </DropdownMenuItem>
              {user?.isLoggedIn ? (
                <DropdownMenuItem onClick={() => logout()} className="rounded-none focus:bg-black focus:text-white p-3 cursor-pointer">
                  <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest w-full">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </div>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild className="rounded-none focus:bg-black focus:text-white p-3">
                  <Link href="/auth/login" className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
                    <LogIn className="h-4 w-4" /> Sign In
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
