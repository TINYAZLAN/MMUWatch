import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, where, onSnapshot, startAfter, QueryDocumentSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { VideoMetadata } from '../types';
import VideoCard from '../components/VideoCard';
import { Play, GraduationCap, ArrowRight, TrendingUp, Compass, PlaySquare, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../AuthProvider';
import { cn } from '../lib/utils';
import { MMUText } from '../components/MMUText';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const Home: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const categories = ["All", "Campus Life", "Lectures", "Events", "Projects", "Tutorials", "Student Stories", "Alumni", "STyLE", "Concerts"];

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
      
      if (videoData.length === 0) {
        setVideos([
          { id: 'v1', title: 'Campus Tour 2026', description: 'Explore the new facilities!', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', creatorId: 'user1', creatorName: 'John Doe', likes: 1200, comments: 45, views: 5000, category: 'Campus Life', createdAt: new Date().toISOString(), tags: ['campus', 'tour'] },
          { id: 'v2', title: 'FCI Final Year Project Showcase', description: 'Amazing projects by our seniors.', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', creatorId: 'user2', creatorName: 'Jane Smith', likes: 950, comments: 30, views: 3200, category: 'Projects', createdAt: new Date().toISOString(), tags: ['fyp', 'fci'] },
          { id: 'v3', title: 'Freshies Night Highlights', description: 'What a night to remember!', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', creatorId: 'user3', creatorName: 'MMU SRC', likes: 840, comments: 55, views: 4100, category: 'Events', createdAt: new Date().toISOString(), tags: ['freshies', 'party'] },
          { id: 'v4', title: 'Library Study Hacks', description: 'How to survive finals week.', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', creatorId: 'user4', creatorName: 'Study Guru', likes: 720, comments: 20, views: 2800, category: 'Tutorials', createdAt: new Date().toISOString(), tags: ['study', 'library'] }
        ]);
      } else {
        setVideos(videoData);
      }
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 8);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching videos:", error);
      setLoading(false);
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

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative h-[400px] rounded-3xl overflow-hidden group shadow-2xl">
        <img referrerPolicy="no-referrer"   
          src="https://picsum.photos/seed/mmu-hero/1920/1080" 
          alt="MMU Hero" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 md:p-12">
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
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-white">
              <MMUText text="SHAPE THE FUTURE AT MMU" />
            </h1>
            <p className="text-lg text-white/80 line-clamp-2 max-w-xl">
              Experience the digital revolution. Watch how our students are building the next generation of technology and creative media.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {videos.length > 0 && (
                <Link to={`/watch/${videos[0].id}`} className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition-all scale-100 hover:scale-105 active:scale-95">
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

      {/* Category Pills */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {categories.map((cat) => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all hover:scale-105 active:scale-95 border",
              activeCategory === cat 
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                : "bg-card text-foreground border-border hover:bg-muted"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {videos.slice(0, 4).map((video, i) => (
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
          {videos.length === 0 && (
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
