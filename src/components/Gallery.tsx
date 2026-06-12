import { useState } from 'react';
import { Star, MessageCircle, Share2, Award, Download, X, Trash2 } from 'lucide-react';
import { GalleryItem } from './Carousel';
import { Watermark } from './Watermark';

function GalleryCard({ 
  item, 
  handleStar, 
  handlePost, 
  handleDownload, 
  handleDelete,
  inputs, 
  setInputs 
}: { 
  item: GalleryItem, 
  handleStar: (id: number) => void, 
  handlePost: (id: number) => void, 
  handleDownload: (url: string, user: string, tier: string) => void, 
  handleDelete?: (id: number) => void,
  inputs: Record<number, string>, 
  setInputs: (inputs: Record<number, string>) => void 
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="relative group w-full h-[600px]" style={{ perspective: '1000px' }}>
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
          <div className="p-4 flex justify-between items-center bg-white z-10 border-t border-zinc-100">
            <span className="font-serif uppercase tracking-widest text-sm truncate mr-2">{item.user}</span>
            <div className="flex gap-4 shrink-0">
              <div className="flex items-center gap-1 text-zinc-500">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">{item.stars}</span>
              </div>
              <div className="flex items-center gap-1 text-zinc-500">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{item.comments}</span>
              </div>
            </div>
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
              {item.commentsList?.map((comment, idx) => (
                <div key={idx} className="bg-zinc-900 p-3 rounded border border-zinc-800 text-sm">
                  {comment}
                </div>
              ))}
              {(!item.commentsList || item.commentsList.length === 0) && (
                <div className="text-center text-zinc-600 italic mt-8 text-sm">No comments yet. Be the first!</div>
              )}
            </div>

            <div className="flex gap-2 mb-6">
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
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <button 
                onClick={() => handleStar(item.id)}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <Star className="w-4 h-4" /> Rate
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
    </div>
  );
}

export function Gallery({ items, setItems }: { items: GalleryItem[], setItems: (items: GalleryItem[]) => void }) {
  const [inputs, setInputs] = useState<Record<number, string>>({});

  const handleStar = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, stars: item.stars + 1 } : item
    ));
  };

  const handlePost = (id: number) => {
    const text = inputs[id];
    if (!text || !text.trim()) return;
    
    setItems(items.map(item => 
      item.id === id ? { 
        ...item, 
        comments: item.comments + 1,
        commentsList: [...(item.commentsList || []), text.trim()]
      } : item
    ));
    
    setInputs({ ...inputs, [id]: '' });
  };

  const handleDelete = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleDownload = async (url: string, user: string, tier: string) => {
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

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-12 text-center">
        <h2 className="text-4xl font-serif uppercase tracking-widest mb-4">The Gallery</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto">
          Discover the most stunning red carpet looks generated by our community. Rate, comment, and share to elevate your favorites to the top.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <GalleryCard 
              key={item.id}
              item={item}
              handleStar={handleStar}
              handlePost={handlePost}
              handleDownload={handleDownload}
              handleDelete={handleDelete}
              inputs={inputs}
              setInputs={setInputs}
            />
          ))}
        </div>
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
