import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, limit, onSnapshot, orderBy, startAfter, QueryDocumentSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UnifiedSearchResult, SearchResultType, VideoMetadata } from '../types';
import VideoCard from '../components/VideoCard';
import { Search as SearchIcon, Filter, X, Loader2, Compass, Calendar, Users, Play, Tag, ChevronRight, LayoutGrid, List, SlidersHorizontal, Briefcase, GraduationCap, Globe, BookOpen, Cpu, MonitorPlay, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../AuthProvider';
import { toast } from 'sonner';
import { MMUText } from '../components/MMUText';

const SearchCard: React.FC<{ result: UnifiedSearchResult }> = ({ result }) => {
  if (result.type === 'video') {
    return <VideoCard video={result as any} />;
  }

  const getLink = () => {
    if (result.type === 'event') return '/explore';
    if (result.type === 'club') return '/community';
    return '/';
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-card rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300"
    >
      <Link to={getLink()} className="block">
        <div className="aspect-video relative overflow-hidden bg-muted">
          <img referrerPolicy="no-referrer"   
            src={result.imageURL || result.thumbnailURL || `https://picsum.photos/seed/${result.id}/800/450`} 
            alt={result.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md border",
              result.type === 'event' ? "bg-primary/90 text-white border-primary/20" : "bg-blue-600/90 text-white border-blue-600/20"
            )}>
              {result.type}
            </span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {result.type === 'event' ? (
              <>
                <Calendar size={12} className="text-primary" />
                <span>{result.date}</span>
                <span className="mx-1">•</span>
                <span>{result.location}</span>
              </>
            ) : (
              <>
                <Users size={12} className="text-blue-600" />
                <span>{result.clubName}</span>
                <span className="mx-1">•</span>
                <span>{result.createdAt ? formatDistanceToNow(new Date(result.createdAt.toMillis ? result.createdAt.toMillis() : result.createdAt)) + ' ago' : 'Recently'}</span>
              </>
            )}
          </div>
          <h3 className="font-black text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {result.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {result.description || result.content}
          </p>
          {result.tags && result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {result.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[9px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

// Mock data for public view
const mockPublicVideos = {
  FCI: [
    { id: 'mock1', title: 'Introduction to Python', description: 'Learn the basics of Python programming.', creatorName: 'Dr. Ahmad', views: 1200, likes: 150, dislikes: 2, category: 'FCI', tags: ['Python', 'Programming'], thumbnailURL: 'https://picsum.photos/seed/fci1/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', creatorId: 'mock', createdAt: new Date() },
    { id: 'mock2', title: 'Data Structures 101', description: 'Essential data structures for computer science.', creatorName: 'Prof. Lee', views: 850, likes: 90, dislikes: 1, category: 'FCI', tags: ['Data Structures', 'CS'], thumbnailURL: 'https://picsum.photos/seed/fci2/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', creatorId: 'mock', createdAt: new Date() }
  ],
  FCM: [
    { id: 'mock3', title: 'Digital Art Showcase', description: 'A showcase of student digital art projects.', creatorName: 'Sarah Lim', views: 2300, likes: 300, dislikes: 5, category: 'FCM', tags: ['Art', 'Showcase'], thumbnailURL: 'https://picsum.photos/seed/fcm1/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', creatorId: 'mock', createdAt: new Date() },
    { id: 'mock4', title: 'Animation Basics', description: 'Getting started with 2D animation.', creatorName: 'John Doe', views: 1500, likes: 200, dislikes: 3, category: 'FCM', tags: ['Animation', 'Design'], thumbnailURL: 'https://picsum.photos/seed/fcm2/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', creatorId: 'mock', createdAt: new Date() }
  ],
  FOM: [
    { id: 'mock5', title: 'Business Management', description: 'Core concepts of business management.', creatorName: 'Dr. Tan', views: 900, likes: 80, dislikes: 0, category: 'FOM', tags: ['Business', 'Management'], thumbnailURL: 'https://picsum.photos/seed/fom1/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', creatorId: 'mock', createdAt: new Date() },
    { id: 'mock6', title: 'Marketing Strategies', description: 'Modern marketing strategies for startups.', creatorName: 'Alice Wong', views: 1100, likes: 120, dislikes: 1, category: 'FOM', tags: ['Marketing', 'Startup'], thumbnailURL: 'https://picsum.photos/seed/fom2/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', creatorId: 'mock', createdAt: new Date() }
  ],
  FOE: [
    { id: 'mock7', title: 'Circuit Design', description: 'Fundamentals of electronic circuit design.', creatorName: 'Ir. Kumar', views: 750, likes: 60, dislikes: 0, category: 'FOE', tags: ['Engineering', 'Circuits'], thumbnailURL: 'https://picsum.photos/seed/foe1/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', creatorId: 'mock', createdAt: new Date() },
    { id: 'mock8', title: 'Robotics Workshop', description: 'Hands-on robotics workshop highlights.', creatorName: 'Tech Club', views: 1800, likes: 250, dislikes: 4, category: 'FOE', tags: ['Robotics', 'Workshop'], thumbnailURL: 'https://picsum.photos/seed/foe2/800/450', videoURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', creatorId: 'mock', createdAt: new Date() }
  ]
};

const Search: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as SearchResultType | 'all') || 'all';
  const tagsParam = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [industryVideos, setIndustryVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(queryParam);
  
  const isInternal = !!user;
  
  const availableTags = useMemo(() => [
    "Fashion", "STyLE", "Event", "Merdeka", "Concert", "Mathematics", 
    "Calculus", "Lecture", "FCM", "FYP", "Showcase", "Diwali", 
    "Cultural", "Vlog", "Student Life", "FCI", "Python", 
    "Programming", "Tutorial", "Alumni", "Startup", "Success", 
    "Campus Tour", "Study Spots", "Cyberjaya", "CNY", "Lion Dance",
    "Industry", "Career", "Interview"
  ], []);

  const updateFilters = useCallback((updates: Record<string, string | string[] | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          newParams.set(key, value.join(','));
        } else {
          newParams.delete(key);
        }
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput || null });
  };

  useEffect(() => {
    if (!isInternal) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    const collectionsToFetch = [
      { name: 'videos', type: 'video' as const },
      { name: 'communityEvents', type: 'event' as const },
      { name: 'communityClubs', type: 'club' as const }
    ].filter(c => typeParam === 'all' || c.type === typeParam);

    const collectionResults: Record<string, UnifiedSearchResult[]> = {};
    let loadedCount = 0;

    collectionsToFetch.forEach(col => {
      const q = query(collection(db, col.name), limit(50));

      const unsub = onSnapshot(q, (snapshot) => {
        const colData = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            type: col.type,
            title: data.title || data.name || data.clubName || '',
            description: data.description || data.content || '',
            createdAt: data.createdAt,
            tags: data.tags || [],
            creatorName: data.creatorName || data.sellerName || '',
            ...data
          } as UnifiedSearchResult;
        });

        collectionResults[col.name] = colData;
        loadedCount++;
        
        if (loadedCount >= collectionsToFetch.length) {
          // Merge and hybrid filter
          const allResults = Object.values(collectionResults).flat();
          
          const filtered = allResults.filter(item => {
            const matchesTags = tagsParam.length === 0 || tagsParam.every(tag => 
              item.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
            );

            const searchStr = queryParam.toLowerCase();
            
            // Prioritize tags: if search string matches a tag, boost it.
            const matchesKeyword = !queryParam || 
              item.tags?.some(t => t.toLowerCase().includes(searchStr)) ||
              item.title.toLowerCase().includes(searchStr) || 
              item.description.toLowerCase().includes(searchStr) ||
              item.creatorName?.toLowerCase().includes(searchStr) ||
              (item.type === 'club' && item.clubName?.toLowerCase().includes(searchStr));

            return matchesTags && matchesKeyword;
          });

          // Sort by tag match first, then date
          const sorted = filtered.sort((a, b) => {
            const searchStr = queryParam.toLowerCase();
            const aHasTag = a.tags?.some(t => t.toLowerCase() === searchStr) ? 1 : 0;
            const bHasTag = b.tags?.some(t => t.toLowerCase() === searchStr) ? 1 : 0;
            
            if (aHasTag !== bHasTag) {
              return bHasTag - aHasTag; // Tag matches come first
            }

            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return (dateB || 0) - (dateA || 0);
          });

          setResults(sorted);
          setLoading(false);
        }
      }, (error) => {
        console.error(`Error fetching ${col.name}:`, error);
        handleFirestoreError(error, OperationType.LIST, col.name);
        loadedCount++;
        if (loadedCount >= collectionsToFetch.length) setLoading(false);
      });

      unsubscribes.push(unsub);
    });

    // Fetch Industry-ready videos (e.g., tagged with 'Industry')
    const industryQ = query(collection(db, 'videos'), where('tags', 'array-contains', 'Industry'), limit(4));
    const unsubIndustry = onSnapshot(industryQ, (snapshot) => {
      setIndustryVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoMetadata)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'videos');
    });
    unsubscribes.push(unsubIndustry);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [queryParam, typeParam, tagsParam.join(','), isInternal]);

  const toggleTag = (tag: string) => {
    const newTags = tagsParam.includes(tag) 
      ? tagsParam.filter(t => t !== tag) 
      : [...tagsParam, tag];
    updateFilters({ tags: newTags });
  };

  const filteredPublicVideos = useMemo(() => {
    if (!queryParam.trim()) return mockPublicVideos;
    const query = queryParam.toLowerCase();
    return {
      FCI: mockPublicVideos.FCI.filter(v => v.creatorName.toLowerCase().includes(query)),
      FCM: mockPublicVideos.FCM.filter(v => v.creatorName.toLowerCase().includes(query)),
      FOM: mockPublicVideos.FOM.filter(v => v.creatorName.toLowerCase().includes(query)),
      FOE: mockPublicVideos.FOE.filter(v => v.creatorName.toLowerCase().includes(query)),
    };
  }, [queryParam]);

  if (!isInternal) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16 min-h-screen">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            <MMUText text="Discover MMU" />
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore content from different faculties. Sign in to access the full search experience, industry-ready videos, and campus events.
          </p>
          
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full mt-8">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search creators by name..."
              className="w-full border-2 border-border rounded-2xl py-4 px-6 pl-14 focus:outline-none focus:border-primary transition-all bg-card text-foreground text-lg font-medium shadow-sm"
            />
            <SearchIcon className="absolute left-5 text-muted-foreground" size={24} />
            <button type="submit" className="absolute right-3 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              Search
            </button>
          </form>
        </div>

        <div className="space-y-16">
          {/* FCI Section */}
          {filteredPublicVideos.FCI.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-3 rounded-2xl">
                  <Cpu size={28} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Faculty of Computing and Informatics (FCI)</h2>
                  <p className="text-muted-foreground">Tech, programming, and computer science.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredPublicVideos.FCI.map(video => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* FCM Section */}
          {filteredPublicVideos.FCM.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/10 p-3 rounded-2xl">
                  <MonitorPlay size={28} className="text-purple-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Faculty of Creative Multimedia (FCM)</h2>
                  <p className="text-muted-foreground">Art, design, animation, and media.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredPublicVideos.FCM.map(video => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* FOM Section */}
          {filteredPublicVideos.FOM.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-3 rounded-2xl">
                  <Building2 size={28} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Faculty of Management (FOM)</h2>
                  <p className="text-muted-foreground">Business, finance, and marketing.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredPublicVideos.FOM.map(video => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* FOE Section */}
          {filteredPublicVideos.FOE.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/10 p-3 rounded-2xl">
                  <BookOpen size={28} className="text-orange-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Faculty of Engineering (FOE)</h2>
                  <p className="text-muted-foreground">Electronics, robotics, and telecommunications.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredPublicVideos.FOE.map(video => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {filteredPublicVideos.FCI.length === 0 && filteredPublicVideos.FCM.length === 0 && filteredPublicVideos.FOM.length === 0 && filteredPublicVideos.FOE.length === 0 && (
            <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchIcon size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-black mb-2">No creators found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find any creators matching "{queryParam}".
              </p>
              <button 
                onClick={() => updateFilters({ q: null })}
                className="mt-6 bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4 w-full lg:w-1/2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
            <SearchIcon size={14} />
            <span>Campus Search</span>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by tags, names, or keywords..."
              className="w-full border-2 border-border rounded-2xl py-4 px-6 pl-14 focus:outline-none focus:border-primary transition-all bg-card text-foreground text-lg font-medium shadow-sm"
            />
            <SearchIcon className="absolute left-5 text-muted-foreground" size={24} />
            <button type="submit" className="absolute right-3 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              Search
            </button>
          </form>

          <div className="flex items-center gap-3 text-muted-foreground font-medium">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
            </span>
            {tagsParam.length > 0 && (
              <span className="text-xs">• {tagsParam.length} filters active</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-2xl border border-border w-fit">
            {(['all', 'video', 'event', 'club'] as const).map((t) => (
              <button
                key={t}
                onClick={() => updateFilters({ type: t === 'all' ? null : t })}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  typeParam === t 
                    ? "bg-card text-foreground shadow-sm border border-border" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Industry Ready Videos Section */}
      {industryVideos.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Industry-Ready Content</h2>
              <p className="text-muted-foreground text-sm">Curated by staff to prepare you for the workforce.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industryVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-primary" />
                Filters
              </h3>
              {(tagsParam.length > 0 || typeParam !== 'all') && (
                <button 
                  onClick={() => updateFilters({ tags: null, type: null })}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Popular Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1.5",
                      tagsParam.includes(tag)
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                        : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                    )}
                  >
                    <Tag size={10} />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <main className="lg:col-span-9">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={48} />
              <p className="text-muted-foreground font-bold">Searching campus...</p>
            </div>
          ) : results.length > 0 ? (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {results.map((result) => (
                  <SearchCard key={`${result.type}-${result.id}`} result={result} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <SearchIcon size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-black mb-2">No results found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find anything matching your search. Try adjusting your filters or using different keywords.
              </p>
              <button 
                onClick={() => updateFilters({ q: null, tags: null, type: null })}
                className="mt-6 bg-primary text-white px-6 py-2 rounded-full font-bold hover:bg-primary/90 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Search;
