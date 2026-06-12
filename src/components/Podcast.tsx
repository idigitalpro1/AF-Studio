import React, { useState, useRef } from 'react';
import { Play, Pause, Loader2, Mic, FileText } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

function createWavBlob(pcmBytes: Uint8Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const pcmData = new Uint8Array(buffer, 44);
  pcmData.set(pcmBytes);

  return new Blob([buffer], { type: 'audio/wav' });
}

export function Podcast() {
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generatePodcast = async () => {
    setIsGeneratingScript(true);
    setScript(null);
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);

    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      // 1. Generate Script with Search Grounding
      const scriptResponse = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: "You are Patrick Henry Sweeney, publisher of Aspen Fashion. You are a formal classic enthusiast of Versace, Hugo Boss, Armani, and Louis Vuitton, and a critic of high distinction. Write the script for your latest podcast episode of 'The Aspen Fashion Report'. Cover the absolute latest real-world fashion news, upcoming fashion week dates, and recent chatter/gossip from worldwide fashion icons. Use the googleSearch tool to get the latest real information. Make it engaging, authoritative, and sophisticated. Keep the script to about 400-500 words so it can be synthesized to audio smoothly. Output ONLY the spoken text, no stage directions or speaker labels.",
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const generatedScript = scriptResponse.text || "Welcome to The Aspen Fashion Report. Unfortunately, we could not retrieve the latest news at this moment.";
      setScript(generatedScript);
      setIsGeneratingScript(false);
      setIsGeneratingAudio(true);

      // 2. Generate Audio
      const audioResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: generatedScript }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const wavBlob = createWavBlob(bytes, 24000);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Podcast generation error:", error);
      alert("Failed to generate podcast. Please try again.");
    } finally {
      setIsGeneratingScript(false);
      setIsGeneratingAudio(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-serif uppercase tracking-widest mb-4">The Aspen Fashion Report</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          Hosted by Patrick Henry Sweeney. Get the latest fashion news, dates, and exclusive chatter from worldwide fashion icons.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-8 border-b border-zinc-100 mb-8">
          <div className="w-32 h-32 bg-zinc-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Mic className="w-12 h-12 text-zinc-300" />
          </div>
          
          {!script && !isGeneratingScript && !isGeneratingAudio && (
            <button
              onClick={generatePodcast}
              className="px-8 py-4 bg-black text-white uppercase tracking-widest text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              Generate Latest Episode
            </button>
          )}

          {(isGeneratingScript || isGeneratingAudio) && (
            <div className="flex flex-col items-center gap-4 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-black" />
              <p className="uppercase tracking-widest text-sm font-medium">
                {isGeneratingScript ? 'Gathering latest fashion news...' : 'Recording podcast audio...'}
              </p>
            </div>
          )}

          {audioUrl && (
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              <audio 
                ref={audioRef} 
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
                className="w-full"
              />
              <button
                onClick={generatePodcast}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-black underline underline-offset-4"
              >
                Generate a new episode
              </button>
            </div>
          )}
        </div>

        {script && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-6 text-zinc-400">
              <FileText className="w-5 h-5" />
              <h3 className="font-serif uppercase tracking-widest text-lg text-black">Episode Transcript</h3>
            </div>
            <div className="prose prose-zinc prose-p:leading-relaxed prose-p:mb-6 text-zinc-700">
              {script.split('\n').map((paragraph, idx) => (
                paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
