import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { CommunityClub, CommunityEvent, CommunityPost } from '../types';
import { useAuth } from '../AuthProvider';
import { Users, Calendar, Megaphone, PlusCircle, Image as ImageIcon, Send, Tag, X, Loader2, MapPin, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { MMUText } from '../components/MMUText';

type TabType = 'clubs' | 'events' | 'posts';

const Community: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  
  const [clubs, setClubs] = useState<CommunityClub[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Forms state
  const [newClub, setNewClub] = useState({ name: '', description: '' });
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '' });
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '' });

  const isStaff = !profile?.studentId && (profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com' || user?.email?.endsWith('@mmu.edu.my'));
  const isStudent = !!profile?.studentId;
  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  useEffect(() => {
    setLoading(true);
    
    const unsubscribeClubs = onSnapshot(query(collection(db, 'communityClubs'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
      setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityClub)));
    });

    const unsubscribeEvents = onSnapshot(query(collection(db, 'communityEvents'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityEvent)));
    });

    const unsubscribePosts = onSnapshot(query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost)));
      setLoading(false);
    });

    return () => {
      unsubscribeClubs();
      unsubscribeEvents();
      unsubscribePosts();
    };
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (activeTab === 'clubs' && isAdmin) {
        if (!newClub.name || !newClub.description) return;
        await addDoc(collection(db, 'communityClubs'), {
          name: newClub.name,
          description: newClub.description,
          creatorId: user.uid,
          createdAt: serverTimestamp()
        });
        setNewClub({ name: '', description: '' });
        toast.success("Club created!");
      } else if (activeTab === 'events' && isAdmin) {
        if (!newEvent.title || !newEvent.description || !newEvent.date || !newEvent.location) return;
        await addDoc(collection(db, 'communityEvents'), {
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          location: newEvent.location,
          creatorId: user.uid,
          createdAt: serverTimestamp()
        });
        setNewEvent({ title: '', description: '', date: '', location: '' });
        toast.success("Event created!");
      } else if (activeTab === 'posts' && (isStaff || isStudent)) {
        if (!newPost.title || !newPost.content) return;
        const tagsArray = newPost.tags.split(',').map(tag => tag.trim()).filter(Boolean);
        await addDoc(collection(db, 'communityPosts'), {
          title: newPost.title,
          content: newPost.content,
          tags: tagsArray,
          creatorId: user.uid,
          creatorName: profile?.username || profile?.displayName || user.displayName || 'Anonymous',
          createdAt: serverTimestamp()
        });
        setNewPost({ title: '', content: '', tags: '' });
        toast.success("Post created!");
      }
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error("Failed to create item");
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    if (collectionName === 'communityClubs' || collectionName === 'communityEvents') {
      if (!isAdmin) return;
    } else {
      if (!isStaff) return;
    }
    
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast.success("Deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleJoinClub = async (clubName: string) => {
    if (!user) {
      toast.error("Please sign in to join clubs");
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        joinedClubs: arrayUnion(clubName)
      });
      toast.success(`Joined ${clubName}!`);
    } catch (error) {
      console.error("Error joining club:", error);
      toast.error("Failed to join club");
    }
  };

  const canCreate = (activeTab === 'clubs' || activeTab === 'events') ? isAdmin : (isStaff || isStudent);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <Users size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Community</h1>
            <p className="text-muted-foreground font-medium"><MMUText text="Connect, share, and discover at MMU." /></p>
          </div>
        </div>
        
        {canCreate && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            <PlusCircle size={20} />
            Create {activeTab === 'clubs' ? 'Club' : activeTab === 'events' ? 'Event' : 'Post'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('posts'); setIsCreating(false); }}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2", activeTab === 'posts' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <MessageSquare size={18} /> Posts
        </button>
        <button
          onClick={() => { setActiveTab('events'); setIsCreating(false); }}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2", activeTab === 'events' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Calendar size={18} /> Events
        </button>
        <button
          onClick={() => { setActiveTab('clubs'); setIsCreating(false); }}
          className={cn("px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2", activeTab === 'clubs' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          <Users size={18} /> Clubs
        </button>
      </div>

      {isCreating && (
        <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Megaphone className="text-primary" /> 
              New {activeTab === 'clubs' ? 'Club' : activeTab === 'events' ? 'Event' : 'Post'}
            </h2>
            <button 
              onClick={() => setIsCreating(false)} 
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            {activeTab === 'clubs' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Club Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Robotics Club" 
                    value={newClub.name}
                    onChange={e => setNewClub({...newClub, name: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</label>
                  <textarea 
                    placeholder="What is this club about?" 
                    rows={4}
                    value={newClub.description}
                    onChange={e => setNewClub({...newClub, description: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all resize-none"
                    required
                  />
                </div>
              </>
            )}

            {activeTab === 'events' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Event Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Annual Hackathon" 
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Date & Time</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 24 Oct 2026, 10:00 AM" 
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. FCI Grand Hall" 
                      value={newEvent.location}
                      onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                      className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</label>
                  <textarea 
                    placeholder="Event details..." 
                    rows={4}
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all resize-none"
                    required
                  />
                </div>
              </>
            )}

            {activeTab === 'posts' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Post Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. My thoughts on the new curriculum" 
                    value={newPost.title}
                    onChange={e => setNewPost({...newPost, title: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tags (comma separated)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="e.g. Discussion, Academic, Life" 
                      value={newPost.tags}
                      onChange={e => setNewPost({...newPost, tags: e.target.value})}
                      className="w-full bg-muted border border-border rounded-2xl px-5 py-4 pl-12 focus:outline-none focus:border-primary transition-all"
                    />
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Content</label>
                  <textarea 
                    placeholder="Write your post here..." 
                    rows={6}
                    value={newPost.content}
                    onChange={e => setNewPost({...newPost, content: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all resize-none"
                    required
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end pt-4">
              <button type="submit" className="flex items-center gap-2 bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                <Send size={18} /> Publish
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-muted-foreground font-bold">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'posts' && (
              <div className="grid grid-cols-1 gap-6">
                {posts.length > 0 ? posts.map(post => (
                  <div key={post.id} className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight mb-2">{post.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-bold text-foreground">{post.creatorName || 'Anonymous'}</span>
                          <span>•</span>
                          <span>{post.createdAt ? formatDistanceToNow(new Date(post.createdAt.toMillis ? post.createdAt.toMillis() : post.createdAt)) + ' ago' : 'Recently'}</span>
                        </div>
                      </div>
                      {(isStaff || user?.uid === post.creatorId) && (
                        <button onClick={() => handleDelete('communityPosts', post.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-2">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg mb-6">{post.content}</p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map(tag => (
                          <span key={tag} className="bg-muted text-muted-foreground px-3 py-1 rounded-lg text-xs font-bold border border-border">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed text-muted-foreground">No posts yet.</div>
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.length > 0 ? events.map(event => (
                  <div key={event.id} className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-black tracking-tight">{event.title}</h3>
                      {isStaff && (
                        <button onClick={() => handleDelete('communityEvents', event.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-primary">
                        <Calendar size={16} /> {event.date}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <MapPin size={16} /> {event.location}
                      </div>
                      <p className="text-muted-foreground leading-relaxed mt-4">{event.description}</p>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-20 bg-card rounded-3xl border border-border border-dashed text-muted-foreground">No events yet.</div>
                )}
              </div>
            )}

            {activeTab === 'clubs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clubs.length > 0 ? clubs.map(club => (
                  <div key={club.id} className="bg-card p-8 rounded-3xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-black text-xl text-white shadow-lg shadow-primary/20">
                          {club.name.charAt(0)}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">{club.name}</h3>
                      </div>
                      {isStaff && (
                        <button onClick={() => handleDelete('communityClubs', club.id)} className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                          <X size={20} />
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-8 flex-1">{club.description}</p>
                    <button 
                      onClick={() => handleJoinClub(club.name)}
                      className="w-full bg-primary/10 text-primary py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary hover:text-white transition-all"
                    >
                      Join Club
                    </button>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-20 bg-card rounded-3xl border border-border border-dashed text-muted-foreground">No clubs yet.</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Community;
