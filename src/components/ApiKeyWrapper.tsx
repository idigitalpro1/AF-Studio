import React, { useState, useEffect } from 'react';

export function ApiKeyWrapper({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback if not in AI Studio environment
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // Assume success to mitigate race condition
      setHasKey(true);
    }
  };

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-8">
        <h1 className="text-4xl font-serif mb-4 tracking-wider uppercase">Aspen Fashion</h1>
        <p className="mb-8 text-zinc-400 max-w-md text-center">
          To generate high-quality red carpet images, fashion analysis, and runway music, you need to select a paid Gemini API key.
        </p>
        <button
          onClick={handleSelectKey}
          className="px-8 py-3 bg-white text-black font-medium rounded-none hover:bg-zinc-200 transition-colors uppercase tracking-widest text-sm"
        >
          Select API Key
        </button>
        <p className="mt-6 text-xs text-zinc-500">
          See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-zinc-300">billing documentation</a> for details.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
