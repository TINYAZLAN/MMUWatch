import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthProvider';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Search, Loader2, Navigation, Clock, Bookmark, ChevronDown, ChevronUp, Tag, Heart, PlayCircle, Briefcase, GraduationCap, Building2, MapPin, Search as SearchIcon, Users, Calendar, AlignLeft, Filter, SlidersHorizontal, Trash2 } from 'lucide-react';
import { VideoMetadata, UnifiedSearchResult } from '../types';
import { cn } from '../lib/utils';
import { MMULoading } from '../components/MMULoading';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface SavedSearch {
  id: string;
  keyword: string;
  filters: any;
  createdAt: any;
}

interface RecentSearch {
  id: string;
  keyword: string;
  type: string;
  createdAt: any;
}

const UserSearch: React.FC = () => {
  const { user, profile } = useAuth();
  
  const [searchInput, setSearchInput] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  
  const [activeFaculties, setActiveFaculties] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeDurations, setActiveDurations] = useState<string[]>([]);
  
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<UnifiedSearchResult[]>([]);
  
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Fixed Options
  const FACULTIES = ['FIST', 'FET', 'FOL', 'FOB', 'FCM', 'FCI'];
  const CONTENT_TYPES = ['Tutorial', 'Project', 'Event', 'Student Sharing', 'Lecture', 'Vlog', 'Interview'];
  const DURATIONS = ['< 5 min', '5 – 20 min', '20 – 60 min', '> 1 hour'];

  useEffect(() => {
    if (!user) return;
    
    // Load Recent
    const qRecent = query(collection(db, 'searchHistory'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
    const unsubRecent = onSnapshot(qRecent, snap => {
      setRecentSearches(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecentSearch)));
    });

    // Load Saved
    const qSaved = query(collection(db, 'savedSearches'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
    const unsubSaved = onSnapshot(qSaved, snap => {
      setSavedSearches(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedSearch)));
    });

    return () => {
      unsubRecent();
      unsubSaved();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Personalized Suggestions load initially
    const fetchSuggestions = async () => {
      try {
        const q = query(collection(db, 'videos'), limit(8));
        const res = await getDocs(q);
        const data = res.docs.map(d => ({ id: d.id, type: 'video', ...d.data() } as UnifiedSearchResult));
        
        // simple shuffle for demo
        const shuffled = data.sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 4));
      } catch (err) {
        console.error("Error fetching suggestions", err);
      }
    };
    fetchSuggestions();
  }, [user]);

  const toggleArrayItem = (arr: string[], item: string, setter: any) => {
    setter(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    performSearch(searchInput, creatorFilter, eventFilter, activeFaculties, activeTypes, activeDurations);
    
    if (searchInput.trim() || creatorFilter.trim() || eventFilter.trim()) {
      addDoc(collection(db, 'searchHistory'), {
        userId: user.uid,
        keyword: searchInput || creatorFilter || eventFilter,
        type: 'General',
        createdAt: serverTimestamp()
      });
    }
  };

  const performSearch = async (
    qInput: string, 
    creator: string, 
    eventF: string, 
    facs: string[], 
    types: string[], 
    durs: string[]
  ) => {
    setLoading(true);
    try {
      // 1. Fetch videos
      const videosQ = query(collection(db, 'videos'), limit(60));
      const videosSnap = await getDocs(videosQ);
      const videos = videosSnap.docs.map(doc => ({ id: doc.id, type: 'video', ...doc.data() } as UnifiedSearchResult));

      // 2. Fetch events
      const eventsQ = query(collection(db, 'communityEvents'), limit(20));
      const eventsSnap = await getDocs(eventsQ);
      const events = eventsSnap.docs.map(doc => ({ id: doc.id, type: 'event', ...doc.data() } as UnifiedSearchResult));

      let combined = [...videos, ...events];

      // APPLY FILTERS
      if (qInput) {
        const lowerQ = qInput.toLowerCase();
        combined = combined.filter(c => 
          c.title?.toLowerCase().includes(lowerQ) || 
          c.description?.toLowerCase().includes(lowerQ) ||
          c.tags?.some((t: string) => t.toLowerCase().includes(lowerQ))
        );
      }
      
      if (creator) {
        combined = combined.filter(c => c.creatorName?.toLowerCase().includes(creator.toLowerCase()));
      }

      if (eventF) {
        // filter elements matching event filter (tags, title)
        combined = combined.filter(c => 
          c.title?.toLowerCase().includes(eventF.toLowerCase()) ||
          c.tags?.some((t: string) => t.toLowerCase().includes(eventF.toLowerCase()))
        );
      }

      if (facs.length > 0) {
        combined = combined.filter(c => {
          // If the c object has creatorFaculty or just falls into active types
          if ((c as any).creatorFaculty) return facs.includes((c as any).creatorFaculty);
          return false;
        });
      }

      if (types.length > 0) {
        combined = combined.filter(c => types.includes((c as any).category || c.type));
      }

      if (durs.length > 0) {
        combined = combined.filter(c => {
          if (c.type !== 'video') return false; // purely length based for video
          const d = (c as any).duration || 0;
          let matched = false;
          if (durs.includes('< 5 min') && d < 300) matched = true;
          if (durs.includes('5 – 20 min') && d >= 300 && d <= 1200) matched = true;
          if (durs.includes('20 – 60 min') && d > 1200 && d <= 3600) matched = true;
          if (durs.includes('> 1 hour') && d > 3600) matched = true;
          return matched || !d; // if no duration, bypass for now 
        });
      }

      setResults(combined);
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!user) return;
    if (!searchInput && !creatorFilter && activeFaculties.length === 0 && activeTypes.length === 0) {
      toast.error('Nothing to save. Add some filters or keywords.');
      return;
    }
    await addDoc(collection(db, 'savedSearches'), {
      userId: user.uid,
      keyword: searchInput,
      filters: {
        creatorFilter, eventFilter, activeFaculties, activeTypes, activeDurations
      },
      createdAt: serverTimestamp()
    });
    toast.success('Search context saved!');
  };

  const clearHistory = async () => {
    if (!user) return;
    const qRecent = query(collection(db, 'searchHistory'), where('userId', '==', user.uid));
    const snap = await getDocs(qRecent);
    snap.docs.forEach(d => deleteDoc(d.ref));
    toast.success('Search history cleared');
  };

  const applySavedSearch = (s: SavedSearch) => {
    setSearchInput(s.keyword || '');
    setCreatorFilter(s.filters?.creatorFilter || '');
    setEventFilter(s.filters?.eventFilter || '');
    setActiveFaculties(s.filters?.activeFaculties || []);
    setActiveTypes(s.filters?.activeTypes || []);
    setActiveDurations(s.filters?.activeDurations || []);
    performSearch(s.keyword || '', s.filters?.creatorFilter || '', s.filters?.eventFilter || '', s.filters?.activeFaculties || [], s.filters?.activeTypes || [], s.filters?.activeDurations || []);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-10 min-h-screen bg-transparent">
      
      {/* HEADER -> SEARCH TOOLBAR -> QUICK FILTERS */}
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">Discover</h1>
          <p className="text-muted-foreground font-medium text-lg">Search tutorials, projects, events, and campus updates.</p>
        </div>

        <div className="bg-card border border-border shadow-md rounded-2xl p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-4">
            
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder="Search tutorials, projects, events, lectures..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-muted/50 border border-transparent focus:border-primary/50 focus:bg-background rounded-xl py-3 px-12 text-base font-medium outline-none transition-all"
              />
            </div>

            <div className="flex gap-4">
              <input 
                type="text" 
                placeholder="Creator (e.g. Azlan)" 
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                className="lg:w-48 bg-muted/50 border border-transparent focus:border-primary/50 focus:bg-background rounded-xl py-3 px-4 text-sm font-medium outline-none transition-all"
              />
              <input 
                type="text" 
                placeholder="Event (e.g. VinHack)" 
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="lg:w-48 bg-muted/50 border border-transparent focus:border-primary/50 focus:bg-background rounded-xl py-3 px-4 text-sm font-medium outline-none transition-all"
              />
              <button type="submit" className="bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/20 transition-all">
                Search
              </button>
            </div>
          </form>

          {/* Quick Filters */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border rounded-full font-bold transition-all",
                  isAdvancedOpen ? "bg-primary/10 text-primary border-primary/20" : "bg-card hover:bg-muted text-muted-foreground border-border"
                )}
              >
                <SlidersHorizontal size={14} />
                Advanced Filter
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (profile?.faculty) {
                    setActiveFaculties([...activeFaculties, profile.faculty]);
                    handleSearchSubmit();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 border rounded-full font-bold transition-all bg-card hover:bg-muted text-muted-foreground border-border"
              >
                <GraduationCap size={14} />
                Search Within My Faculty
              </button>
            </div>
            
            <button 
              onClick={handleSaveSearch}
              className="flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all hover:bg-primary/5 text-primary"
            >
              <Bookmark size={14} />
              Save Search
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* FACETED FILTER PANEL & HISTORY */}
        <div className="lg:col-span-1 space-y-6">
          <AnimatePresence>
            {isAdvancedOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-6">
                  
                  {/* Faculty Filter */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Faculty</h4>
                    <div className="flex flex-wrap gap-2">
                      {FACULTIES.map(fac => (
                        <button
                          key={fac}
                          onClick={() => toggleArrayItem(activeFaculties, fac, setActiveFaculties)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            activeFaculties.includes(fac)
                              ? "bg-primary border-primary text-white"
                              : "bg-transparent border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          {fac}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content Type Filter */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Content Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {CONTENT_TYPES.map(type => (
                        <button
                          key={type}
                          onClick={() => toggleArrayItem(activeTypes, type, setActiveTypes)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            activeTypes.includes(type)
                              ? "bg-primary border-primary text-white"
                              : "bg-transparent border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Filters */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Duration</h4>
                    <div className="flex flex-wrap gap-2">
                      {DURATIONS.map(dur => (
                        <button
                          key={dur}
                          onClick={() => toggleArrayItem(activeDurations, dur, setActiveDurations)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            activeDurations.includes(dur)
                              ? "bg-primary border-primary text-white"
                              : "bg-transparent border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          <Clock size={12} className="inline mr-1" />
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* RECENT SEARCHES */}
          {recentSearches.length > 0 && (
            <div className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  Recent Searches
                </h3>
                <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-red-500 font-bold transition-colors">
                  Clear
                </button>
              </div>
              <ul className="space-y-3">
                {recentSearches.map(r => (
                  <li key={r.id} className="flex flex-col gap-1">
                    <button 
                      onClick={() => {
                        setSearchInput(r.keyword);
                        performSearch(r.keyword, '', '', [], [], []);
                      }}
                      className="text-left font-semibold text-foreground hover:text-primary transition-colors hover:underline w-fit"
                    >
                      {r.keyword}
                    </button>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                      {r.createdAt?.toDate ? formatDistanceToNow(r.createdAt.toDate()) + ' ago' : 'Just now'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SAVED SEARCHES */}
          {savedSearches.length > 0 && (
            <div className="bg-card border border-border shadow-sm rounded-2xl p-5 space-y-4">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-blue-500">
                <Bookmark size={16} />
                Saved Searches
              </h3>
              <ul className="space-y-3">
                {savedSearches.map(s => (
                  <li key={s.id} className="flex items-center justify-between group">
                    <button 
                      onClick={() => applySavedSearch(s)}
                      className="text-left font-semibold text-foreground hover:text-blue-500 transition-colors truncate max-w-[80%]"
                    >
                      {s.keyword || 'Filtered Search'}
                    </button>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'savedSearches', s.id))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* SEARCH RESULTS / RECOMMENDED */}
        <div className="lg:col-span-3 space-y-8">
          
          {loading ? (
            <MMULoading text="Discovering the best content..." size="md" />
          ) : results.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-xl font-black">Search Results ({results.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {results.map(r => (
                  <ModernResultCard key={r.id + r.type} result={r} />
                ))}
              </div>
            </div>
          ) : searchInput || activeFaculties.length > 0 || activeTypes.length > 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border border-border">
              <div className="bg-background w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-border">
                <SearchIcon size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-xl font-black mb-2">No exact matches found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try adjusting your filters, using simpler keywords, or expanding your search to all faculties.
              </p>
            </div>
          ) : (
            // RECOMMENDED SECTION WHEN EMPTY
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <Heart className="text-red-500 fill-red-500" size={24} />
                  Recommended For You
                </h2>
                {profile?.faculty && (
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-primary">
                    Popular in {profile.faculty}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {suggestions.map(s => (
                  <ModernResultCard key={s.id + s.type} result={s} />
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// MODERN RESULT CARD
// ----------------------------------------------------------------------------
const ModernResultCard: React.FC<{ result: UnifiedSearchResult }> = ({ result }) => {
  
  const isVideo = result.type === 'video';
  const itemLink = isVideo ? `/watch/${result.id}` : result.type === 'event' ? '/explore' : '/community';
  
  return (
    <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full relative cursor-pointer">
      <Link to={itemLink} className="block flex-none relative">
        <div className="aspect-video w-full bg-muted overflow-hidden">
          <img 
            src={result.thumbnailURL || result.imageURL || `https://picsum.photos/seed/${result.id}/800/450`} 
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md backdrop-blur-md text-white line-clamp-1",
            isVideo ? "bg-red-600/90" : "bg-blue-600/90"
          )}>
            {result.category || result.type}
          </span>
        </div>

        {/* Duration / Date Badge Base-Right */}
        <div className="absolute bottom-3 right-3">
          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-black/80 text-white backdrop-blur-md">
            {isVideo && (result as any).duration 
              ? `${Math.floor((result as any).duration / 60)}:${((result as any).duration % 60).toString().padStart(2, '0')}` 
              : result.createdAt?.toDate ? formatDistanceToNow(result.createdAt.toDate()) + ' ago' : 'Recently'}
          </span>
        </div>
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1 space-y-2">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <span className="flex items-center gap-1.5 truncate max-w-[60%]">
              {isVideo ? <Users size={12}/> : <Building2 size={12}/>}
              <span className="truncate">{result.creatorName || result.clubName || 'Unknown'}</span>
            </span>
            {(result as any).creatorFaculty && (
              <span className="flex items-center gap-1.5 text-primary">
                <GraduationCap size={12} />
                {(result as any).creatorFaculty}
              </span>
            )}
          </div>

          <Link to={itemLink} className="block">
            <h3 className="font-extrabold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {result.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {result.description || result.content}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs font-bold text-muted-foreground">
          {isVideo && (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><PlayCircle size={14}/> {(result as any).views || 0} views</span>
            </div>
          )}
          {result.tags && result.tags.length > 0 && (
             <span className="flex items-center gap-1 text-primary max-w-[120px] truncate">
               <Tag size={12}/>
               #{result.tags[0]}
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
