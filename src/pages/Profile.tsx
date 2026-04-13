import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
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
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        toast.error("Image too large", { description: "Please select an image under 1MB." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
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
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Profile Header */}
      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <img referrerPolicy="no-referrer"   
            src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
            alt={user.displayName || 'User'} 
            className="w-32 h-32 rounded-3xl border-4 border-primary object-cover bg-muted shadow-xl"
            
          />
          <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={24} className="text-white" />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        <div className="flex-1 text-center md:text-left space-y-4 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight">{user.displayName}</h1>
              <p className="text-muted-foreground font-bold">@{username}</p>
            </div>
            <div className="flex gap-8 justify-center md:justify-start">
              <div className="text-center">
                <div className="text-3xl font-black text-primary">{stats.followers}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black text-primary">{stats.awards}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Awards Won</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {joinedClubs.length > 0 ? joinedClubs.map(club => (
              <span key={club} className="bg-primary/10 text-primary px-4 py-1.5 rounded-xl text-xs font-black border border-primary/20 uppercase tracking-wider">
                {club}
              </span>
            )) : (
              <span className="text-muted-foreground text-xs italic font-medium">No clubs joined yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto no-scrollbar">
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
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all whitespace-nowrap uppercase tracking-widest",
              activeTab === tab.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {activeTab === 'videos' && (
              <div className="space-y-4">
                {myVideos.length > 0 ? (
                  <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="p-5 font-black text-muted-foreground uppercase tracking-widest text-[10px]">Video</th>
                          <th className="p-5 font-black text-muted-foreground uppercase tracking-widest text-[10px] text-center">Views</th>
                          <th className="p-5 font-black text-muted-foreground uppercase tracking-widest text-[10px] text-center">Likes</th>
                          <th className="p-5 font-black text-muted-foreground uppercase tracking-widest text-[10px] text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myVideos.map(video => {
                          return (
                            <tr 
                              key={video.id} 
                              onClick={() => navigate(`/watch/${video.id}`)}
                              className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer group"
                            >
                              <td className="p-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-24 h-14 bg-muted rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                                    <img referrerPolicy="no-referrer" src={video.thumbnailURL || `https://picsum.photos/seed/${video.id}/640/360`} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                  </div>
                                  <div>
                                    <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">{video.title}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{video.category}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5 text-center font-black text-sm">{video.views?.toLocaleString() || 0}</td>
                              <td className="p-5 text-center font-black text-sm">{video.likes || 0}</td>
                              <td className="p-5 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                {video.createdAt ? new Date(video.createdAt.toMillis ? video.createdAt.toMillis() : video.createdAt).toLocaleDateString() : 'Just now'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground bg-card rounded-3xl border border-border border-dashed">
                    <Video size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">You haven't uploaded any videos yet.</p>
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
                  <div className="col-span-full text-center py-20 text-muted-foreground bg-card rounded-3xl border border-border border-dashed">
                    <Save size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">You haven't saved any videos yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {myComments.length > 0 ? (
                  myComments.map(comment => (
                    <div key={comment.id} className="bg-card p-6 rounded-3xl border border-border shadow-sm hover:border-primary/30 transition-all">
                      <p className="text-foreground font-medium mb-3 leading-relaxed">"{comment.text}"</p>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center pt-4 border-t border-border/50">
                        <span className="flex items-center gap-1"><Play size={12} /> On video: {comment.videoId}</span>
                        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-muted-foreground bg-card rounded-3xl border border-border border-dashed">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">You haven't made any comments yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-8 rounded-3xl border border-border shadow-sm text-center group hover:border-primary/30 transition-all">
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Video size={32} className="text-primary" />
                  </div>
                  <div className="text-5xl font-black text-primary mb-2">{stats.videos}</div>
                  <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Total Videos</div>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-border shadow-sm text-center group hover:border-primary/30 transition-all">
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Play size={32} className="text-primary" />
                  </div>
                  <div className="text-5xl font-black text-primary mb-2">{stats.views.toLocaleString()}</div>
                  <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Total Views</div>
                </div>
                <div className="bg-card p-8 rounded-3xl border border-border shadow-sm text-center group hover:border-primary/30 transition-all">
                  <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <BarChart2 size={32} className="text-primary" />
                  </div>
                  <div className="text-5xl font-black text-primary mb-2">{stats.likes.toLocaleString()}</div>
                  <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Total Likes</div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-card p-10 rounded-3xl border border-border shadow-sm max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-10">
                  <div className="bg-primary p-2.5 rounded-2xl">
                    <Settings size={28} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">Profile Settings</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <img referrerPolicy="no-referrer"   
                        src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                        alt="Profile Preview" 
                        className="w-28 h-28 rounded-3xl border-4 border-primary object-cover bg-muted shadow-xl"
                        
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click to change profile picture</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">Username</label>
                      <input 
                        type="text"
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a unique username"
                        className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-4 text-foreground font-bold focus:outline-none focus:border-primary transition-all"
                      />
                    </div>

                    {isAdmin ? (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">Department / Office</label>
                        <select 
                          value={department} 
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-4 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none"
                        >
                          <option value="">Select Department</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">Level of Study</label>
                        <select 
                          value={levelOfStudy} 
                          onChange={(e) => setLevelOfStudy(e.target.value)}
                          className="w-full bg-muted/50 border border-border rounded-2xl px-5 py-4 text-foreground font-bold focus:outline-none focus:border-primary transition-all appearance-none"
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
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground">
                        {isAdmin ? 'Responsibilities / Clubs Managed' : 'My Subjects'}
                      </label>
                      <div className="flex gap-3 mb-4">
                        <input 
                          type="text"
                          value={newSubject} 
                          onChange={(e) => setNewSubject(e.target.value)}
                          placeholder={isAdmin ? "Add a responsibility..." : "Add a subject..."}
                          className="flex-1 bg-muted/50 border border-border rounded-2xl px-5 py-4 text-foreground font-bold focus:outline-none focus:border-primary transition-all"
                        />
                        <button 
                          onClick={addSubject}
                          className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map(sub => (
                          <span key={sub} className="bg-muted text-foreground px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-border font-bold">
                            {sub}
                            <button onClick={() => removeSubject(sub)} className="text-muted-foreground hover:text-primary transition-colors">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-border space-y-4">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                    >
                      {saving ? 'Saving Changes...' : 'Save All Changes'}
                    </button>

                    <button 
                      onClick={handleDeleteProfile}
                      className="w-full bg-red-500/10 text-red-500 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                      Delete Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Profile Modal */}
      {showDeleteProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black mb-4 text-red-500">Delete Profile</h3>
            <p className="text-muted-foreground mb-8">
              Are you sure you want to delete your profile? This action is permanent and will remove all your data.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteProfileModal(false)}
                className="flex-1 bg-muted text-foreground py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteProfile}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
