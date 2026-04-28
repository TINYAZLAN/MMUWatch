import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { LeftSidebar } from '../components/community/LeftSidebar';
import { RightSidebar } from '../components/community/RightSidebar';
import { PostCard } from '../components/community/PostCard';
import { CreatePostBox } from '../components/community/CreatePostBox';
import { MMUText } from '../components/MMUText';
import { useAuth } from '../AuthProvider';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, where, documentId, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Community: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState('home');
  const [activeFeed, setActiveFeed] = useState<'latest' | 'trending'>('latest');
  const [postsLimit, setPostsLimit] = useState(10);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const [posts, setPosts] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [latestEvent, setLatestEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [clubs, setClubs] = useState<any[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [isSubmittingClub, setIsSubmittingClub] = useState(false);

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  useEffect(() => {
    if (activeItem === 'trending') {
      setActiveFeed('trending');
      setActiveTag(null);
    } else if (activeItem === 'home') {
      setActiveFeed('latest');
      setActiveTag(null);
    } else if (activeItem === 'clubs') {
      // Load clubs
      setClubsLoading(true);
      const unsub = onSnapshot(query(collection(db, 'communityClubs'), orderBy('createdAt', 'desc')), snap => {
        setClubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setClubsLoading(false);
      }, error => handleFirestoreError(error, OperationType.LIST, 'communityClubs'));
      return () => unsub();
    }
  }, [activeItem]);

  useEffect(() => {
    // Fetch latest event for banner
    const eventQ = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(1));
    const unsubEvent = onSnapshot(eventQ, snapshot => {
      if (!snapshot.empty) {
        setLatestEvent({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    }, error => handleFirestoreError(error, OperationType.LIST, 'events'));

    // Fetch actual friends
    if (profile?.friends && profile.friends.length > 0) {
      // Split into chunks if > 10, but let's just get the first 10 for sidebar
      const friendIds = profile.friends.slice(0, 10);
      const usersQ = query(collection(db, 'users'), where(documentId(), 'in', friendIds));
      const unsubUsers = onSnapshot(usersQ, snapshot => {
        setOnlineUsers(snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.username || data.displayName || 'User',
            avatar: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || doc.id}`
          };
        }));
      });
      return () => {
        unsubEvent();
        unsubUsers();
      };
    } else {
      setOnlineUsers([]);
      return () => unsubEvent();
    }
  }, [profile?.friends]);

  useEffect(() => {
    if (activeItem === 'clubs') return;
    
    setLoading(true);
    let q;
    if (activeTag) {
      q = query(collection(db, 'communityPosts'), where('tags', 'array-contains', activeTag), orderBy('createdAt', 'desc'), limit(postsLimit));
    } else if (activeFeed === 'latest') {
      q = query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'), limit(postsLimit));
    } else {
      q = query(collection(db, 'communityPosts'), orderBy('upvotes', 'desc'), limit(postsLimit));
    }

    const unsubPosts = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, error => handleFirestoreError(error, OperationType.LIST, 'communityPosts'));

    return () => unsubPosts();
  }, [activeFeed, postsLimit, activeTag, activeItem]);

  const handleDeletePost = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteDoc(doc(db, 'communityPosts', id));
        toast.success("Post deleted");
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete post");
      }
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim() || !newClubDesc.trim()) return;
    setIsSubmittingClub(true);
    try {
      await addDoc(collection(db, 'communityClubs'), {
        name: newClubName,
        description: newClubDesc,
        createdAt: serverTimestamp(),
      });
      setNewClubName('');
      setNewClubDesc('');
      setIsCreatingClub(false);
      toast.success("Club created!");
    } catch (error) {
       console.error(error);
       toast.error("Failed to create club");
    } finally {
       setIsSubmittingClub(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* Top Header / Pinned Announcement - Pushing below main nav */}
      {latestEvent && (
        <div className="bg-gradient-to-r from-primary/20 via-[#0f1115] to-[#0f1115] border-b border-primary/20 py-2 relative overflow-hidden hidden md:block">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          <div className="max-w-[1400px] mx-auto px-6 lg:px-10 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-primary text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">Live</span>
              <p className="text-white/80 font-medium whitespace-nowrap overflow-hidden text-ellipsis"><span className="text-white font-bold">{latestEvent.title}</span> is coming up. Don't miss out!</p>
            </div>
            <button onClick={() => navigate('/explore')} className="text-primary hover:text-white font-bold transition-colors">See Event &rarr;</button>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 lg:pt-8 flex gap-8">
        
        {/* Left Column (Navigation) */}
        <LeftSidebar activeItem={activeItem} setActiveItem={setActiveItem} onlineUsers={onlineUsers} />

        {/* Middle Column (Feed) */}
        <main className="flex-1 max-w-[700px] mx-auto w-full pb-20">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                <Sparkles className="text-primary filling-primary animate-pulse" />
                Community
              </h1>
              <p className="text-muted-foreground font-medium mt-1"><MMUText text="Connect, share, and discover at MMU." /></p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeItem === 'clubs' && isAdmin && (
                <button onClick={() => setIsCreatingClub(!isCreatingClub)} className="bg-primary text-white text-xs px-4 py-2 font-bold rounded-lg shadow-lg">
                  {isCreatingClub ? 'Cancel' : '+ Create Club'}
                </button>
              )}
              <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-white transition-all relative">
                <Search size={18} />
              </button>
            </div>
          </div>

          {activeItem === 'clubs' ? (
             <div className="space-y-4">
               <h2 className="text-xl font-bold text-white mb-4">All Clubs</h2>
               
               {isCreatingClub && (
                 <form onSubmit={handleCreateClub} className="bg-[#0f1115] border border-primary/30 rounded-[1.5rem] p-5 mb-6">
                   <h3 className="font-bold text-white mb-4">Create New Club</h3>
                   <input
                     type="text"
                     placeholder="Club Name"
                     value={newClubName}
                     onChange={e => setNewClubName(e.target.value)}
                     className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-primary focus:outline-none mb-3"
                     required
                   />
                   <textarea
                     placeholder="Club Description"
                     value={newClubDesc}
                     onChange={e => setNewClubDesc(e.target.value)}
                     className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-primary focus:outline-none mb-4 resize-none"
                     rows={3}
                     required
                   />
                   <button
                     type="submit"
                     disabled={isSubmittingClub}
                     className="bg-primary text-white px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2"
                   >
                     {isSubmittingClub && <Loader2 className="animate-spin" size={16} />}
                     Create
                   </button>
                 </form>
               )}

               {clubsLoading ? (
                 <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
               ) : clubs.length > 0 ? (
                 clubs.map(club => (
                   <div key={club.id} className="bg-[#0f1115] border border-white/5 rounded-[1.5rem] p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 text-xl font-black text-white">
                         {club.name.charAt(0)}
                       </div>
                       <div>
                         <h3 className="font-bold text-white text-lg">{club.name}</h3>
                         <p className="text-sm text-muted-foreground line-clamp-1">{club.description || 'A great club to join.'}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-xs text-muted-foreground bg-white/5 px-3 py-2 rounded-lg max-w-[200px] line-clamp-2">
                           <span className="font-bold text-white block mb-1">Latest Post:</span>
                           {club.latestPostTitle || "Welcome to the club!"}
                        </div>
                        <button 
                          onClick={() => toast.success(`Added ${club.name} to chats!`)}
                          className="bg-primary/20 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap"
                        >
                          Join Club
                        </button>
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-10 text-muted-foreground">No clubs found.</div>
               )}
             </div>
          ) : (
            <>
              <CreatePostBox />

              {/* Feed Toggles */}
              <div className="flex items-center gap-6 mt-8 mb-6 border-b border-white/5 pb-2 relative">
                {activeTag ? (
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
                      #{activeTag}
                    </span>
                    <button 
                      onClick={() => setActiveTag(null)}
                      className="text-xs text-muted-foreground hover:text-white flex items-center gap-1"
                    >
                      <X size={14} /> Clear Filter
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => { setActiveFeed('latest'); setPostsLimit(10); }}
                      className={`pb-2 text-sm font-bold transition-all relative ${activeFeed === 'latest' ? 'text-white' : 'text-muted-foreground hover:text-white/80'}`}
                    >
                      Latest Posts
                      {activeFeed === 'latest' && <span className="absolute bottom-[-9px] left-0 w-full h-[3px] bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.5)]"></span>}
                    </button>
                    <button 
                      onClick={() => { setActiveFeed('trending'); setPostsLimit(10); }}
                      className={`pb-2 text-sm font-bold transition-all relative ${activeFeed === 'trending' ? 'text-white' : 'text-muted-foreground hover:text-white/80'}`}
                    >
                      Trending Feed
                      {activeFeed === 'trending' && <span className="absolute bottom-[-9px] left-0 w-full h-[3px] bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(var(--primary),0.5)]"></span>}
                    </button>
                  </>
                )}
              </div>

              {/* Post Feed */}
              <div className="space-y-6 flex flex-col">
                {loading && posts.length === 0 ? (
                  <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>
                ) : posts.length > 0 ? (
                  posts.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onDelete={handleDeletePost} 
                      canDelete={isAdmin || post.creatorId === user?.uid} 
                      onTagClick={(tag) => { setActiveTag(tag); setPostsLimit(10); }}
                    />
                  ))
                ) : (
                  <div className="py-20 text-center text-muted-foreground">No posts found.</div>
                )}
                
                {posts.length >= postsLimit && (
                  <button 
                    onClick={() => setPostsLimit(prev => prev + 10)}
                    className="mx-auto mt-6 px-6 py-2 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 rounded-full text-sm font-bold transition-all"
                  >
                    Load More
                  </button>
                )}

                {/* End of feed indicator */}
                {!loading && posts.length < postsLimit && posts.length > 0 && (
                  <div className="py-10 text-center mt-4">
                    <div className="w-16 h-1 bg-white/5 mx-auto rounded-full mb-4"></div>
                    <p className="text-muted-foreground text-sm font-medium">You've reached the end of the feed.</p>
                  </div>
                )}
              </div>
            </>
          )}

        </main>

        {/* Right Column (Widgets) */}
        <RightSidebar />
        
      </div>
    </div>
  );
};

export default Community;
