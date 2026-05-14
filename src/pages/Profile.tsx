import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { VideoMetadata } from '../types';
import VideoCard from '../components/VideoCard';
import { User, BookOpen, Video, MessageSquare, BarChart2, Save, Play, Settings, Camera, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { DEPARTMENTS } from '../constants';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [username, setUsername] = useState<string>("");
  const [levelOfStudy, setLevelOfStudy] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState<string>("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  const [activeTab, setActiveTab] = useState<'videos' | 'saved' | 'comments' | 'stats' | 'settings'>('videos');
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [myVideos, setMyVideos] = useState<VideoMetadata[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoMetadata[]>([]);
  const [myComments, setMyComments] = useState<any[]>([]);
  const [stats, setStats] = useState({ views: 0, likes: 0, videos: 0, followers: 0, awards: 0 });
  const [joinedClubs, setJoinedClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || data.displayName || "");
          setLevelOfStudy(data.levelOfStudy || "Degree");
          setDepartment(data.department || "");
          setSubjects(data.subjects || []);
          setPhotoURL(data.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`);
          setJoinedClubs(data.joinedClubs || []);
          
          setStats(prev => ({
            ...prev,
            followers: data.followers?.length || 0,
            awards: data.awards || 0
          }));
          
          // Fetch saved videos
          if (data.savedVideos && data.savedVideos.length > 0) {
            const savedVideosData: VideoMetadata[] = [];
            for (const videoId of data.savedVideos) {
              const vDoc = await getDoc(doc(db, 'videos', videoId));
              if (vDoc.exists()) {
                savedVideosData.push({ id: vDoc.id, ...vDoc.data() } as VideoMetadata);
              }
            }
            setSavedVideos(savedVideosData);
          }
        }

        // Fetch user's videos
        const videosQ = query(collection(db, 'videos'), where('creatorId', '==', user.uid), orderBy('createdAt', 'desc'));
        const videosSnapshot = await getDocs(videosQ);
        const videosData = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoMetadata));
        setMyVideos(videosData);

        // Calculate stats
        let totalViews = 0;
        let totalLikes = 0;
        videosData.forEach(v => {
          totalViews += v.views || 0;
          totalLikes += v.likes || 0;
        });
        setStats(prev => ({ ...prev, views: totalViews, likes: totalLikes, videos: videosData.length }));

        // Fetch user's comments (avoiding collectionGroup to prevent index errors)
        try {
          const allVideosSnapshot = await getDocs(collection(db, 'videos'));
          let allUserComments: any[] = [];
          
          for (const vDoc of allVideosSnapshot.docs) {
            const commentsQ = query(collection(db, 'videos', vDoc.id, 'comments'), where('userId', '==', user.uid));
            const commentsSnapshot = await getDocs(commentsQ);
            const commentsData = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allUserComments = [...allUserComments, ...commentsData];
          }
          
          // Sort comments by createdAt descending
          allUserComments.sort((a, b) => {
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          
          setMyComments(allUserComments);
        } catch (e) {
          console.error("Error fetching comments", e);
          setMyComments([]);
        }

      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image too large", { description: "Please select an image under 5MB." });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image using canvas to ensure it fits in Firestore (1MB limit)
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.8 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotoURL(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const validRoles = ['viewer', 'creator', 'admin'];
      const userRole = validRoles.includes(profile?.role || '') ? profile?.role : 'viewer';

      // Update Firebase Auth profile for redundancy
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: photoURL || undefined
        });
      }

      await setDoc(doc(db, 'users', user.uid), { 
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role: userRole,
        username: username || '',
        levelOfStudy: levelOfStudy || '',
        department: department || '',
        subjects: subjects || [],
        photoURL: photoURL || ''
      }, { merge: true });
      
      await setDoc(doc(db, 'profiles', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'User',
        username: username || '',
        levelOfStudy: levelOfStudy || '',
        department: department || '',
        photoURL: photoURL || ''
      }, { merge: true });

      // Update community posts to reflect image change
      try {
        const postsQ = query(collection(db, 'communityPosts'), where('creatorId', '==', user.uid));
        const postsSnap = await getDocs(postsQ);
        for (const postDoc of postsSnap.docs) {
          await updateDoc(postDoc.ref, {
            creatorAvatar: photoURL || '',
            creatorPhotoURL: photoURL || ''
          });
        }
      } catch (e) {
        console.error("Error updating community posts:", e);
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = () => {
    if (!user) return;
    setShowDeleteProfileModal(true);
  };

  const confirmDeleteProfile = async () => {
    if (!user) return;
    setShowDeleteProfileModal(false);
    
    try {
      // 1. Delete all videos by this user
      const videosQ = query(collection(db, 'videos'), where('creatorId', '==', user.uid));
      const videosSnapshot = await getDocs(videosQ);
      for (const vDoc of videosSnapshot.docs) {
        await deleteDoc(vDoc.ref);
      }

      // 2. Update all comments
      const allVideosSnapshot = await getDocs(collection(db, 'videos'));
      for (const vDoc of allVideosSnapshot.docs) {
        const commentsQ = query(collection(db, 'videos', vDoc.id, 'comments'), where('userId', '==', user.uid));
        const commentsSnapshot = await getDocs(commentsQ);
        for (const cDoc of commentsSnapshot.docs) {
          await updateDoc(cDoc.ref, {
            text: "This message has been removed due to deleted user.",
            userId: "deleted_user",
            userName: "Deleted User",
            userPhotoURL: ""
          });
        }
      }

      // 3. Update all messages
      const messagesQ = query(collection(db, 'messages'), where('userId', '==', user.uid));
      const messagesSnapshot = await getDocs(messagesQ);
      for (const mDoc of messagesSnapshot.docs) {
        await updateDoc(mDoc.ref, {
          text: "This message has been removed due to deleted user.",
          userId: "deleted_user",
          userName: "Deleted User",
          userPhotoURL: ""
        });
      }

      // 4. Delete all clubPosts
      const clubPostsQ = query(collection(db, 'clubPosts'), where('creatorId', '==', user.uid));
      const clubPostsSnapshot = await getDocs(clubPostsQ);
      for (const cpDoc of clubPostsSnapshot.docs) {
        await deleteDoc(cpDoc.ref);
      }

      // 5. Delete all products
      const productsQ = query(collection(db, 'products'), where('sellerId', '==', user.uid));
      const productsSnapshot = await getDocs(productsQ);
      for (const pDoc of productsSnapshot.docs) {
        await deleteDoc(pDoc.ref);
      }

      // 6. Delete notifications received by user
      const notificationsReceivedQ = query(collection(db, 'notifications'), where('userId', '==', user.uid));
      const notificationsReceivedSnapshot = await getDocs(notificationsReceivedQ);
      for (const nDoc of notificationsReceivedSnapshot.docs) {
        await deleteDoc(nDoc.ref);
      }

      // 7. Delete notifications sent by user
      const notificationsSentQ = query(collection(db, 'notifications'), where('fromUserId', '==', user.uid));
      const notificationsSentSnapshot = await getDocs(notificationsSentQ);
      for (const nDoc of notificationsSentSnapshot.docs) {
        await deleteDoc(nDoc.ref);
      }

      // 8. Delete user and profile docs
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteDoc(doc(db, 'profiles', user.uid));
      
      await signOut(auth);
      toast.success("Profile deleted successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}`);
    }
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
    }
  };

  const removeSubject = (sub: string) => {
    setSubjects(subjects.filter(s => s !== sub));
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <User size={64} className="text-muted-foreground/20" />
        <h2 className="text-2xl font-bold">Please sign in to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 relative">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Profile Header */}
      <div className="relative bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-50" />
        
        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10">
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl group-hover:bg-primary/40 transition-colors" />
            <img referrerPolicy="no-referrer"   
              src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              alt={user.displayName || 'User'} 
              className="relative w-40 h-40 rounded-full border-[6px] border-black/50 object-cover shadow-2xl transition-transform hover:scale-105 duration-500"
            />
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
              <Camera size={32} className="text-white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-6 w-full">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">{user.displayName}</h1>
                <p className="text-primary font-bold tracking-wide">@{username}</p>
                <div className="flex flex-col md:flex-row gap-3 mt-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1"><BookOpen size={16} className="text-primary/70" /> {department || 'Department'}</span>
                  <span className="hidden md:inline">•</span>
                  <span>{levelOfStudy}</span>
                </div>
              </div>
              <div className="flex gap-8 justify-center md:justify-start bg-black/30 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{stats.followers}</div>
                  <div className="text-[10px] uppercase tracking-widest text-primary font-black mt-1">Followers</div>
                </div>
                <div className="w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-3xl font-black text-white">{stats.awards}</div>
                  <div className="text-[10px] uppercase tracking-widest text-primary font-black mt-1">Awards</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {joinedClubs.length > 0 ? joinedClubs.map(club => (
                <span key={club} className="bg-primary/20 text-white px-4 py-2 rounded-full text-xs font-bold border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                  {club}
                </span>
              )) : (
                <span className="text-gray-500 text-xs italic font-medium">No clubs joined yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'videos', icon: Video, label: 'My Videos' },
          { id: 'saved', icon: Save, label: 'Saved' },
          { id: 'comments', icon: MessageSquare, label: 'My Comments' },
          { id: 'stats', icon: BarChart2, label: 'Stats' },
          { id: 'settings', icon: Settings, label: 'Settings' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3.5 rounded-full font-bold text-sm transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-primary text-white shadow-[0_0_20px_rgba(255,20,147,0.4)] border border-primary/50" 
                : "bg-black/40 text-gray-400 hover:text-white hover:bg-black/60 border border-white/5 backdrop-blur-md"
            )}
          >
            <tab.icon size={18} className={activeTab === tab.id ? "text-white" : "text-gray-500"} /> 
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary shadow-[0_0_15px_rgba(255,20,147,0.5)]"></div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'videos' && (
              <div className="space-y-4">
                {myVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myVideos.map(video => (
                      <div 
                        key={video.id} 
                        onClick={() => navigate(`/watch/${video.id}`)}
                        className="group bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-xl cursor-pointer hover:border-primary/50 hover:shadow-[0_0_30px_rgba(255,20,147,0.15)] transition-all duration-300"
                      >
                        <div className="relative aspect-video overflow-hidden">
                          <img referrerPolicy="no-referrer" src={video.thumbnailURL || `https://picsum.photos/seed/${video.id}/640/360`} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold text-white border border-white/10">
                            {video.category}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h3>
                          <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1"><Play size={12} className="text-primary/70" /> {video.views?.toLocaleString() || 0}</span>
                            <span>{video.createdAt ? new Date(video.createdAt.toMillis ? video.createdAt.toMillis() : video.createdAt).toLocaleDateString() : 'Just now'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 text-gray-500 bg-black/20 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                    <Video size={64} className="mx-auto mb-6 opacity-20 text-primary" />
                    <p className="font-bold text-xl text-white/50">You haven't uploaded any videos yet.</p>
                    <p className="text-sm mt-2">Share your cinematic moments with the world.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'saved' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedVideos.length > 0 ? (
                  savedVideos.map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-32 text-gray-500 bg-black/20 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                    <Save size={64} className="mx-auto mb-6 opacity-20 text-primary" />
                    <p className="font-bold text-xl text-white/50">Your watchlist is empty.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {myComments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myComments.map(comment => (
                      <div key={comment.id} className="relative bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl hover:border-primary/30 transition-all group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
                        <p className="text-white font-medium mb-6 leading-relaxed text-lg pl-4">"{comment.text}"</p>
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-500 flex justify-between items-center pt-4 border-t border-white/5 pl-4">
                          <span className="flex items-center gap-2 text-primary/80"><Play size={14} /> Video ID: {comment.videoId.slice(0, 8)}...</span>
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 text-gray-500 bg-black/20 rounded-[2.5rem] border border-white/5 backdrop-blur-md">
                    <MessageSquare size={64} className="mx-auto mb-6 opacity-20 text-primary" />
                    <p className="font-bold text-xl text-white/50">You haven't made any comments yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: Video, label: 'Total Videos', value: stats.videos },
                  { icon: Play, label: 'Total Views', value: stats.views.toLocaleString() },
                  { icon: BarChart2, label: 'Total Likes', value: stats.likes.toLocaleString() }
                ].map((stat, i) => (
                  <div key={i} className="bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-xl text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)] group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all duration-500">
                      <stat.icon size={36} className="text-white" />
                    </div>
                    <div className="text-5xl font-black text-white mb-2 tracking-tight">{stat.value}</div>
                    <div className="text-primary text-[10px] font-black uppercase tracking-widest">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-black/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/5 shadow-2xl max-w-2xl mx-auto relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10" />
                
                <div className="flex items-center gap-4 mb-10 pb-8 border-b border-white/5">
                  <div className="bg-gradient-to-br from-primary to-pink-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(255,20,147,0.3)]">
                    <Settings size={28} className="text-white" />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight text-white">Profile Settings</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-gray-400 pl-2">Profile Picture Link</label>
                      <div className="flex gap-3">
                        <input 
                          type="text"
                          value={photoURL?.startsWith('data:') ? '' : (photoURL || '')} 
                          onChange={(e) => setPhotoURL(e.target.value)}
                          placeholder="Paste an image URL here..."
                          className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none backdrop-blur-md"
                        />
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-primary/20 text-white px-6 py-4 rounded-2xl font-bold text-sm hover:bg-primary/30 transition-all border border-primary/30"
                        >
                          Upload File
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2 pl-2 uppercase tracking-widest font-bold">Use a link to save storage space or upload a file (max 5MB)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-gray-400 pl-2">Username</label>
                      <input 
                        type="text"
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a unique username"
                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all outline-none backdrop-blur-md"
                      />
                    </div>

                    {isAdmin ? (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-gray-400 pl-2">Department / Office</label>
                        <select 
                          value={department} 
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all appearance-none backdrop-blur-md"
                        >
                          <option value="">Select Department</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-gray-400 pl-2">Level of Study</label>
                        <select 
                          value={levelOfStudy} 
                          onChange={(e) => setLevelOfStudy(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all appearance-none backdrop-blur-md"
                        >
                          <option value="Foundation">Foundation</option>
                          <option value="Diploma">Diploma</option>
                          <option value="Degree">Degree</option>
                          <option value="Master">Master</option>
                          <option value="PhD">PhD</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3 text-gray-400 pl-2">
                        {isAdmin ? 'Responsibilities / Clubs Managed' : 'My Subjects'}
                      </label>
                      <div className="flex gap-3 mb-4">
                        {isAdmin ? (
                          <select 
                            value={newSubject} 
                            onChange={(e) => setNewSubject(e.target.value)}
                            className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all appearance-none"
                          >
                            <option value="">Select a club you joined...</option>
                            {joinedClubs.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <input 
                            type="text"
                            value={newSubject} 
                            onChange={(e) => setNewSubject(e.target.value)}
                            placeholder="Add a subject..."
                            className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all"
                          />
                        )}
                        <button 
                          onClick={addSubject}
                          className="bg-white/10 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all backdrop-blur-md border border-white/10"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map(sub => (
                          <span key={sub} className="bg-primary/20 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 border border-primary/30 font-bold backdrop-blur-md">
                            {sub}
                            <button onClick={() => removeSubject(sub)} className="text-gray-400 hover:text-white transition-colors bg-black/20 rounded-full p-1">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 space-y-4">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-primary to-pink-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,20,147,0.4)] disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>

                    <button 
                      onClick={handleDeleteProfile}
                      className="w-full bg-transparent text-gray-400 py-4 rounded-2xl font-bold text-sm hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button className="bg-gradient-to-tr from-primary to-pink-600 p-4 rounded-full text-white shadow-[0_0_30px_rgba(255,20,147,0.5)] hover:scale-110 transition-transform duration-300 group">
          <MessageSquare size={24} className="group-hover:animate-pulse" />
        </button>
      </div>

      {/* Delete Profile Modal */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <h3 className="text-2xl font-black mb-4 text-white">Delete Profile?</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Are you sure you want to delete your profile? This action is permanent and will remove all your cinematic moments.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteProfileModal(false)}
                className="flex-1 bg-white/5 text-white py-3 rounded-xl font-bold hover:bg-white/10 transition-colors border border-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProfile}
                className="flex-1 bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white py-3 rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
