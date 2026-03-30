"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Youtube, ArrowRight, User, Mail, Lock, Eye, EyeOff } from "lucide-react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerAction } from "@/app/actions/auth";
import { toast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();


  const handleRegister = async (formData: FormData) => {
    setIsLoading(true);
    const result = await registerAction(formData);

    if (result.success) {
      window.location.href = "/dashboard";
    } else {
      toast({
        title: "REGISTRATION FAILED",
        description: result.error || "Please check your information.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[450px] space-y-8">
          <div className="flex flex-col items-center space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Youtube className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black text-gray-900">VidInsight</span>
            </Link>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-gray-900">Create Account</h1>
              <p className="text-gray-600 font-medium">Join 10,000+ users summarizing better</p>
            </div>
          </div>

          <form action={handleRegister} className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    name="name"
                    placeholder="John Doe" 
                    className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    name="email"
                    type="email"
                    placeholder="name@example.com" 
                    className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Choose Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••" 
                    className="pl-10 pr-10 h-12 bg-gray-50 border-gray-100 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-base hover:opacity-90 transition-all shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-purple-600 font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-400">
              By joining, you agree to our{" "}
              <Link href="#" className="hover:text-gray-600 underline">Terms</Link> and{" "}
              <Link href="#" className="hover:text-gray-600 underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
