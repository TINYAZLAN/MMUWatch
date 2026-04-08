import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { ClubPost } from '../types';
import { useAuth } from '../AuthProvider';
import { Users, Calendar, Megaphone, PlusCircle, Image as ImageIcon, Send, Tag, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const Clubs: React.FC = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', clubName: '', tags: '' });

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'clubPosts'), orderBy('createdAt', 'desc'), limit(20));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClubPost));
      
      if (postData.length === 0) {
        // Mock data
        const mockPosts: ClubPost[] = [
          {
            id: '1',
            clubName: 'MMU Robotics Club',
            title: 'Annual RoboRumble 2026 Registration Open!',
            content: 'Join us for the biggest robotics competition of the year. Build, battle, and win amazing prizes. Open to all faculties!',
            imageURL: 'https://picsum.photos/seed/robo/800/400',
            creatorId: 'creator-1',
            createdAt: new Date().toISOString(),
            tags: ['Robotics', 'Competition', 'Cyberjaya']
          },
          {
            id: '2',
            clubName: 'Creative Multimedia Society',
            title: 'Digital Art Exhibition: "Future Visions"',
            content: 'Come see the amazing artwork created by our talented students. Opening night features live music and refreshments.',
            imageURL: 'https://picsum.photos/seed/art/800/400',
            creatorId: 'creator-2',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            tags: ['Art', 'Exhibition', 'FCM']
          }
        ];
        setPosts(mockPosts);
      } else {
        setPosts(postData);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching club posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.title || !newPost.content || !newPost.clubName) return;

    try {
      const tagsArray = newPost.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      await addDoc(collection(db, 'clubPosts'), {
        title: newPost.title,
        content: newPost.content,
        clubName: newPost.clubName,
        tags: tagsArray,
        creatorId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsCreating(false);
      setNewPost({ title: '', content: '', clubName: '', tags: '' });
      toast.success("Announcement posted!");
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error("Failed to post announcement");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'clubPosts', postId));
      toast.success("Post deleted");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
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
      toast.success(`Joined ${clubName}!`, {
        description: "You can now chat in the club's channel."
      });
    } catch (error) {
      console.error("Error joining club:", error);
      toast.error("Failed to join club");
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
            <Users size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Campus Hub</h1>
            <p className="text-muted-foreground font-medium">Stay connected with MMU Clubs & Societies.</p>
          </div>
        </div>
        
        {isAdmin && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20"
          >
            <PlusCircle size={20} />
            Create Post
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Megaphone className="text-primary" /> 
              New Announcement
            </h2>
            <button 
              onClick={() => setIsCreating(false)} 
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handlePostSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Club Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Robotics Club" 
                  value={newPost.clubName}
                  onChange={e => setNewPost({...newPost, clubName: e.target.value})}
                  className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Post Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Annual Meeting" 
                  value={newPost.title}
                  onChange={e => setNewPost({...newPost, title: e.target.value})}
                  className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tags (comma separated)</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="e.g. Robotics, Competition, Cyberjaya" 
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
                placeholder="What's happening?" 
                rows={5}
                value={newPost.content}
                onChange={e => setNewPost({...newPost, content: e.target.value})}
                className="w-full bg-muted border border-border rounded-2xl px-5 py-4 focus:outline-none focus:border-primary transition-all resize-none"
                required
              />
            </div>
            <div className="flex items-center justify-between pt-4">
              <button type="button" className="flex items-center gap-2 text-muted-foreground hover:text-primary font-bold text-sm transition-colors">
                <ImageIcon size={20} /> Add Image
              </button>
              <button type="submit" className="flex items-center gap-2 bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                <Send size={18} /> Post Announcement
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="text-muted-foreground font-bold">Loading announcements...</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="bg-card rounded-[2.5rem] border border-border overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300">
              {post.imageURL && (
                <div className="h-72 w-full bg-muted overflow-hidden">
                  <img 
                    src={post.imageURL || `https://picsum.photos/seed/club-${post.id}/1200/600`} 
                    alt={post.title} 
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="p-8 md:p-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-primary/20">
                      {post.clubName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-xl leading-tight">{post.clubName}</h3>
                      <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 mt-1">
                        <Calendar size={14} className="text-primary" /> 
                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt.toMillis ? post.createdAt.toMillis() : post.createdAt)) + ' ago' : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-500 hover:text-red-600 transition-colors p-2"
                        title="Delete Post"
                      >
                        <X size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleJoinClub(post.clubName)}
                      className="bg-primary/10 text-primary px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all"
                    >
                      Join Club
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-3xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors">{post.title}</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg">{post.content}</p>
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="bg-muted text-muted-foreground px-3 py-1 rounded-lg text-xs font-bold border border-border">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed text-muted-foreground">
            No announcements yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Clubs;
