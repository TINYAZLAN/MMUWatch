import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { LeftSidebar } from '../components/community/LeftSidebar';
import { RightSidebar } from '../components/community/RightSidebar';
import { PostCard } from '../components/community/PostCard';
import { CreatePostBox } from '../components/community/CreatePostBox';
import { MMUText } from '../components/MMUText';
import { useAuth } from '../AuthProvider';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc, where, documentId, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { LoungeMiddle } from '../components/community/lounge/LoungeMiddle';
import { LoungeRightSidebar } from '../components/community/lounge/LoungeRightSidebar';

const Community: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState('home');
  const [activeFeed, setActiveFeed] = useState<'latest' | 'trending'>('latest');
  const [postsLimit, setPostsLimit] = useState(10);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  
  const [posts, setPosts] = useState<any[]>([]);

  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const postId = searchParams.get('post');
    if (postId && !hasScrolledRef.current && posts.some(p => p.id === postId)) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-[#050505]');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-[#050505]');
          }, 2000);
        }
      }, 500);
    }
  }, [posts, location.search]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [latestEvent, setLatestEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [clubs, setClubs] = useState<any[]>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [isSubmittingClub, setIsSubmittingClub] = useState(false);
  const [editingClubId, setEditingClubId] = useState<string | null>(null);
  const [editClubName, setEditClubName] = useState('');
  const [editClubDesc, setEditClubDesc] = useState('');
  const [editClubEmoji, setEditClubEmoji] = useState('');
  const [editClubBg, setEditClubBg] = useState('');
  const [editClubFont, setEditClubFont] = useState('');

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  const handleJoinClub = async (clubId: string, clubName: string) => {
    if (!user) return;
    try {
      const currentJoined = profile?.joinedClubs || [];
      if (!currentJoined.includes(clubName)) { // Storing club name in subjects/joinedClubs usually
        await setDoc(doc(db, 'users', user.uid), {
          joinedClubs: [...currentJoined, clubName]
        }, { merge: true });
        toast.success(`Joined ${clubName}! Added to your chats.`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to join club.');
    }
  };

  const handleUpdateClub = async (clubId: string) => {
    try {
      await setDoc(doc(db, 'communityClubs', clubId), {
        name: editClubName,
        description: editClubDesc,
        emoji: editClubEmoji,
        bg: editClubBg,
        font: editClubFont
      }, { merge: true });
      setEditingClubId(null);
      toast.success('Club updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update club.');
    }
  };

  const handleUploadClubPost = () => {
    // We could just navigate to a custom post form or just show a toast for now if we don't have a specific UI.
    // The instructions say "Add a function for admin to "Upload Post" under each club section."
    toast.success('Upload post feature clicked - implementation ready for modal.');
  };

  useEffect(() => {
    if (activeItem === 'friends') {
      // It's the lounge, we handle fetching inside the lounge components
    } else if (activeItem === 'trending') {
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
      // For LoungeRightSidebar, we probably need all, but we can pass all friend IDs there
      const friendIds = profile.friends.slice(0, 10);
      const usersQ = query(collection(db, 'users'), where(documentId(), 'in', friendIds));
      const unsubUsers = onSnapshot(usersQ, snapshot => {
        setOnlineUsers(snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.username || data.displayName || 'User',
            avatar: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || doc.id}`,
            isOnline: data.isOnline !== undefined ? data.isOnline : true
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
    if (activeItem === 'clubs' || activeItem === 'friends') return;
    
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

        {/* Middle Column (Feed / Lounge) */}
        <main className={`flex-1 ${activeItem === 'friends' ? 'w-full max-w-full' : 'max-w-[700px]'} mx-auto w-full pb-20 h-[calc(100vh-80px)] overflow-y-auto hidden-scrollbar`}>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                <Sparkles className="text-primary filling-primary animate-pulse" />
                {activeItem === 'friends' ? 'Student Lounge' : 'Community'}
              </h1>
              <p className="text-muted-foreground font-medium mt-1">
                <MMUText text={activeItem === 'friends' ? "Hangout and chat with peers, clubs and your class!" : "Connect, share, and discover at MMU."} />
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {activeItem === 'clubs' && isAdmin && (
                <button onClick={() => setIsCreatingClub(!isCreatingClub)} className="bg-primary text-white text-xs px-4 py-2 font-bold rounded-lg shadow-lg">
                  {isCreatingClub ? 'Cancel' : '+ Create Club'}
                </button>
              )}
              {activeItem !== 'friends' && (
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:bg-white/10 hover:text-white transition-all relative">
                  <Search size={18} />
                </button>
              )}
            </div>
          </div>

          {activeItem === 'friends' ? (
            <LoungeMiddle user={user!} profile={profile!} />
          ) : activeItem === 'clubs' ? (
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
                 clubs.map(club => {
                   const isManagingClub = isAdmin || (profile?.subjects || []).includes(club.name);
                   const isJoined = (profile?.joinedClubs || []).includes(club.name);
                   return (
                   <div key={club.id} className="bg-[#0f1115] border border-white/5 rounded-[1.5rem] p-5 shadow-2xl flex flex-col gap-4">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <div className="flex items-center gap-4 flex-1">
                         <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20 text-xl font-black text-white shrink-0">
                           {club.emoji || club.name.charAt(0)}
                         </div>
                         <div className="flex-1">
                           {editingClubId === club.id ? (
                             <div className="flex flex-col gap-2 w-full pr-4">
                               <input placeholder="Club Name" value={editClubName} onChange={e => setEditClubName(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:border-primary focus:outline-none" />
                               <textarea placeholder="Club Description" value={editClubDesc} onChange={e => setEditClubDesc(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:border-primary focus:outline-none resize-none" rows={2} />
                               <div className="grid grid-cols-3 gap-2">
                                 <input placeholder="Emoji (e.g. 🚀)" value={editClubEmoji} onChange={e => setEditClubEmoji(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:border-primary focus:outline-none" />
                                 <input placeholder="BG color class (e.g. bg-blue-600)" value={editClubBg} onChange={e => setEditClubBg(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:border-primary focus:outline-none" />
                                 <input placeholder="Font class (e.g. font-mono)" value={editClubFont} onChange={e => setEditClubFont(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:border-primary focus:outline-none" />
                               </div>
                               <div className="flex gap-2 mt-1">
                                 <button onClick={() => handleUpdateClub(club.id)} className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-md">Save</button>
                                 <button onClick={() => setEditingClubId(null)} className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-md">Cancel</button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <div className="flex items-center gap-2">
                                 <h3 className={`font-bold text-white text-lg ${club.font || "font-sans"}`}>{club.name}</h3>
                                 {isManagingClub && (
                                   <button 
                                     onClick={() => { 
                                       setEditingClubId(club.id); 
                                       setEditClubName(club.name); 
                                       setEditClubDesc(club.description);
                                       setEditClubEmoji(club.emoji || '');
                                       setEditClubBg(club.bg || '');
                                       setEditClubFont(club.font || '');
                                     }} 
                                     className="text-xs flex items-center gap-1 text-muted-foreground hover:text-white bg-white/5 px-2 py-1 rounded-md ml-2 transition-colors"
                                     title="Edit Settings"
                                   >
                                     <Sparkles size={12} /> Edit
                                   </button>
                                 )}
                               </div>
                               <p className="text-sm text-muted-foreground line-clamp-1">{club.description || 'A great club to join.'}</p>
                             </>
                           )}
                         </div>
                       </div>
                       <div className="flex items-center gap-4 mt-2 sm:mt-0">
                         {isManagingClub && (
                            <button 
                              onClick={() => {
                                // Scroll up and populate CreatePostBox with club context if needed, or just prompt
                                const postTitle = window.prompt(`Enter post title for ${club.name}:`);
                                if (postTitle) {
                                  addDoc(collection(db, 'communityPosts'), {
                                    content: `[CLUB UPDATE: ${club.name}] \n${postTitle}`,
                                    creatorId: user?.uid,
                                    creatorName: profile?.username || profile?.displayName || user?.displayName,
                                    creatorPhotoURL: profile?.photoURL || user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`,
                                    createdAt: serverTimestamp(),
                                    upvotes: 0,
                                    tags: [club.name],
                                    clubId: club.id
                                  }).then(() => toast.success('Club post uploaded!'));
                                }
                              }}
                              className="bg-black text-white hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap"
                            >
                              Upload Post
                            </button>
                         )}
                         <button 
                           onClick={() => handleJoinClub(club.id, club.name)}
                           disabled={isJoined}
                           className={`px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${isJoined ? 'bg-white/10 text-muted-foreground cursor-not-allowed' : 'bg-primary/20 text-primary hover:bg-primary hover:text-white'}`}
                         >
                           {isJoined ? 'Joined' : 'Join Club'}
                         </button>
                       </div>
                     </div>
                   </div>
                 )})
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
        {activeItem === 'friends' ? (
          <LoungeRightSidebar profile={profile!} onlineUsers={onlineUsers} />
        ) : (
          <RightSidebar />
        )}
        
      </div>
    </div>
  );
};

export default Community;
