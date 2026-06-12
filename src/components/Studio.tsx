import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Volume2, Loader2, Download, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { GalleryItem } from './Carousel';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Watermark } from './Watermark';
import { saveCreation } from '../lib/db';

const BACKDROPS = [
  "Classic Hollywood Red Carpet (1930s Glamour)",
  "Modern Blockbuster Premiere (Paparazzi Flashes)",
  "Vintage 1950s Oscars Gala (Golden Age)",
  "The Iconic Met Gala Steps (Avant-Garde)",
  "Neon-Lit Tokyo Streets (Midnight Cyber)",
  "Sun-Drenched Amalfi Coast (Summer Luxury)",
  "Monaco Harbor Yacht Deck (Riviera)",
  "Private Jet Interior (Ultra Luxury)",
  "Gucci Storefront Wall Art",
  "Prada Marfa Installation",
  "Chanel Paris Boutique Exterior",
  "Louis Vuitton Monogram Wall",
  "Dior Floral Runway Backdrop",
  "Versace Gold Medusa Wall",
  "Music Festival: Coachella",
  "Music Festival: Burning Man",
  "Music Festival: Tomorrowland",
  "Custom Upload..."
];

const PERIODS = [
  "None (Preserve Original Style)",
  "1920s Roaring Flapper (Gatsby Style)",
  "1950s Golden Age Glamour (Audrey Vibe)",
  "1950s Jeweled-Up Hippie (Boho Chic)",
  "1970s Studio 54 Disco (Sequin & Flare)",
  "1880s Western Gunslinger (Outlaw Chic)",
  "1990s Seattle Grunge (Flannel & Denim)",
  "Modern Men: Yachting (Riviera Style)",
  "Modern Men: Classic Tuxedo (Black Tie)",
  "Modern Men: Old Money (Quiet Luxury)",
  "Modern Men: Urban Streetwear (Hypebeast)",
  "Modern Men: Safari Adventure (Khaki & Linen)",
  "Modern Men: Avant-Garde (Architectural)"
];

const AGES = [
  "None (Current Age)",
  "10 Years Younger (Fresh Faced)",
  "20 Years Younger (Youthful Glow)",
  "10 Years Older (Distinguished)",
  "20 Years Older (Silver Fox)",
  "Childhood (Nostalgic Youth)",
  "Elderly (Wise & Timeless)"
];

const SIZES = ["1K (Free)", "2K ($2)", "4K ($4)"];

const FILTERS = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.35) contrast(1.15) brightness(1.05) saturate(1.1) hue-rotate(-5deg)' },
  { id: 'contrast', name: 'Contrast', css: 'contrast(1.4) saturate(1.25) brightness(1.02)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(0.85) contrast(1.0) brightness(0.95) saturate(0.9)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.5) brightness(0.92)' },
  { id: 'cyberpunk', name: 'Cyberpunk', css: 'contrast(1.2) saturate(1.35) hue-rotate(-25deg) sepia(0.08)' },
  { id: 'sunset', name: 'Sunset', css: 'sepia(0.4) saturate(1.3) brightness(1.02) contrast(1.05)' },
  { id: 'cool', name: 'Cool Edit', css: 'saturate(0.65) contrast(1.18) brightness(1.02) hue-rotate(12deg)' }
];

const applyFilterToImage = (imageSrc: string, filterCss: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!filterCss || filterCss === 'none') {
      resolve(imageSrc);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }
      ctx.filter = filterCss;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } catch (err) {
        console.warn("Canvas export tainted, falling back to original image", err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => {
      resolve(imageSrc);
    };
    img.src = imageSrc;
  });
};

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-300 py-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left focus:outline-none"
      >
        <h4 className="font-serif uppercase tracking-widest text-sm text-zinc-900">{title}</h4>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Studio({ 
  onImageGenerated, 
  coverQuote, 
  setCoverQuote,
  analysis,
  setAnalysis,
  galleryItems = []
}: { 
  onImageGenerated: (url: string, prompt: string) => void,
  coverQuote: string | null,
  setCoverQuote: (quote: string | null) => void,
  analysis: any | null,
  setAnalysis: (analysis: any | null) => void,
  galleryItems?: GalleryItem[]
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trendsReport, setTrendsReport] = useState<{
    themeName: string;
    backdrop: string;
    period: string;
    moodColor: string;
    editorialPitch: string;
    checklist: string[];
  } | null>(null);
  const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  const generateTrends = async () => {
    setIsAnalyzingTrends(true);
    setTrendsError(null);
    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const topCreations = [...galleryItems]
        .sort((a, b) => (b.stars || 0) + (b.comments || 0) - ((a.stars || 0) + (a.comments || 0)))
        .slice(0, 5);

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          `You are a senior fashion director for Aspen Fashion.
We have current top-performing creations in our digital gallery:
${JSON.stringify(topCreations.map(c => ({ user: c.user, stars: c.stars, comments: c.comments, quote: c.quote })))}

Analyze these top entries, find common patterns or style preferences, and predict/recommend a hot new cover design theme.
Choose the BEST matching options from our application's exact lists:
BACKDROPS: ${JSON.stringify(BACKDROPS.filter(b => b !== "Custom Upload..."))}
PERIODS: ${JSON.stringify(PERIODS)}

Return a JSON object with this exact schema:
{
  "themeName": "Name of proposed trend",
  "backdrop": "string from BACKDROPS list (must be exactly matched)",
  "period": "string from PERIODS list (must be exactly matched)",
  "moodColor": "HEX color matching mood",
  "editorialPitch": "1-2 sentence compelling style report",
  "checklist": ["3 core features of this forecast"]
}`
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              themeName: { type: Type.STRING },
              backdrop: { type: Type.STRING },
              period: { type: Type.STRING },
              moodColor: { type: Type.STRING },
              editorialPitch: { type: Type.STRING },
              checklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["themeName", "backdrop", "period", "moodColor", "editorialPitch", "checklist"]
          }
        }
      });

      const text = response.text || "{}";
      const data = JSON.parse(text);
      setTrendsReport(data);
    } catch (err: any) {
      console.error("Error creating fashion trend:", err);
      setTrendsError("Failed to forecast trends. Verify API setup.");
    } finally {
      setIsAnalyzingTrends(false);
    }
  };

  const applyTrends = () => {
    if (!trendsReport) return;
    if (BACKDROPS.includes(trendsReport.backdrop)) {
      setBackdrop(trendsReport.backdrop);
    }
    if (PERIODS.includes(trendsReport.period)) {
      setPeriod(trendsReport.period);
    }
  };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [filteredPreviewUrl, setFilteredPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) {
      setFilteredPreviewUrl(null);
      return;
    }
    const filterObj = FILTERS.find(f => f.id === selectedFilter);
    if (!filterObj || filterObj.css === 'none') {
      setFilteredPreviewUrl(previewUrl);
      return;
    }
    applyFilterToImage(previewUrl, filterObj.css).then(url => {
      setFilteredPreviewUrl(url);
    });
  }, [previewUrl, selectedFilter]);

  const [backdrop, setBackdrop] = useState(BACKDROPS[0]);
  const [period, setPeriod] = useState(PERIODS[0]);
  const [age, setAge] = useState(AGES[0]);
  const [imageSize, setImageSize] = useState(SIZES[0]);
  
  const [customBackdropFile, setCustomBackdropFile] = useState<File | null>(null);
  const [customBackdropPreviewUrl, setCustomBackdropPreviewUrl] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showMagazineCover, setShowMagazineCover] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setSelectedFilter('none');
      setGeneratedImageUrl(null);
      setAnalysis(null);
      setCoverQuote(null);
    }
  };

  const handleCustomBackdropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomBackdropFile(file);
      setCustomBackdropPreviewUrl(URL.createObjectURL(file));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const generateImage = async () => {
    if (!selectedFile) return;
    setIsGenerating(true);
    setError(null);
    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      let base64Data = '';
      let mimeType = selectedFile.type;
      if (selectedFilter !== 'none') {
        const originalBase64Url = `data:${selectedFile.type};base64,${await fileToBase64(selectedFile)}`;
        const filteredUrl = await applyFilterToImage(originalBase64Url, FILTERS.find(f => f.id === selectedFilter)?.css || 'none');
        base64Data = filteredUrl.split(',')[1];
        mimeType = 'image/png';
      } else {
        base64Data = await fileToBase64(selectedFile);
      }
      
      let prompt = `A high-fashion editorial photo. Include groups of up to three people if possible. Place this person on a ${backdrop} backdrop.`;
      const parts: any[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        }
      ];

      if (backdrop === "Custom Upload..." && customBackdropFile) {
        const customBackdropBase64 = await fileToBase64(customBackdropFile);
        parts.push({
          inlineData: {
            data: customBackdropBase64,
            mimeType: customBackdropFile.type,
          }
        });
        prompt = `A high-fashion editorial photo. Include groups of up to three people if possible. Place the person from the first image onto the background shown in the second image. Add a subtle background blur (bokeh) effect to the backdrop image to create depth of field.`;
      }

      if (period !== "None (Preserve Original Style)") {
        prompt += ` Change their outfit to ${period} fashion style while keeping their face and pose.`;
      }
      if (age !== "None (Current Age)") {
        prompt += ` Make the person look ${age.toLowerCase()}.`;
      }

      parts.push({ text: prompt });

      const sizeMap: Record<string, string> = {
        "1K (Free)": "1K",
        "2K ($2)": "2K",
        "4K ($4)": "4K"
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: parts,
        },
        config: {
          // @ts-ignore
          imageConfig: {
            aspectRatio: "3:4",
            imageSize: sizeMap[imageSize] || "1K"
          }
        }
      });

      let newImageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (newImageUrl) {
        setGeneratedImageUrl(newImageUrl);
        setShowMagazineCover(false); // Reset to clean image on new generation
        onImageGenerated(newImageUrl, prompt);
        // Save to database
        saveCreation('image', newImageUrl, prompt);
        // Run analysis in advance
        analyzeOutfit(newImageUrl);
      } else {
        setError("Failed to generate image. The API returned an empty response.");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      let errorMessage = "An unexpected error occurred while generating the image.";
      
      if (error?.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("forbidden")) {
          errorMessage = "Invalid or missing Gemini API key. Please check your configuration.";
        } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (msg.includes("format") || msg.includes("mimetype") || msg.includes("invalid argument")) {
          errorMessage = "Invalid image format or size. Please upload a supported image type (e.g., JPEG, PNG) under 10MB.";
        } else if (msg.includes("quota") || msg.includes("429")) {
          errorMessage = "API quota exceeded. Please try again later.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeOutfit = async (imageUrl?: string) => {
    const targetUrl = imageUrl || generatedImageUrl || filteredPreviewUrl || previewUrl;
    if (!targetUrl) return;
    setIsAnalyzing(true);
    setCoverQuote("Analyzing style...");
    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      let base64Data = '';
      let mimeType = 'image/png';
      if (targetUrl.startsWith('data:')) {
        base64Data = targetUrl.split(',')[1];
        mimeType = targetUrl.split(',')[0].split(':')[1].split(';')[0] || 'image/png';
      } else if (targetUrl.startsWith('blob:')) {
        const res = await fetch(targetUrl);
        const blob = await res.blob();
        mimeType = blob.type || 'image/png';
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            resolve(resultStr.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        throw new Error('Unsupported image URL format.');
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            inlineData: { data: base64Data, mimeType: mimeType }
          },
          "Analyze this outfit. Return a JSON object with the following structure: { \"quote\": \"A short, punchy 1-sentence high-fashion editorial quote describing the vibe\", \"headline\": \"A 2-3 word catchy headline\", \"subheadline\": \"A slightly longer subheadline\", \"review\": \"A 2-3 paragraph detailed review of the outfit, style, and accessories\", \"isLightPhoto\": true, \"criticQuotes\": [ { \"quote\": \"A short quote\", \"source\": \"A fictional or real fashion magazine\" } ], \"shopLinks\": [ { \"name\": \"Product name\", \"url\": \"URL to buy\" } ] }. For isLightPhoto, set to true if the photo's overall content or background is light-colored/white and requires dark text overlays, or false if it is dark/saturated and requires light/white text overlays. Use the googleSearch tool to find real 'buy now' links for the shopLinks."
        ],
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        }
      });
      
      const text = response.text || "{}";
      try {
        const data = JSON.parse(text);
        setAnalysis(data);
        if (data.quote) {
          setCoverQuote(`"${data.quote}"`);
        }
      } catch (e) {
        console.error("Failed to parse JSON", e);
        setAnalysis({ review: text });
      }
    } catch (error) {
      console.error("Error analyzing:", error);
      setCoverQuote("A visionary approach to modern elegance.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speakAnalysis = async () => {
    if (!analysis || !analysis.review) return;
    setIsSpeaking(true);
    try {
      // @ts-ignore
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: analysis.review }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/pcm;rate=24000' }); // TTS returns PCM usually, wait, let's use audio/wav or let browser guess. Actually TTS returns raw PCM, we might need to wrap it in WAV.
        // Wait, the docs say: "These models return encoded audio (e.g., WAV). Use atob and Blob for playback." for Lyria, but for TTS it says: "decode and play audio with sample rate 24000".
        // Let's try audio/wav first, if it fails we might need AudioContext.
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = audioCtx.createBuffer(1, bytes.length / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] = dataView.getInt16(i * 2, true) / 32768;
        }
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      }
    } catch (error) {
      console.error("Error speaking:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Editorial Trends Forecast Widget */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 shadow-2xl relative overflow-hidden text-white transition-all duration-300">
        {/* Dynamic ambient highlight glow */}
        {trendsReport && (
          <div 
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none transition-all duration-500" 
            style={{ backgroundColor: trendsReport.moodColor }}
          />
        )}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 select-none">
                AI Editorial Trends Forecast
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-sans">
              Analyze the community's top creations with Gemini to synthesize a new luxury concept.
            </p>
          </div>
          <button
            onClick={generateTrends}
            disabled={isAnalyzingTrends}
            className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 cursor-pointer pointer-events-auto shrink-0 shadow-lg"
          >
            {isAnalyzingTrends ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-amber-500" />
            )}
            {trendsReport ? "Recalculate Mood" : "Forecast Next Trend"}
          </button>
        </div>

        {trendsError && (
          <div className="bg-red-500/10 border-l-[3px] border-red-500 p-3 my-2 text-xs text-red-400 font-sans">
            {trendsError}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!trendsReport ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center border-2 border-dashed border-zinc-800 bg-zinc-900/30 font-sans"
            >
              <div className="max-w-md mx-auto px-4">
                <Sparkles className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-300 mb-1">Theme Insight Engine Offline</h3>
                <p className="text-[11px] text-zinc-500">
                  Analyze current top-performing submissions in real-time to generate a styled trend, backdrop settings, and premium runway directives.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2"
            >
              <div className="lg:col-span-4 space-y-4 font-sans">
                {/* Visual Accent Title card */}
                <div className="p-4 rounded border border-zinc-800 bg-zinc-900/40 relative">
                  <div className="absolute top-4 right-4 w-3.5 h-3.5 rounded-full shadow-lg" style={{ backgroundColor: trendsReport.moodColor }} title={`Recommended Color Accent: ${trendsReport.moodColor}`} />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">Suggested Theme / Mood</span>
                  <h3 className="text-lg font-serif font-bold uppercase tracking-wider text-white mt-1 mb-2 leading-tight">
                    {trendsReport.themeName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span 
                      className="inline-block w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: trendsReport.moodColor }}
                    />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400">
                      {trendsReport.moodColor}
                    </span>
                  </div>
                </div>

                {/* Configurations proposed */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded">
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 block mb-1">Target Backdrop</span>
                      <span className="text-[11px] text-zinc-200 font-medium line-clamp-2">{trendsReport.backdrop}</span>
                    </div>
                    <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded">
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 block mb-1">Target Period</span>
                      <span className="text-[11px] text-zinc-200 font-medium line-clamp-2">{trendsReport.period}</span>
                    </div>
                  </div>

                  <button
                    onClick={applyTrends}
                    className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest text-[9px] font-bold transition-all cursor-pointer pointer-events-auto flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Suggested Vibe into Studio
                  </button>
                </div>
              </div>

              {/* Pitch and styling bullets */}
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col bg-zinc-900/20 border border-zinc-800 p-4 rounded font-sans leading-relaxed">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Editorial Forecast Report</span>
                  <p className="text-zinc-300 text-xs leading-relaxed font-serif italic font-normal">
                    "{trendsReport.editorialPitch}"
                  </p>
                  <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between text-[9px] text-zinc-500 font-normal">
                    <span>ASPEN CREATOR INSIGHTS</span>
                    <span>ACTIVE TREND</span>
                  </div>
                </div>

                <div className="flex flex-col bg-zinc-900/20 border border-zinc-800 p-4 rounded font-sans">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 mb-2.5">Styling & Accents Checklist</span>
                  <ul className="space-y-2 flex-1 font-normal">
                    {trendsReport.checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span className="text-amber-500 font-bold shrink-0 mt-0.5 font-mono text-[10px]">0{idx+1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top Hero Section */}
      <div className="bg-white p-6 border border-zinc-200 shadow-sm">
        <h2 className="text-xl font-serif uppercase tracking-widest mb-6">1. Original Photo</h2>
        {!previewUrl ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-zinc-300 border-dashed hover:bg-zinc-50 transition-colors cursor-pointer">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-4 text-zinc-400" />
              <p className="mb-2 text-lg text-zinc-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
              <p className="text-sm text-zinc-400">PNG, JPG up to 10MB</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        ) : (
          <>
            <div className="relative w-full h-[50vh] md:h-[60vh] bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200">
              <img 
                src={previewUrl} 
                alt="Original" 
                className="w-full h-full object-contain transition-all duration-300"
                style={{ filter: FILTERS.find(f => f.id === selectedFilter)?.css || 'none' }}
              />
              <label className="absolute bottom-6 right-6 bg-black text-white px-6 py-3 cursor-pointer hover:bg-zinc-800 transition-colors uppercase tracking-widest text-sm font-medium shadow-lg">
                Change Photo
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>

            {/* Photo Filters Suite Selector */}
            <div className="mt-8 border-t border-zinc-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-serif uppercase tracking-widest text-zinc-900 font-bold">Artistic Photo Filters</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Apply professional color-grades and vintage film emulsions to your photo before generating looks.</p>
                </div>
                {selectedFilter !== 'none' && (
                  <button 
                    onClick={() => setSelectedFilter('none')}
                    className="text-xs uppercase tracking-widest font-bold text-zinc-500 hover:text-black transition-colors pointer-events-auto"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-zinc-200">
                {FILTERS.map((f) => {
                  const isActive = selectedFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFilter(f.id)}
                      className="flex flex-col items-center min-w-[76px] md:min-w-[86px] focus:outline-none group snap-start cursor-pointer"
                    >
                      <div 
                        className={`relative w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                          isActive 
                            ? 'border-amber-500 ring-2 ring-amber-500/20 scale-105 shadow-md' 
                            : 'border-zinc-200 group-hover:border-zinc-400'
                        }`}
                      >
                        <img 
                          src={previewUrl} 
                          alt={f.name} 
                          className="w-full h-full object-cover select-none pointer-events-none"
                          style={{ filter: f.css }}
                        />
                      </div>
                      <span 
                        className={`text-[10px] uppercase tracking-wider text-center mt-2 font-medium transition-colors ${
                          isActive ? 'text-amber-600 font-bold' : 'text-zinc-600 group-hover:text-zinc-900'
                        }`}
                      >
                        {f.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-8">
          <div className="bg-white p-6 border border-zinc-200 shadow-sm">
            <h2 className="text-xl font-serif uppercase tracking-widest mb-6">2. Set the Scene</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 uppercase tracking-wider">Backdrop</label>
              <select 
                value={backdrop} 
                onChange={e => setBackdrop(e.target.value)}
                className="w-full border border-zinc-300 p-3 bg-white focus:ring-black focus:border-black"
              >
                {BACKDROPS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              
              {backdrop === "Custom Upload..." && (
                <div className="mt-4">
                  {!customBackdropPreviewUrl ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-300 border-dashed hover:bg-zinc-50 transition-colors cursor-pointer">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <Upload className="w-6 h-6 mb-2 text-zinc-400" />
                        <p className="text-sm text-zinc-500">Upload Custom Backdrop</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleCustomBackdropChange} />
                    </label>
                  ) : (
                    <div className="relative w-full h-32 bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200">
                      <img src={customBackdropPreviewUrl} alt="Custom Backdrop" className="w-full h-full object-cover blur-[2px] scale-105" />
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <span className="text-white text-sm uppercase tracking-widest font-medium">Change</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleCustomBackdropChange} />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 uppercase tracking-wider">Fashion Period Remix</label>
              <select 
                value={period} 
                onChange={e => setPeriod(e.target.value)}
                className="w-full border border-zinc-300 p-3 bg-white focus:ring-black focus:border-black"
              >
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 uppercase tracking-wider">Age Adjustment</label>
              <select 
                value={age} 
                onChange={e => setAge(e.target.value)}
                className="w-full border border-zinc-300 p-3 bg-white focus:ring-black focus:border-black"
              >
                {AGES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 uppercase tracking-wider">Image Quality</label>
              <select 
                value={imageSize} 
                onChange={e => setImageSize(e.target.value)}
                className="w-full border border-zinc-300 p-3 bg-white focus:ring-black focus:border-black"
              >
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (imageSize !== "1K (Free)") {
                setShowCart(true);
              } else {
                generateImage();
              }
            }}
            disabled={!selectedFile || isGenerating || (backdrop === "Custom Upload..." && !customBackdropFile)}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-black text-white p-4 uppercase tracking-widest font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? 'Generating Magic...' : imageSize === "1K (Free)" ? 'Step onto the Red Carpet' : `Add to Cart - ${imageSize.includes('2K') ? '$2' : '$4'}`}
          </button>
        </div>
      </div>

      {showCart && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 max-w-md w-full">
            <h2 className="text-2xl font-serif uppercase tracking-widest mb-4">Checkout</h2>
            <div className="border-t border-b border-zinc-200 py-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-zinc-600">High-Res Generation ({imageSize.split(' ')[0]})</span>
                <span className="font-medium">{imageSize.includes('2K') ? '$2.00' : '$4.00'}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-zinc-500">
                <span>Processing Fee</span>
                <span>$0.00</span>
              </div>
            </div>
            <div className="flex justify-between items-center mb-8 text-lg font-medium">
              <span>Total</span>
              <span>{imageSize.includes('2K') ? '$2.00' : '$4.00'}</span>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowCart(false);
                  generateImage();
                }}
                className="w-full py-3 bg-black text-white uppercase tracking-widest text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Pay via Secure Link & Generate
              </button>
              <div className="text-center text-xs text-zinc-500 uppercase tracking-widest mt-2 mb-4">
                * Watermark removed on paid generations
              </div>
              <button 
                onClick={() => setShowCart(false)}
                className="w-full py-3 border border-zinc-300 uppercase tracking-widest text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Analysis */}
      <div className="space-y-8">
        <div className="bg-white p-6 border border-zinc-200 min-h-[600px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif uppercase tracking-widest">The Result</h2>
            {generatedImageUrl && (
              <button
                onClick={() => setShowMagazineCover(!showMagazineCover)}
                className="text-xs uppercase tracking-widest font-bold border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
              >
                {showMagazineCover ? 'View Clean Image' : 'View as Magazine Cover'}
              </button>
            )}
          </div>
          
          <div className="flex-1 flex items-center justify-center bg-zinc-100 border border-zinc-200 overflow-hidden relative min-h-[400px] w-full max-w-[500px] mx-auto aspect-[3/4] shadow-xl">
            {generatedImageUrl ? (
              <>
                <img src={generatedImageUrl} alt="Generated" className="absolute inset-0 w-full h-full object-cover" />
                
                {/* Overlays */}
                {showMagazineCover && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />

                    {imageSize === "1K (Free)" && <Watermark />}

                    {/* Top Bar: Volume */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                      <div className="text-white/90 text-[8px] md:text-[10px] uppercase tracking-widest font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        ASPEN FASHION <span className="font-normal text-white/70">by</span> PATRICK HENRY SWEENEY
                      </div>
                      <div className="text-white/90 text-[8px] md:text-[10px] uppercase tracking-widest text-right" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        VOL 4. / EXCLUSIVE
                      </div>
                    </div>

                    {/* Left Side: Magazine Titles */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-4 z-10 flex flex-col gap-6 max-w-[140px] md:max-w-[180px]">
                      <div>
                        <h3 className="text-white font-serif text-sm md:text-base leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>THE NEW AVANT-GARDE</h3>
                        <p className="text-white/80 text-[8px] md:text-[10px] sans-serif uppercase tracking-wider mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Redefining Luxury</p>
                      </div>
                      <div>
                        <h3 className="text-white font-serif text-sm md:text-base leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>MIDNIGHT CYBER</h3>
                        <p className="text-white/80 text-[8px] md:text-[10px] sans-serif uppercase tracking-wider mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Neon Trends 2026</p>
                      </div>
                      <div>
                        <h3 className="text-white font-serif text-sm md:text-base leading-tight text-yellow-400" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{analysis?.headline || "GOLDEN AGE GLAMOUR"}</h3>
                        <p className="text-white/80 text-[8px] md:text-[10px] sans-serif uppercase tracking-wider mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{analysis?.subheadline || "A Retrospective"}</p>
                      </div>
                      <div>
                        <h3 className="text-white font-serif text-sm md:text-base leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>EXCLUSIVE INTERVIEW</h3>
                        <p className="text-white/80 text-[8px] md:text-[10px] sans-serif uppercase tracking-wider mt-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Patrick Henry Sweeney</p>
                      </div>
                    </div>

                    {/* Masthead (Moved to Bottom) */}
                    <div className="absolute bottom-32 left-6 z-10">
                      <h1 className="text-5xl md:text-6xl font-serif text-white tracking-tighter opacity-95 font-bold" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.8)' }}>
                        ASPEN
                      </h1>
                      <h2 className="text-xl md:text-2xl font-serif text-white tracking-[0.3em] uppercase mt-[-8px] font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                        FASHION
                      </h2>
                      <p className="text-[10px] md:text-[12px] font-sans text-white tracking-[0.3em] uppercase mt-2 font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        by PATRICK HENRY SWEENEY
                      </p>
                    </div>

                    {/* Quote / Highlight / Review Snippet */}
                    <div className="absolute bottom-6 left-6 right-20 z-10">
                      <div className="border-l-2 border-white/80 pl-3 py-1 bg-black/30 backdrop-blur-sm">
                        <p className="text-white/90 font-serif text-[10px] md:text-xs leading-snug italic" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                          {analysis?.review ? analysis.review.substring(0, 120) + '...' : (coverQuote || '"A very formal classic enthusiast of Versace, Hugo Boss, Armani, and Louis Vuitton, and an Asian-made critic of high distinction."')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Barcode / Issue details */}
                    <div className="absolute bottom-6 right-4 z-10 flex flex-col items-end">
                      <div className="text-white/80 text-[8px] uppercase tracking-widest mb-1">Issue 01</div>
                      <div className="w-10 h-10 bg-white/90 flex items-center justify-center p-1">
                        <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgydjIwaC0yem00IDBoMXYyMGgtMXptMyAwaDF2MjBoLTF6bTIgMGgydjIwaC0yem00IDBoMXYyMGgtMXptMiAwaDN2MjBoLTN6bTQgMGgxdjIwaC0xem0yIDBoMnYyMGgtMnptNCAwaDF2MjBoLTF6IiBmaWxsPSIjMDAwIi8+PC9zdmc+')] bg-repeat-x opacity-80" />
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                <p className="uppercase tracking-widest text-sm">
                  {previewUrl ? "Ready to generate your new look" : "Upload a photo to begin"}
                </p>
              </div>
            )}
          </div>

          {(generatedImageUrl || filteredPreviewUrl || previewUrl) && (
            <div className="mt-6">
              <button
                onClick={() => analyzeOutfit()}
                disabled={isAnalyzing}
                className="w-full border-2 border-black text-black p-3 uppercase tracking-widest font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isAnalyzing ? 'Analyzing...' : 'Analyze Outfit & Shop'}
              </button>
            </div>
          )}
        </div>

        {analysis && (
          <div className="bg-[#e5e5e5] p-4 sm:p-8 border border-zinc-300 relative overflow-hidden" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-dust.png")' }}>
            {/* Background Damask Pattern (simulated with CSS/SVG or just a subtle texture) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/damask-seamless.png')] mix-blend-multiply" />
            
            <div className="relative z-10 max-w-3xl mx-auto bg-white/40 backdrop-blur-sm p-6 sm:p-10 shadow-2xl border border-white/50">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-zinc-800 pb-6 relative">
                <div className="absolute top-0 right-0">
                  <button 
                    onClick={speakAnalysis}
                    disabled={isSpeaking}
                    className="p-2 bg-zinc-900 text-white hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 shadow-lg"
                    title="Listen to review"
                  >
                    {isSpeaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
                <div className="bg-zinc-900 text-white py-2 px-6 inline-block mb-6 shadow-md">
                  <h3 className="text-xl sm:text-2xl font-serif uppercase tracking-widest">Fashion Critics' Review</h3>
                </div>
                <h2 className="text-4xl sm:text-6xl font-serif uppercase tracking-widest mb-2 text-zinc-900">ASPEN FASHION</h2>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[1px] w-12 bg-zinc-800"></div>
                  <span className="uppercase tracking-[0.3em] text-sm font-medium text-zinc-800">PARIS</span>
                  <div className="h-[1px] w-12 bg-zinc-800"></div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Left Column: Image */}
                <div className="flex flex-col">
                  <div className="border-4 border-white shadow-lg bg-zinc-100 aspect-[3/4] relative overflow-hidden">
                    <img src={generatedImageUrl || filteredPreviewUrl || previewUrl || ''} alt="Review Subject" className="w-full h-full object-cover grayscale contrast-125" />
                  </div>
                  <div className="text-center mt-2 border-b border-zinc-400 pb-1">
                    <span className="font-serif italic text-sm text-zinc-700">Photo Available</span>
                  </div>
                </div>

                {/* Right Column: Text */}
                <div className="flex flex-col justify-start">
                  <div className="mb-6">
                    <h4 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-zinc-900 mb-2 leading-tight">
                      {analysis.headline || "ELEGANTLY EXQUISITE"}
                    </h4>
                    <p className="font-serif italic text-lg text-zinc-700">
                      {analysis.subheadline || "A Stunning Debut in the Rockies"}
                    </p>
                    {analysis.quote && (
                      <div className="border-l-2 border-zinc-900 pl-4 py-1 mt-4">
                        <p className="font-serif italic text-zinc-800">"{analysis.quote}"</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-zinc-300">
                    <CollapsibleSection title="The Review" defaultOpen={true}>
                      <div className="prose prose-zinc prose-sm sm:prose-base max-w-none font-serif leading-relaxed text-zinc-800">
                        <Markdown>{analysis.review}</Markdown>
                      </div>
                    </CollapsibleSection>

                    {analysis.criticQuotes && analysis.criticQuotes.length > 0 && (
                      <CollapsibleSection title="Critic Quotes">
                        <div className="space-y-6">
                          {analysis.criticQuotes.map((q: any, i: number) => (
                            <div key={i} className="text-right">
                              <p className="font-serif italic text-lg text-zinc-900 mb-1">"{q.quote}"</p>
                              <p className="text-xs uppercase tracking-widest text-zinc-600">— {q.source}</p>
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}

                    {analysis.shopLinks && analysis.shopLinks.length > 0 && (
                      <CollapsibleSection title="Shop The Look">
                        <div className="flex flex-wrap gap-3">
                          {analysis.shopLinks.map((link: any, i: number) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-wider border border-zinc-400 px-4 py-2 hover:bg-zinc-900 hover:text-white transition-colors">
                              {link.name}
                            </a>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}
                  </div>
                </div>
              </div>

              {/* Publish Link */}
              <div className="mt-8 mb-8 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = generatedImageUrl || filteredPreviewUrl || previewUrl || '';
                    a.download = `${analysis.headline || 'editorial'}.jpg`;
                    a.click();
                  }}
                  className="inline-flex items-center justify-center bg-black text-white font-serif uppercase tracking-[0.15em] px-6 py-4 hover:bg-zinc-800 transition-colors shadow-2xl border border-zinc-700 text-sm sm:text-base w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Editorial .JPG
                </button>
                <a href="https://aspenfashion.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center bg-white text-black font-serif uppercase tracking-[0.15em] px-6 py-4 hover:bg-zinc-100 transition-colors shadow-2xl border border-zinc-300 text-sm sm:text-base w-full sm:w-auto">
                  Publish Live on Aspen Fashion — $50
                </a>
                <button 
                  onClick={() => {
                    setGeneratedImageUrl(null);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setAnalysis(null);
                    setSelectedFilter('none');
                  }}
                  className="inline-flex items-center justify-center bg-red-600 text-white font-serif uppercase tracking-[0.15em] px-6 py-4 hover:bg-red-700 transition-colors shadow-2xl border border-red-800 text-sm sm:text-base w-full sm:w-auto"
                >
                  Delete / Start Over
                </button>
              </div>

              {/* Footer */}
              <div className="border-t-2 border-b-2 border-zinc-800 py-3 text-center">
                <p className="font-serif uppercase tracking-[0.2em] text-sm sm:text-base text-zinc-900">
                  WHERE ALPINE GLAMOUR MEETS HAUTE COUTURE
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
