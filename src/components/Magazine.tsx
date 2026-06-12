import { useRef, useState, useEffect } from 'react';
import { Download, Share2, Save, Loader2, Trash2, Plus, Sparkles, Move } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import { saveCreation } from '../lib/db';

interface ActiveStamp {
  id: string;
  type: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: 'light' | 'dark' | 'gold' | 'red';
}

const STAMP_TEMPLATES = [
  {
    type: 'fashion_week_seal',
    name: 'Fashion Week Seal',
    render: (colorClass: string) => (
      <svg viewBox="0 0 100 100" className={`w-full h-full fill-none stroke-current ${colorClass}`}>
        <circle cx="50" cy="50" r="45" strokeWidth="1" strokeDasharray="3,3" />
        <circle cx="50" cy="50" r="41" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="26" strokeWidth="1" />
        {/* We use stroke="none" fill="none" to prevent rendering the guide path itself but keep it active for text paths */}
        <path id="badgeTextPath" d="M 22,50 A 28,28 0 1,1 78,50" fill="none" stroke="none" />
        <path id="badgeTextPathBottom" d="M 78,50 A 28,28 0 0,1 22,50" fill="none" stroke="none" />
        <text className="font-sans text-[7.5px] font-black tracking-[0.25em]" fill="currentColor">
          <textPath href="#badgeTextPath" startOffset="50%" textAnchor="middle">
            LONDON • MILAN • NY
          </textPath>
        </text>
        <text className="font-sans text-[7.5px] font-black tracking-[0.25em]" fill="currentColor">
          <textPath href="#badgeTextPathBottom" startOffset="50%" textAnchor="middle">
            PARIS • COUTURE
          </textPath>
        </text>
        <text x="50" y="47" textAnchor="middle" className="font-serif font-black text-xs tracking-wider" fill="currentColor">FW</text>
        <text x="50" y="58" textAnchor="middle" className="font-sans font-bold text-[6px] tracking-[0.2em] opacity-80" fill="currentColor">2026</text>
      </svg>
    )
  },
  {
    type: 'editorial_badge',
    name: 'Editorial Label',
    render: (colorClass: string) => (
      <div className={`w-full h-full border-2 border-current px-2 py-1 flex flex-col items-center justify-center text-center uppercase tracking-[0.16em] font-sans font-black ${colorClass}`}>
        <span className="text-[6px] font-bold leading-none tracking-[0.2em] opacity-75">RECOMMENDED</span>
        <div className="h-[1px] w-full bg-current my-0.5 opacity-40" />
        <span className="text-[9px] tracking-[0.25em] font-black leading-none">EDITORIAL</span>
        <span className="text-[5px] font-medium tracking-[0.1em] mt-0.5 opacity-75">EST. 2026</span>
      </div>
    )
  },
  {
    type: 'limited_edition',
    name: 'Limited Badge',
    render: (colorClass: string) => (
      <div className={`w-full h-full border border-current p-0.5 flex flex-col items-center justify-center text-center uppercase ${colorClass}`}>
        <div className="border border-current border-dashed w-full h-full p-1.5 flex flex-col items-center justify-center">
          <span className="text-[6px] font-mono tracking-widest leading-none">LIMITED EDITION</span>
          <span className="text-[10px] font-serif font-bold italic tracking-wider leading-none mt-1">Special</span>
          <span className="text-[5px] font-mono opacity-80 mt-1">Nº 4810</span>
        </div>
      </div>
    )
  },
  {
    type: 'star_burst',
    name: 'Editorial Star',
    render: (colorClass: string) => (
      <svg viewBox="0 0 100 100" className={`w-full h-full fill-current ${colorClass}`}>
        <polygon points="50,5 54,26 73,12 60,32 87,27 63,42 94,50 63,58 87,73 60,68 73,88 54,74 50,95 46,74 27,88 40,68 13,73 37,58 6,50 37,42 13,27 40,32 27,12 46,26" />
        <text x="50" y="53" textAnchor="middle" className="text-[8px] font-sans font-black tracking-widest text-white mix-blend-difference" fill="currentColor">CHIC</text>
      </svg>
    )
  },
  {
    type: 'paris_couture',
    name: 'Paris Couture',
    render: (colorClass: string) => (
      <div className={`w-full h-full flex flex-col items-center justify-center p-2 rounded-full border border-current border-double ${colorClass}`}>
        <span className="font-serif text-[8px] font-bold tracking-[0.1em] leading-none">HAUTE</span>
        <span className="font-sans text-[6px] tracking-[0.2em] font-normal opacity-90 leading-none mt-0.5">COUTURE</span>
        <span className="font-serif text-[7px] italic mt-0.5 opacity-80 leading-none">Paris</span>
      </div>
    )
  },
  {
    type: 'editorial_crown',
    name: 'Royal Flourish',
    render: (colorClass: string) => (
      <div className={`w-full h-full flex flex-col items-center justify-center p-1 border-y border-current ${colorClass} text-center`}>
         <svg viewBox="0 0 100 60" className="w-8 h-6 fill-none stroke-current" strokeWidth="2.5">
           <path d="M 10,50 L 20,20 L 40,40 L 50,15 L 60,40 L 80,20 L 90,50 Z" />
           <circle cx="20" cy="17" r="3" fill="currentColor" />
           <circle cx="50" cy="12" r="3" fill="currentColor" />
           <circle cx="80" cy="17" r="3" fill="currentColor" />
           <line x1="10" y1="52" x2="90" y2="52" />
         </svg>
         <span className="text-[5px] font-mono tracking-[0.3em] mt-1 font-bold leading-none">PREMIUM COLL</span>
      </div>
    )
  }
];

const getStampColorClass = (color: 'light' | 'dark' | 'gold' | 'red') => {
  switch (color) {
    case 'light':
      return 'text-white border-white';
    case 'dark':
      return 'text-zinc-950 border-zinc-950';
    case 'gold':
      return 'text-amber-400 border-amber-400';
    case 'red':
      return 'text-red-500 border-red-500';
  }
};

const MAGAZINES = [
  "ASPEN FASHION",
  "VOGUE",
  "HARPER'S BAZAAR",
  "ELLE",
  "GQ",
  "FLEURISH MAGAZINE",
  "THE COLORADO STATESMAN",
  "THE VILLAGER",
  "WEEKLY REGISTER-CALL",
  "theCorridor.biz"
];

const LAYOUT_PRESETS = [
  {
    id: "vogue_minimalist",
    name: "Vogue Minimalist",
    description: "High-fashion elegance. Centered serifs, deep black margins, and an exclusive gold seal.",
    magazine: "VOGUE",
    isLightPhoto: false,
    headlineFont: "playfair",
    headlineSize: 110,
    headlineColor: "default",
    headlineWeight: "normal",
    headlineSpacing: "0.1em",
    subheadlineFont: "playfair",
    subheadlineSize: 95,
    subheadlineColor: "default",
    subheadlineWeight: "default",
    subheadlineSpacing: "default",
    quoteFont: "playfair",
    quoteSize: 110,
    quoteColor: "default",
    quoteWeight: "default",
    quoteSpacing: "default",
    stamps: [
      {
        type: "fashion_week_seal",
        x: 82,
        y: 20,
        scale: 0.9,
        rotation: 12,
        color: "gold" as const
      }
    ]
  },
  {
    id: "high_energy_street",
    name: "High-Energy Street",
    description: "Neon colors, tight tracking, heavy futuristic sans, and offset grunge stamps.",
    magazine: "GQ",
    isLightPhoto: false,
    headlineFont: "space",
    headlineSize: 130,
    headlineColor: "#ef4444",
    headlineWeight: "900",
    headlineSpacing: "-0.04em",
    subheadlineFont: "space",
    subheadlineSize: 110,
    subheadlineColor: "#facc15",
    subheadlineWeight: "700",
    subheadlineSpacing: "0.1em",
    quoteFont: "jetbrains",
    quoteSize: 115,
    quoteColor: "#ffffff",
    quoteWeight: "900",
    quoteSpacing: "default",
    stamps: [
      {
        type: "star_burst",
        x: 80,
        y: 48,
        scale: 1.2,
        rotation: -15,
        color: "red" as const
      },
      {
        type: "paris_couture",
        x: 18,
        y: 75,
        scale: 1.0,
        rotation: 10,
        color: "light" as const
      }
    ]
  },
  {
    id: "retro_bazaar",
    name: "Retro Bazaar",
    description: "Sophisticated vintage aesthetics. Baskerville, warm overlays, and a royal touch.",
    magazine: "HARPER'S BAZAAR",
    isLightPhoto: true,
    headlineFont: "baskerville",
    headlineSize: 100,
    headlineColor: "#09090b",
    headlineWeight: "700",
    headlineSpacing: "0.15em",
    subheadlineFont: "baskerville",
    subheadlineSize: 105,
    subheadlineColor: "#ef4444",
    subheadlineWeight: "300",
    subheadlineSpacing: "0.1em",
    quoteFont: "baskerville",
    quoteSize: 100,
    quoteColor: "#09090b",
    quoteWeight: "default",
    quoteSpacing: "0.1em",
    stamps: [
      {
        type: "editorial_crown",
        x: 85,
        y: 12,
        scale: 0.8,
        rotation: 0,
        color: "gold" as const
      }
    ]
  },
  {
    id: "brutalist_mono",
    name: "Brutalist Corridor",
    description: "Harsh monospace layout, tightly spaced uppercase lettering, and a dashed limited sticker.",
    magazine: "theCorridor.biz",
    isLightPhoto: true,
    headlineFont: "jetbrains",
    headlineSize: 115,
    headlineColor: "#09090b",
    headlineWeight: "900",
    headlineSpacing: "-0.04em",
    subheadlineFont: "jetbrains",
    subheadlineSize: 90,
    subheadlineColor: "default",
    subheadlineWeight: "default",
    subheadlineSpacing: "default",
    quoteFont: "jetbrains",
    quoteSize: 95,
    quoteColor: "#09090b",
    quoteWeight: "700",
    quoteSpacing: "0.1em",
    stamps: [
      {
        type: "limited_edition",
        x: 18,
        y: 84,
        scale: 0.9,
        rotation: -8,
        color: "dark" as const
      }
    ]
  },
  {
    id: "neon_pink_elle",
    name: "Feminine Edge / Elle",
    description: "Playful pink contrast overlays, thick display typography, and double chic seals.",
    magazine: "ELLE",
    isLightPhoto: false,
    headlineFont: "futura",
    headlineSize: 120,
    headlineColor: "#ec4899",
    headlineWeight: "900",
    headlineSpacing: "0.1em",
    subheadlineFont: "inter",
    subheadlineSize: 100,
    subheadlineColor: "#ffffff",
    subheadlineWeight: "700",
    subheadlineSpacing: "default",
    quoteFont: "playfair",
    quoteSize: 110,
    quoteColor: "#ffffff",
    quoteWeight: "700",
    quoteSpacing: "default",
    stamps: [
      {
        type: "editorial_badge",
        x: 80,
        y: 28,
        scale: 1.0,
        rotation: -4,
        color: "red" as const
      }
    ]
  }
];

const EditableTextWrapper = ({ field, currentStyle, children, onClick, className = '' }: { 
  field: 'headline' | 'subheadline' | 'quote';
  currentStyle: React.CSSProperties;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) => {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={currentStyle}
      className={`group/editable cursor-pointer relative hover:ring-1 hover:ring-dashed hover:ring-amber-500/70 p-0.5 rounded transition-all pointer-events-auto select-none ${className}`}
      title={`Click to customize ${field}`}
    >
      {/* Visual edit overlay tag shown on hover (ignored when converting to image) */}
      <span 
        data-html2canvas-ignore="true" 
        className="absolute -top-4 left-1 opacity-0 group-hover/editable:opacity-100 bg-amber-500 text-white text-[7.5px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow z-[60] transition-opacity pointer-events-none whitespace-nowrap leading-none"
      >
        ✍️ Custom {field}
      </span>
      {children}
    </div>
  );
};

export function Magazine({ generatedImage, coverQuote, analysis }: { generatedImage: string | null, coverQuote?: string | null, analysis?: any | null }) {
  const coverRef = useRef<HTMLDivElement>(null);
  const [selectedMagazine, setSelectedMagazine] = useState(MAGAZINES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLightPhoto, setIsLightPhoto] = useState(analysis?.isLightPhoto ?? false);
  const [aspect, setAspect] = useState<'a4' | 'square' | 'vertical'>('a4');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const applyLayoutPreset = (presetId: string) => {
    const preset = LAYOUT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setActivePreset(presetId);
    setSelectedMagazine(preset.magazine);
    setIsLightPhoto(preset.isLightPhoto);

    // Headline typography
    setHeadlineFont(preset.headlineFont);
    setHeadlineSize(preset.headlineSize);
    setHeadlineColor(preset.headlineColor);
    setHeadlineWeight(preset.headlineWeight);
    setHeadlineSpacing(preset.headlineSpacing);

    // Subheadline typography
    setSubheadlineFont(preset.subheadlineFont);
    setSubheadlineSize(preset.subheadlineSize);
    setSubheadlineColor(preset.subheadlineColor);
    setSubheadlineWeight(preset.subheadlineWeight);
    setSubheadlineSpacing(preset.subheadlineSpacing);

    // Quote typography
    setQuoteFont(preset.quoteFont);
    setQuoteSize(preset.quoteSize);
    setQuoteColor(preset.quoteColor);
    setQuoteWeight(preset.quoteWeight);
    setQuoteSpacing(preset.quoteSpacing);

    // Sync layout stamps
    if (preset.stamps) {
      const mappedStamps = preset.stamps.map((stamp, i) => ({
        id: `preset_stamp_${Date.now()}_${i}`,
        type: stamp.type,
        x: stamp.x,
        y: stamp.y,
        scale: stamp.scale,
        rotation: stamp.rotation,
        color: stamp.color
      }));
      setStamps(mappedStamps);
      if (mappedStamps.length > 0) {
        setActiveStampId(mappedStamps[0].id);
      } else {
        setActiveStampId(null);
      }
    }
  };

  // Sync isLightPhoto if AI analysis successfully identifies the image background brightness
  useEffect(() => {
    if (analysis && typeof analysis.isLightPhoto === 'boolean') {
      setIsLightPhoto(analysis.isLightPhoto);
    }
  }, [analysis]);

  const [headline, setHeadline] = useState<string>('');
  const [subheadline, setSubheadline] = useState<string>('');
  const [quote, setQuote] = useState<string>('');

  const [editingField, setEditingField] = useState<'headline' | 'subheadline' | 'quote' | null>(null);

  const [headlineFont, setHeadlineFont] = useState<string>('default');
  const [headlineSize, setHeadlineSize] = useState<number>(100);
  const [headlineColor, setHeadlineColor] = useState<string>('default');
  const [headlineWeight, setHeadlineWeight] = useState<string>('default');
  const [headlineSpacing, setHeadlineSpacing] = useState<string>('default');

  const [subheadlineFont, setSubheadlineFont] = useState<string>('default');
  const [subheadlineSize, setSubheadlineSize] = useState<number>(100);
  const [subheadlineColor, setSubheadlineColor] = useState<string>('default');
  const [subheadlineWeight, setSubheadlineWeight] = useState<string>('default');
  const [subheadlineSpacing, setSubheadlineSpacing] = useState<string>('default');

  const [quoteFont, setQuoteFont] = useState<string>('default');
  const [quoteSize, setQuoteSize] = useState<number>(100);
  const [quoteColor, setQuoteColor] = useState<string>('default');
  const [quoteWeight, setQuoteWeight] = useState<string>('default');
  const [quoteSpacing, setQuoteSpacing] = useState<string>('default');

  const getCustomTextStyle = (
    field: 'headline' | 'subheadline' | 'quote',
    defaultFontFamily?: string
  ) => {
    const fontMap: { [key: string]: string } = {
      playfair: '"Playfair Display", Didot, serif',
      space: '"Space Grotesk", sans-serif',
      inter: '"Inter", sans-serif',
      jetbrains: '"JetBrains Mono", monospace',
      baskerville: 'Baskerville, "Baskerville Old Face", Garamond, serif',
      futura: '"Futura", "Trebuchet MS", sans-serif',
      cinzel: 'Cinzel, Georgia, serif',
    };

    const font = field === 'headline' ? headlineFont : field === 'subheadline' ? subheadlineFont : quoteFont;
    const size = field === 'headline' ? headlineSize : field === 'subheadline' ? subheadlineSize : quoteSize;
    const color = field === 'headline' ? headlineColor : field === 'subheadline' ? subheadlineColor : quoteColor;
    const weight = field === 'headline' ? headlineWeight : field === 'subheadline' ? subheadlineWeight : quoteWeight;
    const spacing = field === 'headline' ? headlineSpacing : field === 'subheadline' ? subheadlineSpacing : quoteSpacing;

    const style: React.CSSProperties = {};
    
    if (font !== 'default') {
      style.fontFamily = fontMap[font] || undefined;
    } else if (defaultFontFamily) {
      style.fontFamily = defaultFontFamily;
    }

    if (size !== 100) {
      style.fontSize = `${size}%`;
    }

    if (color !== 'default') {
      style.color = color;
    }

    if (weight !== 'default') {
      style.fontWeight = weight;
    }

    if (spacing !== 'default') {
      style.letterSpacing = spacing;
    }

    return style;
  };

  // Sync state with analysis/props when they change
  useEffect(() => {
    setHeadline(analysis?.headline || "THE NEW AVANT-GARDE");
    setSubheadline(analysis?.subheadline || "Redefining luxury for the modern era");
    setQuote(coverQuote || (analysis?.quote ? `"${analysis.quote}"` : '"A masterclass in modern silhouette and daring contrast."'));
  }, [analysis, coverQuote]);

  const [stamps, setStamps] = useState<ActiveStamp[]>([]);
  const [activeStampId, setActiveStampId] = useState<string | null>(null);

  const handleStampPointerDown = (e: React.PointerEvent, stampId: string) => {
    e.stopPropagation();
    setActiveStampId(stampId);
    
    const coverElement = coverRef.current;
    if (!coverElement) return;
    const rect = coverElement.getBoundingClientRect();
    
    const targetStamp = stamps.find(s => s.id === stampId);
    if (!targetStamp) return;
    
    const initialPointerX = e.clientX;
    const initialPointerY = e.clientY;
    const initialStampX = targetStamp.x;
    const initialStampY = targetStamp.y;
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - initialPointerX;
      const deltaY = moveEvent.clientY - initialPointerY;
      
      // Convert deltas to percentages relative to cover container
      const pctDeltaX = (deltaX / rect.width) * 100;
      const pctDeltaY = (deltaY / rect.height) * 100;
      
      setStamps(prev => prev.map(s => {
        if (s.id === stampId) {
          return {
            ...s,
            x: Math.max(-10, Math.min(110, initialStampX + pctDeltaX)),
            y: Math.max(-10, Math.min(110, initialStampY + pctDeltaY))
          };
        }
        return s;
      }));
    };
    
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const stampType = e.dataTransfer.getData('text/plain');
    if (!stampType) return;

    const coverElement = coverRef.current;
    if (!coverElement) return;
    const rect = coverElement.getBoundingClientRect();
    
    const clientX = e.clientX || 0;
    const clientY = e.clientY || 0;
    
    let x = 50;
    let y = 50;
    
    if (rect.width > 0 && rect.height > 0) {
      x = ((clientX - rect.left) / rect.width) * 100;
      y = ((clientY - rect.top) / rect.height) * 100;
    }
    
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));

    const newStamp: ActiveStamp = {
      id: `stamp_${Date.now()}`,
      type: stampType,
      x,
      y,
      scale: 1.0,
      rotation: 0,
      color: isLightPhoto ? 'dark' : 'light'
    };

    setStamps(prev => [...prev, newStamp]);
    setActiveStampId(newStamp.id);
  };

  const handleQuickAdd = (type: string) => {
    const newStamp: ActiveStamp = {
      id: `stamp_${Date.now()}`,
      type,
      x: 50,
      y: 50,
      scale: 1.0,
      rotation: 0,
      color: isLightPhoto ? 'dark' : 'light'
    };
    setStamps(prev => [...prev, newStamp]);
    setActiveStampId(newStamp.id);
  };

  const textColor = isLightPhoto ? 'text-zinc-950' : 'text-white';
  const accentColor = isLightPhoto ? 'text-zinc-800' : 'text-white/90';
  const shadow = isLightPhoto ? 'none' : '0 2px 10px rgba(0,0,0,0.8)';
  const mastheadShadow = isLightPhoto ? '0 2px 10px rgba(0,0,0,0.1)' : '0 4px 20px rgba(0,0,0,0.5)';

  const getAspectClass = () => {
    switch (aspect) {
      case 'square':
        return 'aspect-square max-w-[500px]';
      case 'vertical':
        return 'aspect-[9/16] max-w-[420px]';
      case 'a4':
      default:
        return 'aspect-[1/1.4142] max-w-[500px]';
    }
  };

  const handleDownload = async () => {
    if (!coverRef.current) return;
    try {
      const canvas = await html2canvas(coverRef.current, { useCORS: true, allowTaint: true });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${selectedMagazine.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-cover.png`;
      a.click();
    } catch (error) {
      console.error('Error downloading:', error);
    }
  };

  const handleSaveToGallery = async () => {
    if (!coverRef.current) return;
    setIsSaving(true);
    try {
      const canvas = await html2canvas(coverRef.current, { 
        useCORS: true, 
        allowTaint: true,
        scale: 1.25
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      await saveCreation('magazine', dataUrl, quote || subheadline || headline || undefined);
      alert('Saved to gallery!');
    } catch (error: any) {
      console.error('Error saving to gallery:', error);
      let errorMsg = 'Failed to save to gallery.';
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed && parsed.error) {
            errorMsg = `Failed to save to gallery: ${parsed.error}`;
          } else {
            errorMsg = `Failed to save to gallery: ${error.message}`;
          }
        } catch {
          errorMsg = `Failed to save to gallery: ${error.message}`;
        }
      }
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!coverRef.current) return;
    if (navigator.share) {
      try {
        const canvas = await html2canvas(coverRef.current, { useCORS: true, allowTaint: true });
        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];
        const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        
        const file = new File([blob], 'cover.png', { type: 'image/png' });
        await navigator.share({
          title: `${selectedMagazine} Cover`,
          text: `Check out my ${selectedMagazine} magazine cover!`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert('Sharing not supported on this browser.');
    }
  };

  const renderCoverContent = () => {
    const renderDefaultMasthead = () => {
      if (selectedMagazine === 'ASPEN FASHION') {
        return (
          <div className="flex flex-col items-center">
            <h1 className={`font-serif ${textColor} tracking-tighter font-bold leading-[0.8] ${aspect === 'square' ? 'text-5xl md:text-7xl' : 'text-7xl md:text-[8rem]'}`} style={{ textShadow: mastheadShadow, textAlign: 'center', width: '105%' }}>
              ASPEN
            </h1>
            <div className={`flex items-center gap-4 ${aspect === 'square' ? 'mt-2' : 'mt-4'} w-full px-8`}>
              <div className={`h-[2px] flex-1 ${isLightPhoto ? 'bg-black/80' : 'bg-white/80'}`} />
              <h2 className={`font-serif ${textColor} tracking-[0.4em] uppercase font-bold ${aspect === 'square' ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'}`} style={{ textShadow: shadow }}>
                FASHION
              </h2>
              <div className={`h-[2px] flex-1 ${isLightPhoto ? 'bg-black/80' : 'bg-white/80'}`} />
            </div>
            <div className={`${textColor} text-[10px] uppercase tracking-[0.5em] opacity-80 ${aspect === 'square' ? 'mt-2' : 'mt-4'} leading-none`}>BY PATRICK HENRY SWEENEY</div>
          </div>
        );
      }

      if (selectedMagazine === 'GQ') {
        return (
          <div className="flex flex-col items-center">
            <h1 className={`font-serif ${textColor} tracking-tighter font-black opacity-100 leading-[0.7] ${aspect === 'square' ? 'text-[7rem] md:text-[9rem]' : 'text-[10rem] md:text-[12rem]'}`} style={{ textShadow: mastheadShadow, textAlign: 'center', width: '100%' }}>
              GQ
            </h1>
            <div className={`${textColor} text-[10px] uppercase tracking-[0.5em] opacity-80 ${aspect === 'square' ? 'mt-2' : 'mt-4'}`}>BY PATRICK HENRY SWEENEY</div>
          </div>
        );
      }

      if (selectedMagazine === 'theCorridor.biz') {
        return (
          <div className="flex flex-col items-center">
            <h1 className={`font-sans ${textColor} tracking-tight font-black uppercase opacity-100 leading-[0.8] ${aspect === 'square' ? 'text-4xl md:text-5xl' : 'text-5xl md:text-7xl'}`} style={{ textShadow: isLightPhoto ? 'none' : '10px 10px 0px rgba(0,0,0,0.2)', textAlign: 'center', width: '100%' }}>
              {selectedMagazine}
            </h1>
            <div className={`bg-yellow-400 text-black px-4 py-1 ${aspect === 'square' ? 'mt-2' : 'mt-4'} text-[10px] font-bold uppercase tracking-widest`}>Digital Issue</div>
          </div>
        );
      }

      const words = selectedMagazine.split(' ');
      if (words.length > 1) {
        const lastWord = words.pop();
        const firstPart = words.join(' ');
        return (
          <div className="flex flex-col items-center">
            <h1 className={`font-serif ${textColor} tracking-widest font-bold opacity-100 leading-[0.9] ${aspect === 'square' ? 'text-4xl md:text-5xl' : 'text-5xl md:text-7xl'}`} style={{ textShadow: mastheadShadow, textAlign: 'center', width: '100%' }}>
              {firstPart}
            </h1>
            <div className={`flex items-center gap-4 ${aspect === 'square' ? 'mt-2' : 'mt-4'} w-full px-12`}>
              <div className={`h-[1px] flex-1 ${isLightPhoto ? 'bg-black/40' : 'bg-white/60'}`} />
              <h2 className={`font-serif ${textColor} tracking-[0.3em] uppercase font-normal italic ${aspect === 'square' ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'}`} style={{ textShadow: shadow }}>
                {lastWord}
              </h2>
              <div className={`h-[1px] flex-1 ${isLightPhoto ? 'bg-black/40' : 'bg-white/60'}`} />
            </div>
            <div className={`${textColor} text-[9px] uppercase tracking-[0.5em] opacity-70 ${aspect === 'square' ? 'mt-2' : 'mt-4'} italic`}>Photography by P.H.S</div>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center">
          <h1 className={`font-serif ${textColor} tracking-[0.2em] font-bold opacity-100 leading-[0.8] uppercase ${aspect === 'square' ? 'text-4xl md:text-6xl' : 'text-6xl md:text-8xl'}`} style={{ textShadow: mastheadShadow, textAlign: 'center', width: '100%' }}>
            {selectedMagazine}
          </h1>
          <div className={`w-24 h-[1px] ${isLightPhoto ? 'bg-black/40' : 'bg-white/60'} ${aspect === 'square' ? 'mt-4' : 'mt-6'}`} />
          <div className={`${textColor} text-[10px] uppercase tracking-[0.5em] opacity-80 ${aspect === 'square' ? 'mt-2' : 'mt-4'}`}>By Patrick Henry Sweeney</div>
        </div>
      );
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMagazine}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 z-10 pointer-events-none"
        >
          {/* Magazine Mastheads & Content */}
          {selectedMagazine === 'VOGUE' && (
            <>
              <div className={`absolute ${aspect === 'square' ? 'top-6' : 'top-10'} left-0 right-0 flex flex-col items-center justify-center`}>
                <motion.h1 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className={`font-serif ${textColor} tracking-widest font-normal leading-none ${aspect === 'square' ? 'text-6xl md:text-8xl' : 'text-[8rem] md:text-[10rem]'}`} 
                  style={{ fontFamily: '"Playfair Display", Didot, serif', textShadow: mastheadShadow, textAlign: 'center', width: '100%' }}
                >
                  VOGUE
                </motion.h1>
                <div className={`${textColor} text-[10px] uppercase tracking-[0.4em] opacity-80 ${aspect === 'square' ? 'mt-[-0.75rem]' : 'mt-[-1.5rem]'}`}>BY PATRICK HENRY SWEENEY</div>
              </div>
              
              <div className={`absolute ${aspect === 'square' ? 'top-[30%] left-6 gap-4' : 'top-[40%] left-8 gap-10'} flex flex-col max-w-[200px]`}>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                  <EditableTextWrapper 
                    field="headline" 
                    currentStyle={getCustomTextStyle('headline')}
                    onClick={() => setEditingField('headline')}
                  >
                    <h3 className={`${textColor} font-bold text-xl tracking-widest mb-2 uppercase leading-tight`} style={{ textShadow: shadow }}>{headline}</h3>
                  </EditableTextWrapper>
                  <EditableTextWrapper 
                    field="subheadline" 
                    currentStyle={getCustomTextStyle('subheadline')}
                    onClick={() => setEditingField('subheadline')}
                    className="mt-1"
                  >
                    <p className={`${accentColor} text-sm italic leading-snug`} style={{ textShadow: shadow }}>{subheadline}</p>
                  </EditableTextWrapper>
                </motion.div>
                {aspect !== 'square' && (
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                    <h3 className={`${textColor} font-sans font-bold text-xl tracking-widest mb-2 uppercase leading-tight`} style={{ textShadow: shadow }}>BEAUTY<br/>SECRETS</h3>
                    <p className={`${accentColor} font-serif text-sm italic leading-snug`} style={{ textShadow: shadow }}>From the runway to your routine</p>
                  </motion.div>
                )}
              </div>

              <div className={`absolute ${aspect === 'square' ? 'top-[35%] right-6 gap-4' : 'top-[50%] right-8 gap-10'} flex flex-col max-w-[180px] text-right`}>
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                  <h3 className="text-red-600 font-sans font-bold text-lg tracking-widest mb-2 uppercase leading-tight" style={{ textShadow: shadow }}>EXCLUSIVE</h3>
                  <p className={`${accentColor} font-serif text-sm italic leading-snug`} style={{ textShadow: shadow }}>An intimate look at the season's boldest trends</p>
                </motion.div>
              </div>

              <div className={`absolute ${aspect === 'square' ? 'bottom-6 left-6 right-6' : 'bottom-12 left-8 right-8'} text-center`}>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <EditableTextWrapper 
                    field="quote" 
                    currentStyle={getCustomTextStyle('quote')}
                    onClick={() => setEditingField('quote')}
                    className="inline-block"
                  >
                    <p 
                      className={`${textColor} text-lg md:text-xl leading-snug italic`} 
                      style={{ textShadow: shadow }}
                    >
                      {quote}
                    </p>
                  </EditableTextWrapper>
                </motion.div>
              </div>
            </>
          )}

          {selectedMagazine === "HARPER'S BAZAAR" && (
            <>
              <div className={`absolute ${aspect === 'square' ? 'top-6' : 'top-10'} left-0 right-0 flex flex-col items-center`}>
                <motion.span 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`font-serif text-2xl italic tracking-widest ${aspect === 'square' ? 'mb-[-0.5rem]' : 'mb-[-1rem]'} z-20 ${textColor}`} 
                  style={{ textShadow: shadow }}
                >
                  Harper's
                </motion.span>
                <motion.h1 
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className={`font-serif ${textColor} tracking-tighter font-bold uppercase leading-none ${aspect === 'square' ? 'text-5xl md:text-[5.5rem]' : 'text-[5.5rem] md:text-[7.5rem]'}`} 
                  style={{ fontFamily: '"Playfair Display", Didot, serif', textShadow: mastheadShadow, textAlign: 'center', width: '100%' }}
                >
                  BAZAAR
                </motion.h1>
                <div className={`${textColor} text-[10px] uppercase tracking-[0.5em] opacity-80 mt-2`}>BY PATRICK HENRY SWEENEY</div>
              </div>
 
              <div className={`absolute ${aspect === 'square' ? 'top-[35%] left-5 gap-4' : 'top-[42%] left-6 gap-6'} flex flex-col max-w-[220px]`}>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className={`border-l-2 ${isLightPhoto ? 'border-zinc-950' : 'border-white'} pl-4`}>
                  <EditableTextWrapper
                    field="headline"
                    currentStyle={getCustomTextStyle('headline')}
                    onClick={() => setEditingField('headline')}
                  >
                    <h3 className={`font-serif uppercase tracking-widest leading-tight mb-2 ${textColor} ${aspect === 'square' ? 'text-xl' : 'text-2xl'}`} style={{ textShadow: shadow }}>{headline}</h3>
                  </EditableTextWrapper>
                  <EditableTextWrapper
                    field="subheadline"
                    currentStyle={getCustomTextStyle('subheadline')}
                    onClick={() => setEditingField('subheadline')}
                    className="mt-1"
                  >
                    <p className={`font-sans text-xs uppercase tracking-widest ${accentColor} leading-relaxed`} style={{ textShadow: shadow }}>{subheadline}</p>
                  </EditableTextWrapper>
                </motion.div>
                {aspect !== 'square' && (
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className={`border-l-2 ${isLightPhoto ? 'border-zinc-950' : 'border-white'} pl-4`}>
                    <h3 className={`font-serif text-xl uppercase tracking-widest leading-tight mb-2 ${textColor}`} style={{ textShadow: shadow }}>The<br/><span className="italic font-normal">New</span><br/>Elegance</h3>
                  </motion.div>
                )}
              </div>
 
              <div className={`absolute ${aspect === 'square' ? 'bottom-[20%] right-5 gap-4' : 'bottom-1/3 right-6 gap-6'} flex flex-col max-w-[200px] text-right`}>
                 <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }} className={`border-r-2 ${isLightPhoto ? 'border-zinc-950' : 'border-white'} pr-4`}>
                  <h3 className={`font-serif text-2xl uppercase tracking-widest leading-tight mb-2 ${textColor}`} style={{ textShadow: shadow }}>Spring<br/><span className={`italic font-normal ${isLightPhoto ? 'text-zinc-800' : 'text-yellow-300'}`}>Fashion</span></h3>
                  <p className={`font-sans text-xs uppercase tracking-widest ${accentColor}`} style={{ textShadow: shadow }}>100+ Looks to love</p>
                </motion.div>
              </div>
 
              <div className={`absolute ${aspect === 'square' ? 'bottom-4 left-6 right-6' : 'bottom-8 left-8 right-8'}`}>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className={`${isLightPhoto ? 'bg-black/5' : 'bg-white/10'} backdrop-blur-md p-4 border ${isLightPhoto ? 'border-black/10' : 'border-white/20'}`}
                >
                  <EditableTextWrapper
                    field="quote"
                    currentStyle={getCustomTextStyle('quote')}
                    onClick={() => setEditingField('quote')}
                  >
                    <p className={`font-serif text-sm md:text-base leading-snug text-center uppercase tracking-widest ${textColor}`} style={{ textShadow: shadow }}>
                      {quote}
                    </p>
                  </EditableTextWrapper>
                </motion.div>
              </div>
            </>
          )}

          {selectedMagazine === 'ELLE' && (
            <>
              <div className={`absolute ${aspect === 'square' ? 'top-6' : 'top-10'} left-0 right-0 flex flex-col items-center justify-center`}>
                <motion.h1 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  className={`font-sans ${textColor} tracking-tighter font-black leading-none ${aspect === 'square' ? 'text-[5.5rem] md:text-[7.5rem]' : 'text-[7rem] md:text-[9rem]'}`} 
                  style={{ textShadow: mastheadShadow, textAlign: 'center', width: '100%' }}
                >
                  ELLE
                </motion.h1>
                <div className={`${textColor} text-[10px] uppercase tracking-[0.5em] opacity-80 mt-2`}>BY PATRICK HENRY SWEENEY</div>
              </div>

              <div className={`absolute ${aspect === 'square' ? 'top-[28%] right-6 gap-4' : 'top-[35%] right-8 gap-6'} flex flex-col max-w-[180px] text-right`}>
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <div className="bg-pink-600 text-white text-xs font-bold px-2 py-1 inline-block mb-2 uppercase tracking-widest shadow-lg">Exclusive</div>
                  <EditableTextWrapper
                    field="headline"
                    currentStyle={getCustomTextStyle('headline')}
                    onClick={() => setEditingField('headline')}
                  >
                    <h3 className={`font-black uppercase leading-none mb-1 ${textColor} ${aspect === 'square' ? 'text-lg' : 'text-xl'}`} style={{ textShadow: shadow }}>{headline}</h3>
                  </EditableTextWrapper>
                </motion.div>
              </div>

              <div className={`absolute ${aspect === 'square' ? 'bottom-[15%] left-6 gap-4' : 'bottom-[28%] left-8 gap-8'} flex flex-col max-w-[250px]`}>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                  <h3 className="text-pink-600 font-sans font-black text-3xl uppercase leading-none mb-2" style={{ textShadow: shadow }}>Style<br/>Reboot</h3>
                  <EditableTextWrapper
                    field="subheadline"
                    currentStyle={getCustomTextStyle('subheadline')}
                    onClick={() => setEditingField('subheadline')}
                  >
                    <p className={`font-bold text-sm uppercase tracking-wider ${textColor}`} style={{ textShadow: shadow }}>{subheadline}</p>
                  </EditableTextWrapper>
                </motion.div>
                {aspect !== 'square' && (
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                    <h3 className={`font-sans font-black text-2xl uppercase leading-none mb-2 ${textColor}`} style={{ textShadow: shadow }}>Beauty<br/>Rules</h3>
                    <p className={`font-sans font-bold text-sm uppercase tracking-wider ${isLightPhoto ? 'text-zinc-800' : 'text-yellow-300'}`} style={{ textShadow: shadow }}>To break this season</p>
                  </motion.div>
                )}
              </div>

              <div className={`absolute ${aspect === 'square' ? 'bottom-6 left-6 right-6' : 'bottom-12 left-8 right-8'}`}>
                {aspect !== 'square' && <motion.div initial={{ width: 0 }} animate={{ width: 48 }} transition={{ delay: 0.6 }} className="bg-pink-600 h-2 mb-4 shadow-lg"></motion.div>}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <EditableTextWrapper
                    field="quote"
                    currentStyle={getCustomTextStyle('quote')}
                    onClick={() => setEditingField('quote')}
                  >
                    <p 
                      className={`font-bold text-lg md:text-xl leading-tight uppercase ${textColor}`} 
                      style={{ textShadow: shadow }}
                    >
                      {quote}
                    </p>
                  </EditableTextWrapper>
                </motion.div>
              </div>
            </>
          )}

          {/* Default / Collective Layouts for others */}
          {!['VOGUE', "HARPER'S BAZAAR", 'ELLE'].includes(selectedMagazine) && (
            <>
              <div className={`absolute ${aspect === 'square' ? 'top-4 left-4' : 'top-8 left-8'} z-10`}>
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={`${isLightPhoto ? 'bg-white/80 border-l-zinc-950' : 'bg-black/40 border-l-yellow-400'} backdrop-blur-sm p-3 border-l-2 max-w-[200px]`}>
                  <div className={`${textColor} text-[9px] md:text-[10px] uppercase tracking-[0.2em] leading-relaxed`} style={{ textShadow: shadow }}>
                    <span className={`font-bold block mb-1 ${isLightPhoto ? 'text-zinc-950' : 'text-yellow-400'}`}>PHOTO DESCRIPTION:</span>
                    Exclusive editorial look capturing {headline.toLowerCase()} essence.
                  </div>
                </motion.div>
              </div>
              <div className={`absolute ${aspect === 'square' ? 'top-4 right-4' : 'top-8 right-8'} z-10`}>
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 0.9 }} className={`${textColor} opacity-90 text-[10px] md:text-xs uppercase tracking-[0.3em] text-right mt-2`} style={{ textShadow: shadow }}>
                  VOL 4. / EXCLUSIVE
                </motion.div>
              </div>

              <div className={`absolute ${aspect === 'square' ? 'top-6' : 'top-12'} left-0 right-0 flex flex-col items-center justify-center select-none text-center`}>
                <motion.div 
                  initial={{ y: -30, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ type: "spring", damping: 12 }}
                >
                  {renderDefaultMasthead()}
                </motion.div>
              </div>

              <div className={`absolute ${aspect === 'square' ? 'top-[35%] left-6 gap-4 mt-4' : 'top-[45%] left-8 gap-10 mt-16'} flex flex-col max-w-[200px] md:max-w-[250px]`}>
                {[headline, 'MIDNIGHT CYBER', 'GOLDEN AGE GLAMOUR', 'EXCLUSIVE INTERVIEW'].slice(0, aspect === 'square' ? 2 : 4).map((title, i) => {
                  const isUserHeadline = title === headline;
                  return (
                    <motion.div 
                      key={title + i} 
                      initial={{ x: -30, opacity: 0 }} 
                      animate={{ x: 0, opacity: 1 }} 
                      transition={{ delay: 0.3 + (i * 0.1) }}
                      className="group/item cursor-default"
                    >
                      {isUserHeadline ? (
                        <EditableTextWrapper
                          field="headline"
                          currentStyle={getCustomTextStyle('headline')}
                          onClick={() => setEditingField('headline')}
                        >
                          <h3 className={`leading-tight tracking-tight uppercase ${textColor} ${!isLightPhoto ? 'text-yellow-400' : ''} ${aspect === 'square' ? 'text-base md:text-lg' : 'text-lg md:text-xl'}`} style={{ textShadow: shadow }}>{title}</h3>
                        </EditableTextWrapper>
                      ) : (
                        <h3 className={`font-serif leading-tight tracking-tight uppercase ${textColor} ${aspect === 'square' ? 'text-base md:text-lg' : 'text-lg md:text-xl'}`} style={{ textShadow: shadow }}>{title}</h3>
                      )}
                      
                      <div className={`h-[1px] w-0 group-hover/item:w-full transition-all duration-300 mt-1 ${isLightPhoto ? 'bg-black' : 'bg-white'}`} />
                      
                      {isUserHeadline ? (
                        <EditableTextWrapper
                          field="subheadline"
                          currentStyle={getCustomTextStyle('subheadline')}
                          onClick={() => setEditingField('subheadline')}
                          className="mt-2"
                        >
                          <p className={`text-[11px] md:text-sm uppercase tracking-[0.15em] ${accentColor}`} style={{ textShadow: shadow }}>
                            {subheadline}
                          </p>
                        </EditableTextWrapper>
                      ) : (
                        <p className={`text-[11px] md:text-sm sans-serif uppercase tracking-[0.15em] mt-2 ${accentColor}`} style={{ textShadow: shadow }}>
                          {title === 'MIDNIGHT CYBER' ? 'Neon Trends 2026' : 
                           title === 'GOLDEN AGE GLAMOUR' ? 'A Retrospective' : 'Patrick Henry Sweeney'}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div className={`absolute ${aspect === 'square' ? 'bottom-4 left-6 right-20' : 'bottom-8 left-8 right-24'}`}>
                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.8 }} className={`h-[1px] mb-4 ${isLightPhoto ? 'bg-black/20' : 'bg-white/30'}`} />
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }} className={`border-l-2 pl-4 py-1 ${isLightPhoto ? 'border-zinc-950' : 'border-white/80'}`}>
                  <EditableTextWrapper
                    field="quote"
                    currentStyle={getCustomTextStyle('quote')}
                    onClick={() => setEditingField('quote')}
                  >
                    <p className={`${accentColor} text-xs md:text-sm leading-snug italic uppercase tracking-wider`} style={{ textShadow: shadow }}>
                      {quote}
                    </p>
                  </EditableTextWrapper>
                </motion.div>
              </div>
              
              <div className={`absolute ${aspect === 'square' ? 'bottom-4 right-6' : 'bottom-8 right-8'} flex flex-col items-end`}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 1 }} className={`${accentColor} text-[10px] uppercase tracking-widest mb-2`}>Issue 01</motion.div>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.1, type: "spring" }} className={`w-12 h-12 flex items-center justify-center p-1 shadow-lg ${isLightPhoto ? 'bg-black/10' : 'bg-white/90'}`}>
                  <div className={`w-full h-full bg-repeat-x opacity-80 ${isLightPhoto ? "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgydjIwaC0yem00IDBoMXYyMGgtMXptMyAwaDF2MjBoLTF6bTIgMGgydjIwaC0yem00IDBoMXYyMGgtMXptMiAwaDN2MjBoLTN6bTQgMGgxdjIwaC0xem0yIDBoMnYyMGgtMnptNCAwaDF2MjBoLTF6IiBmaWxsPSIjMDAwIi8+PC9zdmc+')]" : "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgydjIwaC0yem00IDBoMXYyMGgtMXptMyAwaDF2MjBoLTF6bTIgMGgydjIwaC0yem00IDBoMXYyMGgtMXptMiAwaDN2MjBoLTN6bTQgMGgxdjIwaC0xem0yIDBoMnYyMGgtMnptNCAwaDF2MjBoLTF6IiBmaWxsPSIjMDAwIi8+PC9zdmc+')]"}`} />
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-serif uppercase tracking-widest">The Cover</h2>
          <p className="text-zinc-500 mt-2">Your exclusive feature in {selectedMagazine}.</p>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
            <div className="flex items-center gap-1 bg-white border border-zinc-300 p-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 select-none">Text Overlay</span>
              <div className="flex gap-1">
                <button 
                  id="overlay-light-btn"
                  type="button"
                  onClick={() => setIsLightPhoto(false)}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all ${
                    !isLightPhoto 
                      ? 'bg-black text-white' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  title="Use light-colored text (best for dark backgrounds)"
                >
                  Light
                </button>
                <button 
                  id="overlay-dark-btn"
                  type="button"
                  onClick={() => setIsLightPhoto(true)}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all ${
                    isLightPhoto 
                      ? 'bg-black text-white' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  title="Use dark-colored text (best for light backgrounds)"
                >
                  Dark
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white border border-zinc-300 p-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 select-none">Aspect Ratio</span>
              <div className="flex gap-1">
                <button 
                  id="aspect-a4-btn"
                  type="button"
                  onClick={() => setAspect('a4')}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all ${
                    aspect === 'a4' 
                      ? 'bg-black text-white' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  title="Standard A4 Cover Portrait aspect ratio"
                >
                  A4
                </button>
                <button 
                  id="aspect-square-btn"
                  type="button"
                  onClick={() => setAspect('square')}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all ${
                    aspect === 'square' 
                      ? 'bg-black text-white' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  title="Square aspect ratio (best for sharing)"
                >
                  1:1
                </button>
                <button 
                  id="aspect-vertical-btn"
                  type="button"
                  onClick={() => setAspect('vertical')}
                  className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all ${
                    aspect === 'vertical' 
                      ? 'bg-black text-white' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                  title="Mobile-friendly vertical aspect ratio (9:16)"
                >
                  9:16
                </button>
              </div>
            </div>

            <select 
              value={selectedMagazine}
              onChange={(e) => setSelectedMagazine(e.target.value)}
              className="px-4 py-2 border border-zinc-300 bg-white text-sm font-medium uppercase tracking-wider outline-none focus:border-black"
            >
              {MAGAZINES.map(mag => (
                <option key={mag} value={mag}>{mag}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleSaveToGallery}
              disabled={!generatedImage || isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 hover:bg-zinc-50 transition-colors disabled:opacity-50 uppercase tracking-wider text-sm font-medium"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save to Gallery
            </button>
            <button 
              onClick={handleShare}
              disabled={!generatedImage}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 hover:bg-zinc-50 transition-colors disabled:opacity-50 uppercase tracking-wider text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button 
              onClick={handleDownload}
              disabled={!generatedImage}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 uppercase tracking-wider text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Layout Presets Section */}
      <div className="mb-8 bg-zinc-50 border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-800 select-none">
              Editorial Layout Presets
            </h3>
          </div>
          {activePreset && (
            <button
              onClick={() => {
                setActivePreset(null);
                // Reset states to default
                setHeadlineFont('default');
                setHeadlineSize(100);
                setHeadlineColor('default');
                setHeadlineWeight('default');
                setHeadlineSpacing('default');
                setSubheadlineFont('default');
                setSubheadlineSize(100);
                setSubheadlineColor('default');
                setSubheadlineWeight('default');
                setSubheadlineSpacing('default');
                setQuoteFont('default');
                setQuoteSize(100);
                setQuoteColor('default');
                setQuoteWeight('default');
                setQuoteSpacing('default');
                setStamps([]);
                setActiveStampId(null);
              }}
              className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-red-600 transition-colors pointer-events-auto"
            >
              Clear Preset
            </button>
          )}
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Instantly reformat the typography brand style, background lighting adjustments, and layout sticker arrangements with a professional design blueprint.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {LAYOUT_PRESETS.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyLayoutPreset(p.id)}
                className={`flex flex-col items-start p-4 rounded bg-white border text-left transition-all hover:shadow-xs focus:outline-none cursor-pointer group pointer-events-auto ${
                  isActive 
                    ? 'border-amber-500 ring-2 ring-amber-500/15' 
                    : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`text-xs uppercase tracking-wider font-bold transition-colors ${isActive ? 'text-amber-600' : 'text-zinc-800 group-hover:text-black'}`}>
                    {p.name}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </div>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-semibold block mb-2">
                  {p.magazine}
                </span>
                <span className="text-[11px] text-zinc-500 leading-relaxed font-normal">
                  {p.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Cover Text Customization Section */}
      <div className="mb-8 bg-zinc-50 border border-zinc-200 p-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 select-none">
          Customize Cover Copy Options
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="headline-input" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Masthead Headline
            </label>
            <input
              id="headline-input"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value.toUpperCase())}
              placeholder="THE NEW AVANT-GARDE"
              className="px-3 py-2 border border-zinc-300 bg-white text-zinc-800 text-xs font-semibold uppercase tracking-wider focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="subheadline-input" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Subheadline Text
            </label>
            <input
              id="subheadline-input"
              type="text"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              placeholder="Redefining luxury for the modern era"
              className="px-3 py-2 border border-zinc-300 bg-white text-zinc-800 text-xs font-medium focus:outline-none focus:border-black transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-input" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Featured Cover Quote
            </label>
            <input
              id="quote-input"
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="A masterclass in modern silhouette..."
              className="px-3 py-2 border border-zinc-300 bg-white text-zinc-800 text-xs font-medium focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Selected Stamp Controls (shown dynamically when a stamp is active) */}
      {(() => {
        const selectedStamp = stamps.find(s => s.id === activeStampId);
        if (!selectedStamp) return null;
        return (
          <div className="mb-8 bg-zinc-950 text-white border border-zinc-800 p-6 flex flex-col md:flex-row gap-6 justify-between items-center" data-html2canvas-ignore="true">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 p-2 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center">
                {STAMP_TEMPLATES.find(t => t.type === selectedStamp.type)?.render('text-white')}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">Positioning Selected Stamp</h4>
                <p className="text-zinc-400 text-[10px] mt-0.5">Drag it freely on the cover above, or use the fine-tuners below.</p>
              </div>
            </div>
            
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Scale Slider */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Scale: {selectedStamp.scale.toFixed(2)}x</span>
                <input 
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.05"
                  value={selectedStamp.scale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setStamps(prev => prev.map(s => s.id === selectedStamp.id ? { ...s, scale: val } : s));
                  }}
                  className="w-full accent-amber-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Rotation Slider */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Rotate: {selectedStamp.rotation}°</span>
                <input 
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={selectedStamp.rotation}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setStamps(prev => prev.map(s => s.id === selectedStamp.id ? { ...s, rotation: val } : s));
                  }}
                  className="w-full accent-amber-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Color Swatch / Delete */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Color Swatch</span>
                <div className="flex items-center gap-2">
                  {(['light', 'dark', 'gold', 'red'] as const).map((currColor) => (
                    <button
                      key={currColor}
                      type="button"
                      onClick={() => setStamps(prev => prev.map(s => s.id === selectedStamp.id ? { ...s, color: currColor } : s))}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        currColor === 'light' ? 'bg-white border-zinc-400' :
                        currColor === 'dark' ? 'bg-zinc-900 border-zinc-700' :
                        currColor === 'gold' ? 'bg-amber-400 border-amber-300' :
                        'bg-red-500 border-red-400'
                      } ${selectedStamp.color === currColor ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    />
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setStamps(prev => prev.filter(s => s.id !== selectedStamp.id));
                      setActiveStampId(null);
                    }}
                    className="ml-auto p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    title="Remove stamp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Editorial Stamp/Badge Tray Section */}
      <div className="mb-8 bg-zinc-50 border border-zinc-200 p-6" data-html2canvas-ignore="true">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-zinc-800" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-800 select-none">
            Editorial Stamps & Badges
          </h3>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          💡 Drag & drop any stamp or badge below onto your magazine cover, or click them to place immediately. Drag a stamp to reposition it, select it to customize its style!
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {STAMP_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.type}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', tmpl.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleQuickAdd(tmpl.type)}
              className="flex flex-col items-center justify-between p-4 bg-white border border-zinc-200 hover:border-black cursor-grab active:cursor-grabbing transition-all hover:shadow-xs text-center relative group"
              title="Click or drag to cover"
            >
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              
              <div className="w-12 h-12 flex items-center justify-center text-zinc-800">
                {tmpl.render('text-zinc-800')}
              </div>
              
              <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 mt-3 block group-hover:text-black">
                {tmpl.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 border border-zinc-200 flex justify-center">
        {/* Magazine Cover Container */}
        <div 
          ref={coverRef}
          onClick={() => {
            setActiveStampId(null);
            setEditingField(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleDrop}
          className={`relative w-full bg-zinc-100 overflow-hidden shadow-2xl group transition-all duration-500 ease-in-out ${getAspectClass()} cursor-default`}
        >
          {generatedImage ? (
            <img 
              src={generatedImage} 
              alt="Magazine Cover" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 uppercase tracking-widest text-sm pointer-events-none select-none">
              Generate an image in the studio first
            </div>
          )}

          {/* Overlays */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${isLightPhoto ? 'bg-gradient-to-t from-white/40 via-transparent to-white/20' : 'bg-gradient-to-t from-black/90 via-black/20 to-black/60'}`} />

          {renderCoverContent()}

          {/* Placed Stamps Interactivity Layer */}
          {stamps.map((stamp) => {
            const template = STAMP_TEMPLATES.find(t => t.type === stamp.type);
            if (!template) return null;
            const isSelected = activeStampId === stamp.id;
            
            return (
              <div
                key={stamp.id}
                style={{
                  position: 'absolute',
                  left: `${stamp.x}%`,
                  top: `${stamp.y}%`,
                  transform: `translate(-50%, -50%) rotate(${stamp.rotation}deg) scale(${stamp.scale})`,
                  width: '100px',
                  height: '100px',
                  zIndex: 40,
                }}
                onPointerDown={(e) => handleStampPointerDown(e, stamp.id)}
                onClick={(e) => e.stopPropagation()} // prevent deselect when clicking stamp itself
                className="absolute touch-none cursor-move select-none"
              >
                {/* Stamp Vector Render */}
                <div className="w-full h-full p-2 flex items-center justify-center pointer-events-none">
                  {template.render(getStampColorClass(stamp.color))}
                </div>

                {/* Selected Indicator borders */}
                {isSelected && (
                  <div 
                    data-html2canvas-ignore="true"
                    className="absolute -inset-1 border border-dashed border-red-500 rounded flex items-center justify-center bg-red-500/5 pointer-events-none"
                  >
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white rounded px-1.5 py-0.5 text-[7px] font-sans font-bold uppercase tracking-wider shadow leading-none">
                      Selected
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Floating UI Editor Card */}
          <AnimatePresence>
            {editingField && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                data-html2canvas-ignore="true"
                className="absolute top-4 right-4 z-50 w-72 bg-zinc-900/95 border border-zinc-800 text-white rounded-lg shadow-2xl p-4 cursor-default select-none flex flex-col gap-3 pointer-events-auto backdrop-blur-md"
                onClick={(e) => e.stopPropagation()} // prevent dismiss when clicking inside the panel
              >
                {/* header */}
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                      Customize {editingField === 'headline' ? 'Headline' : editingField === 'subheadline' ? 'Subheadline' : 'Quote'}
                    </h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEditingField(null)}
                    className="text-zinc-400 hover:text-white text-xs select-none p-1 font-bold font-sans"
                  >
                    ✕
                  </button>
                </div>

                {/* field text editor input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Content</label>
                  <textarea
                    rows={2}
                    value={editingField === 'headline' ? headline : editingField === 'subheadline' ? subheadline : quote}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (editingField === 'headline') {
                        setHeadline(val.toUpperCase());
                      } else if (editingField === 'subheadline') {
                        setSubheadline(val);
                      } else {
                        setQuote(val);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 rounded text-xs text-white focus:outline-none focus:border-amber-400 text-left placeholder-zinc-700"
                  />
                </div>

                {/* font picker dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Typography Brand</label>
                  <select
                    value={
                      editingField === 'headline' ? headlineFont :
                      editingField === 'subheadline' ? subheadlineFont :
                      quoteFont
                    }
                    onChange={(e) => {
                      const font = e.target.value;
                      if (editingField === 'headline') {
                        setHeadlineFont(font);
                      } else if (editingField === 'subheadline') {
                        setSubheadlineFont(font);
                      } else {
                        setQuoteFont(font);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2 py-1.5 rounded text-xs text-zinc-300 focus:outline-none focus:border-amber-400"
                  >
                    <option value="default">Default Theme Font</option>
                    <option value="playfair">Playfair Display (Elegant Serif)</option>
                    <option value="space">Space Grotesk (Tech Sans)</option>
                    <option value="inter">Inter (Clean Sans)</option>
                    <option value="jetbrains">JetBrains Mono (Editorial Code)</option>
                    <option value="baskerville">Baskerville (Warm Serif)</option>
                    <option value="futura">Futura (Bold Display)</option>
                    <option value="cinzel">Cinzel (Classical Trajan)</option>
                  </select>
                </div>

                {/* size scale slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Font Scale</label>
                    <span className="text-[9px] font-mono text-amber-400 font-bold">
                      {editingField === 'headline' ? headlineSize : editingField === 'subheadline' ? subheadlineSize : quoteSize}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="220"
                    step="5"
                    value={editingField === 'headline' ? headlineSize : editingField === 'subheadline' ? subheadlineSize : quoteSize}
                    onChange={(e) => {
                      const sz = parseInt(e.target.value, 10);
                      if (editingField === 'headline') {
                        setHeadlineSize(sz);
                      } else if (editingField === 'subheadline') {
                        setSubheadlineSize(sz);
                      } else {
                        setQuoteSize(sz);
                      }
                    }}
                    className="w-full h-1 bg-zinc-805 rounded appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                {/* weight select buttons */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Weight</label>
                  <div className="grid grid-cols-5 gap-1">
                    {['default', '300', '500', '700', '900'].map((w) => {
                      const activeW = editingField === 'headline' ? headlineWeight : editingField === 'subheadline' ? subheadlineWeight : quoteWeight;
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            if (editingField === 'headline') setHeadlineWeight(w);
                            else if (editingField === 'subheadline') setSubheadlineWeight(w);
                            else setQuoteWeight(w);
                          }}
                          className={`px-1 py-1 rounded text-[8px] font-mono border transition-all ${
                            activeW === w 
                              ? 'bg-amber-400 border-amber-300 text-zinc-950 font-bold' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {w === 'default' ? 'DFT' : w}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* tracking letter spacing buttons */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Letter Spacing</label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: 'DEFAULT', val: 'default' },
                      { label: 'TIGHT', val: '-0.04em' },
                      { label: 'WIDE', val: '0.1em' },
                      { label: 'WIDEST', val: '0.25em' }
                    ].map((tr) => {
                      const activeTr = editingField === 'headline' ? headlineSpacing : editingField === 'subheadline' ? subheadlineSpacing : quoteSpacing;
                      return (
                        <button
                          key={tr.val}
                          type="button"
                          onClick={() => {
                            if (editingField === 'headline') setHeadlineSpacing(tr.val);
                            else if (editingField === 'subheadline') setSubheadlineSpacing(tr.val);
                            else setQuoteSpacing(tr.val);
                          }}
                          className={`px-1 py-1 rounded text-[7px] font-sans border transition-all ${
                            activeTr === tr.val 
                              ? 'bg-amber-400 border-amber-300 text-zinc-950 font-bold' 
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {tr.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom text color override */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-zinc-800 mt-0.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Text Color Override</label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { name: 'DFT', value: 'default', bg: 'bg-zinc-800 border border-zinc-700' },
                      { name: 'WHT', value: '#ffffff', bg: 'bg-white' },
                      { name: 'BLK', value: '#09090b', bg: 'bg-zinc-950 border border-zinc-800' },
                      { name: 'GLD', value: '#facc15', bg: 'bg-yellow-400' },
                      { name: 'RED', value: '#ef4444', bg: 'bg-red-500' },
                      { name: 'PNK', value: '#ec4899', bg: 'bg-pink-500' },
                      { name: 'YEL', value: '#fede00', bg: 'bg-yellow-300' }
                    ].map((col) => {
                      const activeCol = editingField === 'headline' ? headlineColor : editingField === 'subheadline' ? subheadlineColor : quoteColor;
                      return (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => {
                            if (editingField === 'headline') setHeadlineColor(col.value);
                            else if (editingField === 'subheadline') setSubheadlineColor(col.value);
                            else setQuoteColor(col.value);
                          }}
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold ${col.bg} ${
                            activeCol === col.value 
                              ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900 border-blue-400 scale-105' 
                              : 'opacity-80 hover:opacity-100'
                          }`}
                          title={col.name === 'DFT' ? 'Magazine Theme Color' : col.name}
                        >
                          {col.name === 'DFT' && <span className="text-[7px] text-zinc-400 font-sans font-bold">DFT</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

