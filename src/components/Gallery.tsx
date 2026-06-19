import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageCircle, Share2, Award, Download, X, Trash2, Mic, Play, Pause, Volume2, Square, Search } from 'lucide-react';
import { GalleryItem } from './Carousel';
import { Watermark } from './Watermark';
import { auth } from '../firebase';
import { toggleLike, addCommentToCreation } from '../lib/db';

function AudioCommentPlayer({ payload }: { payload: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const aud = new Audio(payload.audioData);
    audioRef.current = aud;

    const handleTimeUpdate = () => {
      setCurrentTime(aud.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    aud.addEventListener('timeupdate', handleTimeUpdate);
    aud.addEventListener('ended', handleEnded);

    return () => {
      aud.pause();
      aud.removeEventListener('timeupdate', handleTimeUpdate);
      aud.removeEventListener('ended', handleEnded);
    };
  }, [payload.audioData]);

  const togglePlay = () => {
    const aud = audioRef.current;
    if (!aud) return;
    if (isPlaying) {
      aud.pause();
      setIsPlaying(false);
    } else {
      aud.play().catch(err => console.error("Error playing commentary audio:", err));
      setIsPlaying(true);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-zinc-900 border border-yellow-500/20 p-3 rounded-lg flex items-center gap-3 shadow-md">
      <button 
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current animate-pulse" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-zinc-400 mb-1 font-mono">
          <span className="font-semibold text-yellow-500">@{payload.user} (Commentary)</span>
          <span>{formatDuration(currentTime)} / {formatDuration(payload.duration)}</span>
        </div>
        <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-yellow-400 transition-all duration-100"
            style={{ width: `${(payload.duration ? (currentTime / payload.duration) : 0) * 100}%` }}
          />
        </div>
      </div>
      <div className="text-zinc-600">
        <Mic className="w-4 h-4" />
      </div>
    </div>
  );
}

function GalleryCard({ 
  item, 
  handleStar, 
  handlePost, 
  handleDownload, 
  handleDelete,
  hasLiked,
  inputs, 
  setInputs 
}: { 
  item: GalleryItem, 
  handleStar: (id: string | number) => void, 
  handlePost: (id: string | number, textOverride?: string) => void, 
  handleDownload: (url: string, user: string, tier: string) => void, 
  handleDelete?: (id: string | number) => void,
  hasLiked: boolean,
  inputs: Record<string | number, string>, 
  setInputs: (inputs: Record<string | number, string>) => void 
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBase64, setRecordedBase64] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setRecordError(null);
    setRecordedAudioUrl(null);
    setRecordedBase64(null);
    setRecordingSeconds(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }
      
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      const interval = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 14) {
            recorder.stop();
            clearInterval(interval);
            setIsRecording(false);
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
      recordingIntervalRef.current = interval;
    } catch (err) {
      console.error("Failed to access microphone for recording", err);
      setRecordError("Microphone access denied or unsupported on this device.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsRecording(false);
  };

  const handlePostVoice = () => {
    if (!recordedBase64) return;
    
    const userHandle = auth.currentUser?.email?.split('@')[0] || auth.currentUser?.displayName || 'Fashionista';
    const commentaryPayload = JSON.stringify({
      type: 'audio',
      audioData: recordedBase64,
      user: userHandle,
      duration: recordingSeconds
    });

    handlePost(item.id, commentaryPayload);
    
    setRecordedAudioUrl(null);
    setRecordedBase64(null);
    setRecordingSeconds(0);
  };

  const togglePreviewPlay = () => {
    if (!recordedAudioUrl) return;
    
    if (isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewPlaying(false);
    } else {
      const aud = new Audio(recordedAudioUrl);
      previewAudioRef.current = aud;
      aud.ontimeupdate = () => {
        setPlaybackSeconds(aud.currentTime);
      };
      aud.onended = () => {
        setIsPreviewPlaying(false);
        setPlaybackSeconds(0);
      };
      aud.play().catch(e => console.error("Failed to play preview:", e));
      setIsPreviewPlaying(true);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative group w-full h-[600px]" 
      style={{ perspective: '1000px' }}
    >
      <div 
        className="w-full h-full transition-transform duration-700 relative"
        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Front */}
        <div 
          className="absolute inset-0 bg-white border border-zinc-200 flex flex-col cursor-pointer shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          style={{ backfaceVisibility: 'hidden' }}
          onClick={() => setIsFlipped(true)}
        >
          <div className="relative flex-1 overflow-hidden bg-zinc-100">
            <img 
              src={item.url} 
              alt={`Fashion by ${item.user}`}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
            
            {/* Top Bar: Volume */}
            <div className="absolute top-4 left-4 right-4 flex justify-end items-start z-10 pointer-events-none">
              <div className="text-white/90 text-[8px] uppercase tracking-widest text-right" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                VOL 4. / EXCLUSIVE
              </div>
            </div>

            {/* Left Side: Magazine Titles */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 z-10 flex flex-col gap-4 max-w-[120px] pointer-events-none">
              <div>
                <h3 className="text-white font-serif text-xs leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>THE NEW AVANT-GARDE</h3>
                <p className="text-white/80 text-[7px] sans-serif uppercase tracking-wider mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Redefining Luxury</p>
              </div>
              <div>
                <h3 className="text-white font-serif text-xs leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>MIDNIGHT CYBER</h3>
                <p className="text-white/80 text-[7px] sans-serif uppercase tracking-wider mt-0.5" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>Neon Trends 2026</p>
              </div>
              <div>
                <h3 className="text-white font-serif text-xs leading-tight text-yellow-400" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>GOLDEN AGE GLAMOUR</h3>
              </div>
            </div>

            {/* Quote / Highlight */}
            <div className="absolute bottom-16 left-4 right-16 z-10 pointer-events-none">
              <div className="border-l-2 border-white/80 pl-2 py-1">
                <p className="text-white/90 font-serif text-[8px] leading-snug italic" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {item.quote || '"A very formal classic enthusiast of Versace, Hugo Boss, Armani, and Louis Vuitton, and an Asian-made critic of high distinction."'}
                </p>
              </div>
            </div>

            <Watermark />
            {item.award && (
              <div className="absolute top-16 right-4 bg-black text-white px-3 py-1 text-xs uppercase tracking-widest font-medium flex items-center gap-1 shadow-lg z-30">
                <Award className="w-3 h-3" />
                {item.award}
              </div>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(item.url, item.user, 'Original');
              }}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full transition-colors z-30 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95"
              title="Download Creation"
            >
              <Download className="w-4 h-4" />
            </button>
            {handleDelete && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                className="absolute top-4 left-4 bg-black/50 hover:bg-red-600 text-white p-2 rounded-full transition-colors z-30"
                title="Delete from Gallery"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-black px-4 py-2 text-xs uppercase tracking-widest font-medium shadow-lg backdrop-blur-sm">
                View Details
              </div>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-2 bg-white z-10 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <span className="font-serif uppercase tracking-widest text-sm truncate mr-2">{item.user}</span>
              <div className="flex gap-4 items-center shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(item.url, item.user, 'Original');
                  }}
                  className="flex items-center gap-1 text-zinc-500 hover:text-black transition-colors"
                  title="Download design"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider hidden xs:inline">Get</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStar(item.id);
                  }}
                  className="flex items-center gap-1 text-zinc-500 hover:text-yellow-500 transition-colors"
                >
                  <Star className={`w-4 h-4 ${hasLiked ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                  <span className="text-sm font-medium">{item.stars}</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="flex items-center gap-1 text-zinc-500 hover:text-black transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.comments}</span>
                </button>
              </div>
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {item.tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="text-[9px] uppercase tracking-wider font-mono font-medium px-2 py-0.5 bg-zinc-100/80 text-zinc-550 rounded border border-zinc-200/50"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Back */}
        <div 
          className="absolute inset-0 bg-zinc-950 text-white border border-zinc-800 flex flex-col p-6 overflow-hidden shadow-xl"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }} 
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center mb-6 mt-2">
            <h3 className="text-2xl font-serif uppercase tracking-widest text-yellow-500 mb-2">"You Got The Look"</h3>
            <div className="text-xs tracking-widest uppercase text-zinc-400">Award Page</div>
          </div>

          <div className="flex justify-center gap-6 mb-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 text-center">Top Rated</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 text-center">Editor's Pick</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
                <MessageCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 text-center">Trending</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 mb-4 text-sm text-zinc-300 scrollbar-hide">
              {item.commentsList?.map((comment, idx) => {
                let isAudio = false;
                let audioPayload: any = null;
                
                if (comment && comment.startsWith('{"type":"audio"')) {
                  try {
                    audioPayload = JSON.parse(comment);
                    isAudio = true;
                  } catch (e) {
                    console.error("Failed to parse audio comment:", e);
                  }
                }
                
                if (isAudio && audioPayload) {
                  return (
                    <AudioCommentPlayer key={idx} payload={audioPayload} />
                  );
                }
                
                return (
                  <div key={idx} className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-sm">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 font-mono">Text Comment</div>
                    {comment}
                  </div>
                );
              })}
              {(!item.commentsList || item.commentsList.length === 0) && (
                <div className="text-center text-zinc-600 italic mt-8 text-sm">No comments yet. Be the first!</div>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={inputs[item.id] || ''}
                onChange={(e) => setInputs({ ...inputs, [item.id]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handlePost(item.id)}
                placeholder="Add a comment..." 
                className="flex-1 border-b border-zinc-700 py-2 text-sm focus:outline-none focus:border-yellow-500 bg-transparent text-white placeholder-zinc-600"
              />
              <button 
                onClick={() => handlePost(item.id)}
                disabled={!inputs[item.id]?.trim()}
                className="text-xs uppercase tracking-widest font-medium text-yellow-500 hover:text-yellow-400 disabled:opacity-50"
              >
                Post
              </button>
            </div>

            {/* Vocal Commentary Controller */}
            <div className="border-t border-zinc-800/80 pt-3 mb-6">
              {isRecording ? (
                <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shrink-0" />
                    <span className="text-[11px] uppercase tracking-widest text-red-400 font-mono">
                      Recording: 0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={stopRecording}
                    className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors shrink-0 animate-pulse"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </div>
              ) : recordedAudioUrl ? (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 animate-pulse">
                      <Mic className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-[10px] uppercase tracking-widest text-zinc-300 font-semibold font-mono">Audio Ready (0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds})</span>
                    </div>
                    <div className="flex gap-1.5 text-[9px] uppercase tracking-widest font-mono">
                      <button 
                        type="button"
                        onClick={togglePreviewPlay}
                        className="text-yellow-500 hover:text-yellow-400 underline"
                      >
                        {isPreviewPlaying ? "Pause" : "Play"}
                      </button>
                      <span className="text-zinc-700">|</span>
                      <button 
                        type="button"
                        onClick={() => { setRecordedAudioUrl(null); setRecordedBase64(null); }}
                        className="text-zinc-500 hover:text-red-500"
                      >
                        Redo
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={handlePostVoice}
                    className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-[10px] font-bold uppercase tracking-widest rounded transition-colors"
                  >
                    Post Audio Commentary
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={startRecording}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors text-zinc-400 hover:text-white"
                >
                  <Mic className="w-3.5 h-3.5 text-yellow-500" />
                  <span>Record Commentary</span>
                </button>
              )}
              {recordError && (
                <p className="text-[9px] text-red-500 font-mono text-center mt-1.5 uppercase tracking-wide">{recordError}</p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <button 
                onClick={() => handleStar(item.id)}
                className={`flex-1 py-2.5 border text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${
                  hasLiked 
                    ? 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500 text-black font-semibold shadow-inner' 
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-white'
                }`}
                id={`rate-btn-${item.id}`}
              >
                <Star className={`w-4 h-4 ${hasLiked ? 'fill-black text-black' : ''}`} /> {hasLiked ? 'Starred' : 'Rate'}
              </button>
              <button 
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => handleDownload(item.url, item.user, '1K')}
                className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9px] sm:text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>1K (Free)</span>
              </button>
              <button 
                onClick={() => handleDownload(item.url, item.user, '2K')}
                className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9px] sm:text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-colors text-yellow-500"
              >
                <Download className="w-3 h-3" />
                <span>2K ($2)</span>
              </button>
              <button 
                onClick={() => handleDownload(item.url, item.user, '4K')}
                className="py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9px] sm:text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-colors text-yellow-500"
              >
                <Download className="w-3 h-3" />
                <span>4K ($4)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Gallery({ 
  items, 
  setItems, 
  likedCreations,
  onToggleLike
}: { 
  items: GalleryItem[], 
  setItems: (items: GalleryItem[]) => void, 
  likedCreations?: Set<string | number>,
  onToggleLike?: (id: string | number) => void
}) {
  const [inputs, setInputs] = useState<Record<string | number, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const POPULAR_TAGS = ['All', 'Avant-Garde', 'Couture', 'Vintage', 'Streetwear', 'Classic', 'Silhouette', 'Gala', 'Glamour'];

  const handleStar = (id: string | number) => {
    // Check if user is authenticated (meaning running fully in Firestore database mode)
    if (auth.currentUser) {
      toggleLike(id.toString());
      if (onToggleLike) {
        // Just call it in App.tsx to keep everything in sync
        onToggleLike(id);
      }
    } else {
      // Guest mode toggling
      const isAlreadyLiked = likedCreations?.has(id);
      setItems(items.map(item => 
        item.id === id ? { ...item, stars: isAlreadyLiked ? Math.max(0, item.stars - 1) : item.stars + 1 } : item
      ));
      if (onToggleLike) {
        onToggleLike(id);
      }
    }
  };

  const handlePost = async (id: string | number, textOverride?: string) => {
    const text = textOverride || inputs[id];
    if (!text || !text.trim()) return;
    
    if (!textOverride) {
      setInputs({ ...inputs, [id]: '' });
    }

    if (auth.currentUser) {
      await addCommentToCreation(id.toString(), text.trim());
    } else {
      // Offline/Guest fallback
      setItems(items.map(item => 
        item.id === id ? { 
          ...item, 
          comments: item.comments + 1,
          commentsList: [...(item.commentsList || []), text.trim()]
        } : item
      ));
    }
  };

  const handleDelete = (id: string | number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleDownload = async (url: string, user: string, tier: string) => {
    // If it's a data URL or original model download requested, skip heavy canvas rendering to prevent data truncation
    if (tier === 'Original' || url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `aspen-fashion-${user.replace(/\s+/g, '-').toLowerCase()}-${tier}.jpg`;
      a.click();
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
         ctx.drawImage(img, 0, 0);
         
         // Only add watermark for 1K (Free) tier
         if (tier === '1K') {
           ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
           ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
           ctx.shadowBlur = 6;
           
           // Aspen Fashion (Moved to bottom left)
           ctx.font = `bold ${Math.max(24, img.height * 0.04)}px serif`;
           ctx.fillText('ASPEN FASHION', img.width * 0.03, img.height - img.height * 0.08);
           
           // Patrick Henry Sweeney (Directly under Fashion)
           ctx.font = `${Math.max(10, img.height * 0.015)}px sans-serif`;
           ctx.fillText('PATRICK HENRY SWEENEY', img.width * 0.03, img.height - img.height * 0.05);
         }
         
         const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
         const a = document.createElement('a');
         a.href = dataUrl;
         a.download = `aspen-fashion-${user.replace(/\s+/g, '-').toLowerCase()}-${tier}.jpg`;
         a.click();
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aspen-fashion-${user.replace(/\s+/g, '-').toLowerCase()}-${tier}.jpg`;
      a.target = '_blank';
      a.click();
    }
  };

  // Filter items based on selectedTag and search query
  const filteredItems = items.filter(item => {
    // 1. Selected tag filter
    if (selectedTag !== 'All') {
      const matchTag = selectedTag.toLowerCase();
      if (!item.tags || !item.tags.some(tag => tag.toLowerCase() === matchTag)) {
        return false;
      }
    }

    // 2. Search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const userMatches = item.user.toLowerCase().includes(query);
      const quoteMatches = item.quote ? item.quote.toLowerCase().includes(query) : false;
      const awardMatches = item.award ? item.award.toLowerCase().includes(query) : false;
      const tagMatches = item.tags ? item.tags.some(tag => tag.toLowerCase().includes(query)) : false;

      return userMatches || quoteMatches || awardMatches || tagMatches;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto pb-20 select-none">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-serif uppercase tracking-widest mb-4">The Gallery</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto text-sm">
          Discover the most stunning red carpet looks generated by our community. Rate, comment, and share to elevate your favorites to the top.
        </p>
      </div>

      {/* Styled Luxury Search & Filter Panel */}
      <div className="mb-10 max-w-3xl mx-auto space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creations by creator name, prompt style, keywords or awards..."
            className="w-full pl-12 pr-10 py-3.5 bg-white border border-zinc-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm tracking-wide transition-all placeholder-zinc-400 font-sans shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black font-semibold text-xs py-1"
              title="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Tag Filters Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono shrink-0 pr-1 select-none">
            Filter:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {POPULAR_TAGS.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono font-semibold transition-all border ${
                    isSelected
                      ? 'bg-black border-black text-white shadow-sm'
                      : 'bg-white border-zinc-200 hover:border-zinc-400 text-zinc-600 hover:text-black'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <GalleryCard 
                  key={item.id}
                  item={item}
                  handleStar={handleStar}
                  handlePost={handlePost}
                  handleDownload={handleDownload}
                  handleDelete={handleDelete}
                  hasLiked={!!likedCreations?.has(item.id)}
                  inputs={inputs}
                  setInputs={setInputs}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 border border-zinc-150 bg-white/60 shadow-sm max-w-2xl mx-auto p-8">
            <Search className="w-10 h-10 text-zinc-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-md font-serif uppercase tracking-widest text-zinc-500">No matches found</h3>
            <p className="text-zinc-400 mt-2 text-xs max-w-sm mx-auto leading-relaxed">
              We couldn't find any creations matching <strong className="text-zinc-700">"{searchQuery}"</strong> under the <strong className="text-zinc-700">#{selectedTag}</strong> category.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTag('All');
              }}
              className="mt-6 px-5 py-2.5 bg-black hover:bg-zinc-800 text-white text-[10px] uppercase font-mono tracking-widest transition-colors font-medium rounded-sm"
            >
              Reset Filters
            </button>
          </div>
        )
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-zinc-200 bg-white/50">
          <Award className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-xl font-serif uppercase tracking-widest text-zinc-400">Gallery is Empty</h3>
          <p className="text-zinc-500 mt-2">Be the first to create a masterpiece in the Studio!</p>
        </div>
      )}
    </div>
  );
}
