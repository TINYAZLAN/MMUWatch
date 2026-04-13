import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, limit, onSnapshot, orderBy, startAfter, QueryDocumentSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UnifiedSearchResult, SearchResultType } from '../types';
import VideoCard from '../components/VideoCard';
import { Search as SearchIcon, Filter, X, Loader2, Compass, Calendar, Users, Play, Tag, ChevronRight, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const SearchCard: React.FC<{ result: UnifiedSearchResult }> = ({ result }) => {
  if (result.type === 'video') {
    return <VideoCard video={result as any} />;
  }

  const getLink = () => {
    if (result.type === 'event') return '/explore';
    if (result.type === 'club') return '/clubs';
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

const Search: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as SearchResultType | 'all') || 'all';
  const tagsParam = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCollections, setLoadedCollections] = useState<Set<string>>(new Set());
  const [isFiltering, setIsFiltering] = useState(false);
  
  const availableTags = useMemo(() => [
    "Fashion", "STyLE", "Event", "Merdeka", "Concert", "Mathematics", 
    "Calculus", "Lecture", "FCM", "FYP", "Showcase", "Diwali", 
    "Cultural", "Vlog", "Student Life", "FCI", "Python", 
    "Programming", "Tutorial", "Alumni", "Startup", "Success", 
    "Campus Tour", "Study Spots", "Cyberjaya", "CNY", "Lion Dance"
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

  useEffect(() => {
    setLoading(true);
    setLoadedCollections(new Set());
    const unsubscribes: (() => void)[] = [];

    const collectionsToFetch = [
      { name: 'videos', type: 'video' as const },
      { name: 'events', type: 'event' as const },
      { name: 'clubPosts', type: 'club' as const }
    ].filter(c => typeParam === 'all' || c.type === typeParam);

    const collectionResults: Record<string, UnifiedSearchResult[]> = {};

    collectionsToFetch.forEach(col => {
      let q = query(collection(db, col.name), limit(50));

      if (tagsParam.length > 0) {
        q = query(collection(db, col.name), where('tags', 'array-contains-any', tagsParam.slice(0, 10)), limit(50));
      }

      const unsub = onSnapshot(q, (snapshot) => {
        const colData = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            type: col.type,
            title: data.title || data.clubName || '',
            description: data.description || data.content || '',
            createdAt: data.createdAt,
            tags: data.tags || [],
            ...data
          } as UnifiedSearchResult;
        });

        collectionResults[col.name] = colData;
        
        // Update loaded collections
        setLoadedCollections(prev => {
          const next = new Set(prev);
          next.add(col.name);
          
          // Check if all requested collections have loaded at least once
          if (next.size === collectionsToFetch.length) {
            setLoading(false);
          }
          return next;
        });

        // Merge and hybrid filter
        const allResults = Object.values(collectionResults).flat();
        
        const filtered = allResults.filter(item => {
          const matchesTags = tagsParam.length === 0 || tagsParam.every(tag => 
            item.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
          );

          const searchStr = queryParam.toLowerCase();
          const matchesKeyword = !queryParam || 
            item.title.toLowerCase().includes(searchStr) || 
            item.description.toLowerCase().includes(searchStr) ||
            item.tags?.some(t => t.toLowerCase().includes(searchStr)) ||
            (item.type === 'club' && item.clubName?.toLowerCase().includes(searchStr));

          return matchesTags && matchesKeyword;
        });

        const sorted = filtered.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
          return (dateB || 0) - (dateA || 0);
        });

        setResults(sorted);
      }, (error) => {
        console.error(`Error fetching ${col.name}:`, error);
        setLoadedCollections(prev => {
          const next = new Set(prev);
          next.add(col.name);
          if (next.size === collectionsToFetch.length) {
            setLoading(false);
          }
          return next;
        });
      });

      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [queryParam, typeParam, tagsParam.join(',')]);

  const toggleTag = (tag: string) => {
    const newTags = tagsParam.includes(tag) 
      ? tagsParam.filter(t => t !== tag) 
      : [...tagsParam, tag];
    updateFilters({ tags: newTags });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Search Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.2em] text-xs">
            <SearchIcon size={14} />
            <span>Campus Search</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            {queryParam ? (
              <>Results for <span className="text-primary">"{queryParam}"</span></>
            ) : (
              'Explore MMU'
            )}
          </h1>
          <div className="flex items-center gap-3 text-muted-foreground font-medium">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
            </span>
            {tagsParam.length > 0 && (
              <span className="text-xs">• {tagsParam.length} filters active</span>
            )}
          </div>
        </div>
        
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6 sticky top-24">
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

            <div className="pt-6 border-t border-border">
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Pro Tip</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Combine multiple tags to narrow down your search. We use strict filtering to find exactly what you need.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <main className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6 bg-card rounded-3xl border border-border border-dashed">
              <div className="relative">
                <Loader2 className="animate-spin text-primary" size={48} />
                <SearchIcon className="absolute inset-0 m-auto text-primary/20" size={20} />
              </div>
              <div className="text-center">
                <p className="text-lg font-black tracking-tight">Searching the campus...</p>
                <p className="text-sm text-muted-foreground">Scanning videos, events, and clubs</p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {results.map(result => (
                  <SearchCard key={`${result.type}-${result.id}`} result={result} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center bg-card rounded-3xl border border-border border-dashed space-y-6"
            >
              <div className="bg-muted p-8 rounded-full">
                <Compass size={64} className="text-muted-foreground/20" />
              </div>
              <div className="space-y-2 max-w-md mx-auto px-6">
                <h3 className="text-2xl font-black tracking-tight">No results found</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We couldn't find anything matching your filters. Try removing some tags or searching for something else.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={() => updateFilters({ tags: null, type: null })}
                  className="bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
                >
                  Clear All Filters
                </button>
                <Link to="/" className="bg-muted text-foreground px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-muted/80 transition-all">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Search;
