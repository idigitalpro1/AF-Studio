import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Heart, 
  Star, 
  Sparkles, 
  RefreshCw, 
  LogOut, 
  Trash2, 
  Maximize2,
  Compass,
  Trophy,
  Twitter,
  Instagram
} from 'lucide-react';
import { GalleryItem } from './Carousel';
import { auth } from '../firebase';

interface ProfileProps {
  isOpen: boolean;
  onClose: () => void;
  galleryItems: GalleryItem[];
  likedCreations: Set<string | number>;
  onToggleLike: (id: string | number) => void;
  onRemix: (url: string) => void;
}

export function Profile({ 
  isOpen, 
  onClose, 
  galleryItems, 
  likedCreations, 
  onToggleLike, 
  onRemix 
}: ProfileProps) {
  const [selectedPreview, setSelectedPreview] = useState<GalleryItem | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const triggerShareToast = (msg: string) => {
    setShareMessage(msg);
    setTimeout(() => {
      setShareMessage(null);
    }, 2800);
  };

  const handleTwitterShare = (url: string) => {
    const text = `Check out this design on Aspen Fashion! ✨`;
    navigator.clipboard.writeText(url).then(() => {
      triggerShareToast("Design URL copied! Opening Twitter...");
      setTimeout(() => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      }, 700);
    }).catch(() => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
    });
  };

  const handleInstagramShare = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      triggerShareToast("Design link copied to clipboard for Instagram! 📸✨");
    }).catch(() => {
      triggerShareToast("Failed to copy link.");
    });
  };

  // Identify current user
  const user = auth.currentUser;
  const isGuest = !user;
  const userId = user?.uid || 'guest';
  const userName = user ? (user.displayName || user.email?.split('@')[0] || 'Member') : 'Guest Stylist';
  const userEmail = user?.email || 'guest@aspenfashion.internal';
  
  // Get user avatar initials
  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  // Find user's own creations
  const myCreations = galleryItems.filter(item => item.userId === userId);
  const myCreationsCount = myCreations.length;

  // Calculate total stars (likes) received for their creations
  const totalStarsReceived = myCreations.reduce((acc, curr) => acc + (curr.stars || 0), 0);

  // Dynamic ranking based on designs generated
  const getStylistRank = (count: number) => {
    if (count === 0) return { title: 'Observer', desc: 'Starting your couture journey', color: 'text-zinc-400 bg-zinc-100' };
    if (count < 3) return { title: 'Apprentice Stylist', desc: 'Exploring materials and line', color: 'text-stone-700 bg-stone-100' };
    if (count < 6) return { title: 'House Designer', desc: 'Elegantly defining silhouettes', color: 'text-amber-700 bg-amber-50' };
    if (count < 10) return { title: 'Couturier', desc: 'Challenging classic symmetry', color: 'text-indigo-700 bg-indigo-50 border border-indigo-150' };
    return { title: 'Aesthetic Director', desc: 'Masterclass of light and fabric', color: 'text-yellow-800 bg-yellow-50 font-bold border border-yellow-250 animate-pulse' };
  };

  const rank = getStylistRank(myCreationsCount);

  // Find creations favorited (liked) by the user
  const favoriteItems = galleryItems.filter(item => likedCreations.has(item.id));

  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out from Aspen Fashion?")) {
      try {
        await auth.signOut();
        window.location.reload();
      } catch (err) {
        console.error("Error signing out:", err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            id="profile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all"
          />

          {/* Slide-out Sidebar Panel */}
          <motion.div
            id="profile-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[460px] bg-white border-l border-zinc-200 shadow-2xl z-50 flex flex-col focus:outline-none relative"
          >
            {/* Custom elegant sharing notification */}
            <AnimatePresence>
              {shareMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  className="absolute top-4 left-4 right-4 bg-zinc-950 border border-zinc-800 text-white font-mono text-[10px] uppercase tracking-widest text-center py-2.5 px-4 shadow-xl z-55 rounded flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  <span>{shareMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-zinc-900" />
                <h2 className="font-serif text-lg uppercase tracking-widest font-bold">Profile Portfolio</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-black"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none">
              {/* User identity & Rank */}
              <div className="flex flex-col items-center text-center p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
                <div className="relative mb-3 group">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={userName} 
                      className="w-20 h-20 rounded-full object-cover border border-zinc-200 outline outline-2 outline-offset-2 outline-zinc-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-zinc-900 text-white flex items-center justify-center font-serif text-2xl font-bold tracking-tight shadow-md">
                      {getInitials()}
                    </div>
                  )}
                  {isGuest && (
                    <div className="absolute -bottom-1 -right-1 bg-zinc-100 text-zinc-900 border border-zinc-300 p-1 rounded-full shadow" title="Guest Session">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                  )}
                </div>

                <h3 className="font-serif text-xl tracking-tight font-bold text-zinc-900 leading-none mb-1">
                  {userName}
                </h3>
                <p className="text-xs text-zinc-400 font-mono lower-case tracking-wider mb-4">
                  {userEmail}
                </p>

                {/* Rank Badge */}
                <div className={`px-3 py-2 rounded-md max-w-xs flex flex-col items-center gap-0.5 ${rank.color}`}>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span className="text-xxs uppercase tracking-widest font-semibold font-mono">
                      {rank.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wide">
                    {rank.desc}
                  </p>
                </div>
              </div>

              {/* Statistics Panel Grid */}
              <div>
                <h4 className="text-xxs uppercase tracking-[0.25em] text-zinc-400 font-bold mb-3 font-mono">
                  Your Creative Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-zinc-200 rounded-lg text-center flex flex-col justify-center shadow-xs">
                    <span className="text-2xl font-serif font-black text-black">
                      {myCreationsCount}
                    </span>
                    <span className="text-xxs uppercase tracking-wider text-zinc-500 font-semibold font-mono mt-0.5">
                      Designs Created
                    </span>
                  </div>
                  <div className="p-4 bg-white border border-zinc-200 rounded-lg text-center flex flex-col justify-center shadow-xs">
                    <span className="text-2xl font-serif font-black text-amber-500 flex items-center justify-center gap-1 leading-none">
                      <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                      {totalStarsReceived}
                    </span>
                    <span className="text-xxs uppercase tracking-wider text-zinc-500 font-semibold font-mono mt-0.5">
                      Total Stars Received
                    </span>
                  </div>
                </div>
              </div>

              {/* Favorites List section */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xxs uppercase tracking-[0.25em] text-zinc-400 font-bold font-mono">
                    My Favorites ({favoriteItems.length})
                  </h4>
                  {favoriteItems.length > 0 && (
                    <span className="text-[10px] text-zinc-400 font-serif italic">
                      Click to showcase or remix
                    </span>
                  )}
                </div>

                {favoriteItems.length === 0 ? (
                  <div className="p-8 border border-dashed border-zinc-200 rounded-lg text-center flex flex-col items-center justify-center bg-zinc-50">
                    <Heart className="w-8 h-8 text-zinc-300 stroke-[1.5] mb-2" />
                    <p className="text-xs text-zinc-500 uppercase tracking-widest max-w-[240px] leading-relaxed">
                      No saved creations yet
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Tap the Star icon in the Gallery.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {favoriteItems.map(fav => (
                      <motion.div
                        key={fav.id}
                        whileHover={{ scale: 1.02 }}
                        className="group/item relative aspect-[3/4] bg-zinc-50 border border-zinc-150 rounded overflow-hidden cursor-pointer"
                        onClick={() => setSelectedPreview(fav)}
                      >
                        <img 
                          src={fav.url} 
                          alt="Favorite recreation"
                          className="w-full h-full object-cover select-none"
                        />
                        {/* Hover Overlay with metrics and click actions */}
                        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                          <div className="flex justify-between items-center w-full">
                            {/* Social Sharing Icons (Twitter, Instagram) */}
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleTwitterShare(fav.url)}
                                className="p-1 hover:bg-white/25 rounded-full transition-colors text-sky-450 hover:text-sky-300"
                                title="Share on Twitter"
                              >
                                <Twitter className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                onClick={() => handleInstagramShare(fav.url)}
                                className="p-1 hover:bg-white/25 rounded-full transition-colors text-pink-405 hover:text-pink-350"
                                title="Share on Instagram"
                              >
                                <Instagram className="w-3 h-3" />
                              </button>
                            </div>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleLike(fav.id);
                              }}
                              className="p-1 hover:bg-white/25 rounded-full transition-colors text-amber-500"
                              title="Unlike"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            </button>
                          </div>

                          <div>
                            <p className="text-[10px] truncate max-w-full font-mono font-medium leading-tight">
                              @{fav.user.split(' ')[0]}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 text-[9px] text-zinc-300">
                              <Star className="w-2.5 h-2.5 fill-white" /> {fav.stars}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
              {isGuest ? (
                <div className="text-xxs uppercase tracking-wider text-zinc-500 font-mono font-semibold">
                  GUEST PLAYGROUND SESSION
                </div>
              ) : (
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-zinc-600 hover:text-red-600 text-xs uppercase tracking-widest font-bold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  SIGN OUT
                </button>
              )}
              
              <div className="text-xxs tracking-wider text-zinc-400 font-mono">
                ASPEN EDIT. v1.2
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Embedded High-Detail Preview Modal */}
      {selectedPreview && (
        <div id="favorite-preview-modal" className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white max-w-xl w-full flex flex-col sm:flex-row shadow-2xl border border-zinc-300 rounded-lg overflow-hidden relative"
          >
            {/* Main Visual content */}
            <div className="w-full sm:w-1/2 aspect-[3/4] bg-zinc-950 relative">
              <img 
                src={selectedPreview.url} 
                alt="Selected visual preview"
                className="w-full h-full object-contain" 
              />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[9px] uppercase tracking-widest px-2 py-1 font-mono rounded">
                CREATED BY @{selectedPreview.user}
              </div>
            </div>

            {/* Text details / Actions panel */}
            <div className="w-full sm:w-1/2 p-6 flex flex-col justify-between h-full bg-white self-stretch">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                    Couture Details
                  </span>
                  <button 
                    onClick={() => setSelectedPreview(null)}
                    className="p-1 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedPreview.quote ? (
                  <div className="p-3 bg-zinc-50 border border-zinc-150 rounded italic font-serif text-sm text-zinc-700">
                    {selectedPreview.quote}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 italic">
                    Fine art generated with no prompt string saved.
                  </div>
                )}

                <div className="flex items-center gap-6 pt-2 select-none border-t border-b border-zinc-100 py-3">
                  <div className="text-center">
                    <span className="text-base font-bold font-serif text-amber-500 flex items-center gap-1 justify-center leading-none">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      {selectedPreview.stars}
                    </span>
                    <p className="text-[8px] uppercase tracking-wider text-zinc-400 font-mono mt-0.5">
                      Total Stars
                    </p>
                  </div>

                  <div className="text-center">
                    <span className="text-base font-bold font-serif text-zinc-800 leading-none">
                      {selectedPreview.comments || 0}
                    </span>
                    <p className="text-[8px] uppercase tracking-wider text-zinc-400 font-mono mt-0.5">
                      Comments
                    </p>
                  </div>
                </div>

                {/* Social Share Row in Modal */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 select-none">
                  <span className="text-[8px] uppercase font-bold tracking-widest text-[#a1a1aa] font-mono leading-none">
                    Share Couture
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTwitterShare(selectedPreview.url)}
                      className="p-1 px-2.5 border border-zinc-200 hover:border-black rounded transition-colors flex items-center gap-1 text-[10px] font-mono tracking-wider font-semibold text-zinc-600 hover:text-black bg-white"
                      title="Share to Twitter"
                    >
                      <Twitter className="w-3 h-3 text-sky-400 fill-current" />
                      Twitter
                    </button>
                    <button
                      onClick={() => handleInstagramShare(selectedPreview.url)}
                      className="p-1 px-2.5 border border-zinc-200 hover:border-black rounded transition-colors flex items-center gap-1 text-[10px] font-mono tracking-wider font-semibold text-zinc-600 hover:text-black bg-white"
                      title="Share to Instagram"
                    >
                      <Instagram className="w-3 h-3 text-pink-500" />
                      Instagram
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Action buttons */}
              <div className="flex flex-col gap-2 pt-6">
                <button
                  onClick={() => {
                    onRemix(selectedPreview.url);
                    setSelectedPreview(null);
                    onClose();
                  }}
                  className="w-full bg-black text-white hover:bg-zinc-900 font-bold uppercase tracking-widest py-2.5 px-4 text-xs transition-colors flex items-center justify-center gap-2 rounded"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Remix in Studio
                </button>

                <button
                  onClick={() => {
                    onToggleLike(selectedPreview.id);
                    // Determine if we need to remove from preview if we unliked it
                    setSelectedPreview(null);
                  }}
                  className="w-full border border-zinc-200 hover:bg-zinc-50 font-bold uppercase tracking-widest py-2 px-4 text-xs transition-colors flex items-center justify-center gap-2 rounded text-zinc-600 hover:text-black"
                >
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500 stroke-0" />
                  Remove Favorite
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
