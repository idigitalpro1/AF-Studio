import React, { useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, Trash2, RefreshCw } from 'lucide-react';

export interface GalleryItem {
  id: string | number;
  url: string;
  user: string;
  userId?: string;
  stars: number;
  comments: number;
  commentsList?: string[];
  award?: string;
  quote?: string;
  tags?: string[];
}

export function Carousel({ items, setItems, onRemix }: { items: GalleryItem[], setItems: (items: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => void, onRemix: (url: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortedItems = [...items].reverse();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDelete = (id: string | number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="w-full bg-zinc-950 text-white py-4 overflow-hidden border-t border-zinc-800 relative group/carousel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase tracking-widest text-zinc-400">Latest Looks Stream</h3>
          <div className="flex gap-2">
            <button onClick={() => scroll('left')} className="p-1 hover:bg-zinc-800 rounded-full transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scroll('right')} className="p-1 hover:bg-zinc-800 rounded-full transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x"
        >
          {sortedItems.map(pic => (
            <div key={pic.id} className="relative flex-none w-24 h-32 sm:w-32 sm:h-44 rounded overflow-hidden group snap-start bg-zinc-900">
              <img src={pic.url} className="w-full h-full object-contain" alt={`By ${pic.user}`} />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                <div className="flex items-center gap-1 text-xs font-medium mb-1">
                  <Star className="w-3 h-3 fill-white" /> {pic.stars}
                </div>
                <button 
                  onClick={() => onRemix(pic.url)}
                  className="bg-white text-black text-[10px] px-2 py-1 uppercase tracking-wider font-bold hover:bg-zinc-200 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Remix
                </button>
                <button 
                  onClick={() => handleDelete(pic.id)}
                  className="text-red-400 hover:text-red-300 transition-colors p-1"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {sortedItems.length === 0 && (
            <div className="text-zinc-600 text-sm italic py-8 w-full text-center">
              No recent looks yet. Create one in the Studio!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
