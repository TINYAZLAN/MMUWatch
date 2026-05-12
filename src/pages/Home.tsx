import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, where, onSnapshot, startAfter, QueryDocumentSnapshot, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { VideoMetadata } from '../types';
import VideoCard from '../components/VideoCard';
import { Play, GraduationCap, ArrowRight, TrendingUp, Compass, PlaySquare, Loader2, Edit3, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthProvider';
import { cn } from '../lib/utils';
import { MMUText } from '../components/MMUText';
import { toast } from 'sonner';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface FeaturedSettings {
  title: string;
  description: string;
  buttonLink: string;
  backgroundUrl: string;
}

const defaultFeatured: FeaturedSettings = {
  title: "SHAPE THE FUTURE AT MMU",
  description: "Experience the digital revolution. Watch how our students are building the next generation of technology and creative media.",
  buttonLink: "", // We can use videos[0]?.id as fallback if this is empty
  backgroundUrl: "https://picsum.photos/seed/mmu-hero/1920/1080"
};

const Home: React.FC = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';
  
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [featuredSettings, setFeaturedSettings] = useState<FeaturedSettings>(defaultFeatured);
  const [isEditingFeatured, setIsEditingFeatured] = useState(false);
  const [editFeaturedForm, setEditFeaturedForm] = useState<FeaturedSettings>(defaultFeatured);

  const [trendingVideos, setTrendingVideos] = useState<VideoMetadata[]>([]);
  const [trendingPeriod, setTrendingPeriod] = useState<'all-time' | 'weekly'>('all-time');

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const q = query(collection(db, 'videos'), orderBy('views', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        let vids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoMetadata));
        
        if (trendingPeriod === 'weekly') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          vids = vids.filter(v => {
            if (!v.createdAt) return false;
            const d = (v.createdAt as unknown as {toDate: () => Date}).toDate ? (v.createdAt as unknown as {toDate: () => Date}).toDate() : new Date(v.createdAt as string);
            return d >= oneWeekAgo;
          });
        }
        
        setTrendingVideos(vids.slice(0, 4));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'videos');
      }
    };
    fetchTrending();
  }, [trendingPeriod]);

  const categories = ["All", "Campus Life", "Lectures", "Events", "Projects", "Tutorials", "Student Stories", "Alumni", "STyLE", "Concerts"];

  useEffect(() => {
    // Fetch featured settings
    const featuredRef = doc(db, 'settings', 'featured');
    const unsubFeatured = onSnapshot(featuredRef, (docSnap) => {
      if (docSnap.exists()) {
        setFeaturedSettings(docSnap.data() as FeaturedSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings');
    });

    return () => unsubFeatured();
  }, []);

  useEffect(() => {
    setLoading(true);
    setVideos([]);
    setLastDoc(null);
    setHasMore(true);

    let q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(8));
    if (activeCategory !== "All") {
      q = query(collection(db, 'videos'), where('category', '==', activeCategory), orderBy('createdAt', 'desc'), limit(8));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as VideoMetadata));
      setVideos(videoData);
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 8);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'videos');
    });

    return () => unsubscribe();
  }, [activeCategory]);

  const loadMore = async () => {
    if (!lastDoc || !hasMore) return;
    setLoadingMore(true);

    try {
      let q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(8));
      if (activeCategory !== "All") {
        q = query(collection(db, 'videos'), where('category', '==', activeCategory), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(8));
      }

      const snapshot = await getDocs(q);
      const newVideos = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as VideoMetadata));
      
      setVideos(prev => {
        const existingIds = new Set(prev.map(v => v.id));
        const uniqueNew = newVideos.filter(v => !existingIds.has(v.id));
        return [...prev, ...uniqueNew];
      });
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 8);
    } catch (error) {
      console.error("Error loading more videos:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSaveFeatured = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'settings', 'featured'), editFeaturedForm);
      setIsEditingFeatured(false);
      toast.success('Featured section updated!');
    } catch (error) {
      console.error('Error saving featured settings', error);
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence>
        {isEditingFeatured && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-lg rounded-3xl p-6 border border-border shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Featured Section</h3>
                <button onClick={() => setIsEditingFeatured(false)} className="p-2 hover:bg-muted rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveFeatured} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input type="text" required value={editFeaturedForm.title} onChange={e => setEditFeaturedForm({...editFeaturedForm, title: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea required value={editFeaturedForm.description} onChange={e => setEditFeaturedForm({...editFeaturedForm, description: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2 min-h-[100px]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Background Image/Video URL</label>
                  <input type="url" required value={editFeaturedForm.backgroundUrl} onChange={e => setEditFeaturedForm({...editFeaturedForm, backgroundUrl: e.target.value})} className="w-full bg-muted border border-border rounded-xl px-4 py-2" />
                  <p className="text-xs text-muted-foreground mt-1">Accepts images (jpg, png) or videos (mp4).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Button Link / Video ID</label>
                  <input type="text" value={editFeaturedForm.buttonLink} onChange={e => setEditFeaturedForm({...editFeaturedForm, buttonLink: e.target.value})} placeholder="e.g., /watch/video123 or just Video ID" className="w-full bg-muted border border-border rounded-xl px-4 py-2" />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to use the latest video.</p>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsEditingFeatured(false)} className="px-4 py-2 text-sm font-bold hover:bg-muted rounded-full">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-full">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-[400px] rounded-3xl overflow-hidden group shadow-2xl">
        {featuredSettings.backgroundUrl.endsWith('.mp4') || featuredSettings.backgroundUrl.endsWith('.webm') ? (
          <video autoPlay loop muted playsInline src={featuredSettings.backgroundUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <img referrerPolicy="no-referrer"   
            src={featuredSettings.backgroundUrl} 
            alt="MMU Hero" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 md:p-12">
          {isAdmin && (
            <button 
              onClick={() => { setEditFeaturedForm(featuredSettings); setIsEditingFeatured(true); }}
              className="absolute top-4 right-4 bg-black/60 hover:bg-primary backdrop-blur-sm text-white p-2 rounded-full transition-colors z-20"
              title="Edit Featured Area"
            >
              <Edit3 size={18} />
            </button>
          )}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
              <TrendingUp size={16} />
              <MMUText text="Featured at MMU" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-white drop-shadow-lg">
              <MMUText text={featuredSettings.title} />
            </h1>
            <p className="text-lg text-white/90 drop-shadow-md line-clamp-2 max-w-xl font-medium">
              {featuredSettings.description}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {(featuredSettings.buttonLink || videos.length > 0) && (
                <Link 
                  to={featuredSettings.buttonLink.startsWith('/') ? featuredSettings.buttonLink : (featuredSettings.buttonLink ? `/watch/${featuredSettings.buttonLink}` : `/watch/${videos[0]?.id}`)} 
                  className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-all scale-100 hover:scale-105 active:scale-95"
                >
                  <Play size={20} fill="black" />
                  Watch Now
                </Link>
              )}
              {!user && (
                <a href="https://www.mmu.edu.my" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-primary/90 transition-all scale-100 hover:scale-105 active:scale-95">
                  <GraduationCap size={20} />
                  Apply to MMU
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Compass className="text-primary" />
            Personalized for You
          </h2>
          <Link to="/explore" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-video bg-muted rounded-xl" />
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : videos.length > 0 ? (
            videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-card rounded-3xl border border-border border-dashed text-muted-foreground">
              No videos found in this category.
            </div>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center pt-8">
            <button 
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 bg-card border border-border hover:bg-muted text-foreground px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 shadow-sm"
            >
              {loadingMore ? <Loader2 className="animate-spin" size={20} /> : "Load More Content"}
            </button>
          </div>
        )}
      </section>

      {/* Trending Section */}
      <section className="bg-card rounded-3xl p-8 space-y-6 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <PlaySquare className="text-primary" />
            <MMUText text="Trending at MMU" />
          </h2>
          {isAdmin && (
            <div className="flex bg-muted rounded-full p-1 border border-border">
              <button 
                onClick={() => setTrendingPeriod('all-time')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-full transition-colors",
                  trendingPeriod === 'all-time' ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Time
              </button>
              <button 
                onClick={() => setTrendingPeriod('weekly')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-full transition-colors",
                  trendingPeriod === 'weekly' ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Weekly
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingVideos.map((video, i) => (
            <Link to={`/watch/${video.id}`} key={video.id} className="flex gap-4 group cursor-pointer hover:bg-muted p-2 rounded-xl transition-colors">
              <span className="text-4xl font-black text-muted-foreground/20 group-hover:text-primary transition-colors">0{i + 1}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{video.views.toLocaleString()} views</p>
              </div>
            </Link>
          ))}
          {trendingVideos.length === 0 && (
            <div className="col-span-full text-center py-4 text-muted-foreground text-sm">
              No trending videos yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
