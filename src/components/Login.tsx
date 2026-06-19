import React, { useEffect, useState } from 'react';
import { auth, onAuthStateChanged, signInSimulated } from '../firebase';
import { Loader2 } from 'lucide-react';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        onLogin();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [onLogin]);

  const handleLogin = async () => {
    setErrorMsg(null);
    try {
      // Direct sign-in as publisher patrick@villagerpublisihing.com
      signInSimulated('patrick@villagerpublisihing.com', 'Patrick Henry Sweeney');
      onLogin();
    } catch (error: any) {
      console.error("Error signing in", error);
      setErrorMsg("Sign-in with Google failed. Please continue as guest below.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2000&auto=format&fit=crop')" }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      <div className="relative z-10 bg-white/95 p-10 max-w-md w-full text-center shadow-2xl border border-zinc-200 m-4">
        <h1 className="text-4xl font-serif uppercase tracking-widest mb-2">ASPEN FASHION</h1>
        <p className="text-xs text-zinc-500 mb-8 uppercase tracking-widest leading-relaxed">
          The Ultimate Fashion Editor<br/>
          Sign in to access the studio
        </p>
        
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-left">
            <p className="text-xs text-red-700 leading-relaxed font-sans">
              {errorMsg}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <button onClick={handleLogin} className="w-full flex items-center justify-center gap-3 border border-zinc-300 p-3 hover:bg-zinc-50 transition-colors uppercase tracking-wider text-sm font-medium bg-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-300"></div>
            <span className="flex-shrink mx-4 text-zinc-400 text-xs uppercase tracking-widest font-mono">OR</span>
            <div className="flex-grow border-t border-zinc-300"></div>
          </div>

          <button onClick={onLogin} className="w-full flex items-center justify-center gap-2 border border-zinc-950 p-3 bg-zinc-950 text-white hover:bg-zinc-900 transition-colors uppercase tracking-wider text-sm font-medium">
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
