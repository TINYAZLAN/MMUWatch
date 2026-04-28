import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, onSnapshot, increment, deleteDoc, writeBatch, collectionGroup } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { db } from '../firebase';
import { UserProfile as UserProfileType, VideoMetadata } from '../types';
import { Play, Star, MessageCircle, UserPlus, CheckCircle2, Award, UserMinus, Trash2, MoreVertical, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../AuthProvider';
import { cn } from '../lib/utils';

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showDeleteVideoModal, setShowDeleteVideoModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<{id: string, creatorId: string} | null>(null);
  const navigate = useNavigate();

  const isAdmin = myProfile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';
  const isFollowing = myProfile?.following?.includes(userId || '');

  const handleDeleteUser = () => {
    setShowDeleteUserModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!user || !userId || !profile) return;
    setShowDeleteUserModal(false);

    try {
      setIsDeleting(true);
      const batch = writeBatch(db);

      // 1. Delete user doc
      batch.delete(doc(db, 'users', userId));

      // 2. Delete profile doc
      batch.delete(doc(db, 'profiles', userId));

      // 3. Delete all videos
      const videosQ = query(collection(db, 'videos'), where('creatorId', '==', userId));
      const videosSnapshot = await getDocs(videosQ);
      videosSnapshot.docs.forEach(vDoc => {
        batch.delete(vDoc.ref);
      });

      // 4. Update all comments (avoiding collectionGroup to prevent index errors)
      const allVideosSnapshot = await getDocs(collection(db, 'videos'));
      for (const vDoc of allVideosSnapshot.docs) {
        const commentsQ = query(collection(db, 'videos', vDoc.id, 'comments'), where('userId', '==', userId));
        const commentsSnapshot = await getDocs(commentsQ);
        commentsSnapshot.docs.forEach(cDoc => {
          batch.update(cDoc.ref, {
            text: "This message has been removed due to deleted user.",
            userName: "Deleted User",
            userId: "deleted_user",
            userPhotoURL: ""
          });
        });
      }

      // 5. Update all messages
      const messagesQ = query(collection(db, 'messages'), where('userId', '==', userId));
      const messagesSnapshot = await getDocs(messagesQ);
      messagesSnapshot.docs.forEach(mDoc => {
        batch.update(mDoc.ref, {
          text: "This message has been removed due to deleted user.",
          userName: "Deleted User",
          userId: "deleted_user",
          userPhotoURL: ""
        });
      });

      // 6. Delete all clubPosts
      const clubPostsQ = query(collection(db, 'clubPosts'), where('creatorId', '==', userId));
      const clubPostsSnapshot = await getDocs(clubPostsQ);
      clubPostsSnapshot.docs.forEach(cpDoc => {
        batch.delete(cpDoc.ref);
      });

      // 7. Delete all products
      const productsQ = query(collection(db, 'products'), where('sellerId', '==', userId));
      const productsSnapshot = await getDocs(productsQ);
      productsSnapshot.docs.forEach(pDoc => {
        batch.delete(pDoc.ref);
      });

      // 8. Delete notifications received by user
      const notificationsReceivedQ = query(collection(db, 'notifications'), where('userId', '==', userId));
      const notificationsReceivedSnapshot = await getDocs(notificationsReceivedQ);
      notificationsReceivedSnapshot.docs.forEach(nDoc => {
        batch.delete(nDoc.ref);
      });

      // 9. Delete notifications sent by user
      const notificationsSentQ = query(collection(db, 'notifications'), where('fromUserId', '==', userId));
      const notificationsSentSnapshot = await getDocs(notificationsSentQ);
      notificationsSentSnapshot.docs.forEach(nDoc => {
        batch.delete(nDoc.ref);
      });

      await batch.commit();
      toast.success("User deleted successfully.");
      navigate('/');
    } catch (error) {
      console.error("Error deleting user:", error);
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const fetchProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Listen to profile in real-time
        unsubscribeProfile = onSnapshot(doc(db, 'users', userId), (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfileType);
          }
        }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

        const videosQ = query(collection(db, 'videos'), where('creatorId', '==', userId), orderBy('createdAt', 'desc'));
        const videosSnapshot = await getDocs(videosQ);
        const videosData = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoMetadata));
        setVideos(videosData);

      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (error instanceof Error && error.message.includes('permission')) {
          handleFirestoreError(error, OperationType.GET, `users/${userId}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [userId]);

  const handleFollow = async () => {
    if (!user || !userId) {
      toast.error("Please sign in to follow creators");
      return;
    }
    if (userId === user.uid) {
      toast.error("You cannot follow yourself");
      return;
    }

    try {
      const myRef = doc(db, 'users', user.uid);
      const theirRef = doc(db, 'users', userId);

      if (isFollowing) {
        await updateDoc(myRef, { 
          following: arrayRemove(userId),
          followingCount: increment(-1)
        });
        await updateDoc(theirRef, { 
          followers: arrayRemove(user.uid),
          followerCount: increment(-1)
        });
        setProfile(prev => prev ? { ...prev, followers: prev.followers?.filter(id => id !== user.uid) || [], followerCount: (prev.followerCount || 0) - 1 } : null);
        toast.success("Unfollowed");
      } else {
        await updateDoc(myRef, { 
          following: arrayUnion(userId),
          followingCount: increment(1)
        });
        await updateDoc(theirRef, { 
          followers: arrayUnion(user.uid),
          followerCount: increment(1)
        });
        setProfile(prev => prev ? { ...prev, followers: [...(prev.followers || []), user.uid], followerCount: (prev.followerCount || 0) + 1 } : null);
        toast.success("Following!");
        
        // Notification
        await addDoc(collection(db, 'notifications'), {
          userId: userId,
          fromId: user.uid,
          fromName: myProfile?.username || user.displayName || 'Someone',
          type: 'follow',
          videoId: 'profile',
          videoTitle: 'your profile',
          createdAt: serverTimestamp(),
          read: false
        });
      }
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to update follow status");
    }
  };

  const handleInvite = async () => {
    if (!user || !userId) {
       toast.error("Please sign in");
       return;
    }
    try {
      const myRef = doc(db, 'users', user.uid);
      const theirRef = doc(db, 'users', userId);
      
      await updateDoc(myRef, {
        friends: arrayUnion(userId)
      });
      await updateDoc(theirRef, {
        friends: arrayUnion(user.uid)
      });

      setProfile(prev => prev ? { ...prev, friends: [...(prev.friends || []), user.uid] } : null);
      
      toast.success("Added to Friends!", {
        description: "You can now chat privately."
      });
    } catch (error) {
      console.error("Error adding friend:", error);
      toast.error("Failed to add friend");
    }
  };

  const isFriend = profile?.friends?.includes(user?.uid || '');

  const handleDeleteVideo = (e: React.MouseEvent, videoId: string, creatorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const isOwner = user && creatorId === user.uid;
    if (!isAdmin && !isOwner) return;
    
    setVideoToDelete({ id: videoId, creatorId });
    setShowDeleteVideoModal(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    setShowDeleteVideoModal(false);
    const { id: videoId } = videoToDelete;

    try {
      // Only delete the video document. 
      // Orphaned comments won't be fetched, and savedVideo references will be filtered out on read.
      await deleteDoc(doc(db, 'videos', videoId));

      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast.success("Video deleted");
    } catch (error) {
      console.error("Error deleting video:", error);
      handleFirestoreError(error, OperationType.DELETE, `videos/${videoId}`);
    }
  };

  const handleToggleBusinessPartner = async () => {
    if (!isAdmin || !userId || !profile) return;
    try {
      const isPartner = !profile.isBusinessPartner;
      await updateDoc(doc(db, 'users', userId), {
        isBusinessPartner: isPartner
      });
      toast.success(isPartner ? "Added Business Partner tag" : "Removed Business Partner tag");
      setShowAdminMenu(false);
    } catch (error) {
      console.error("Error toggling business partner:", error);
      toast.error("Failed to update status");
    }
  };

  const handleGiveAward = async () => {
    if (!isAdmin || !userId || !profile) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        awards: increment(1)
      });
      toast.success("Award given to user!");
      setShowAdminMenu(false);
    } catch (error) {
      console.error("Error giving award:", error);
      toast.error("Failed to give award");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>;
  }

  if (!profile) {
    return <div className="text-center py-20">User not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-20">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-mmu-blue to-primary opacity-20"></div>
        
        {isAdmin && profile.uid !== user?.uid && (
          <div className="absolute top-4 right-4 z-20">
            <button 
              onClick={() => setShowAdminMenu(!showAdminMenu)}
              className="p-2.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-muted transition-colors shadow-sm border border-border"
            >
              <MoreVertical size={20} />
            </button>
            
            {showAdminMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50">
                <button 
                  onClick={handleToggleBusinessPartner}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <ShieldCheck size={16} className="text-mmu-blue" />
                  {profile.isBusinessPartner ? 'Remove Partner Tag' : 'Add Partner Tag'}
                </button>
                <button 
                  onClick={handleGiveAward}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <Award size={16} className="text-amber-500" />
                  Give Award
                </button>
                <div className="h-px bg-border my-1" />
                <button 
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  {isDeleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 pt-16">
          <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-card bg-muted flex-shrink-0 shadow-xl">
            <img referrerPolicy="no-referrer" src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} alt={profile.displayName} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
              {profile.username || profile.displayName}
              {profile.role === 'admin' && <CheckCircle2 size={24} className="text-primary" />}
              {profile.isBusinessPartner && <ShieldCheck size={24} className="text-mmu-blue" />}
            </h1>
            <p className="text-muted-foreground text-lg font-medium">{profile.displayName}</p>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">{profile.faculty} • {profile.levelOfStudy}</p>
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-amber-500">
              <Award size={18} />
              <span className="font-black text-sm">{profile.awards || 0} Awards Won</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 relative">
            <button 
              onClick={handleInvite}
              disabled={isFriend}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] transition-all shadow-lg",
                isFriend ? 'bg-muted text-green-500 cursor-not-allowed border border-green-500/30' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
              )}
            >
              {isFriend ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
              {isFriend ? 'Friends' : 'Add Friend'}
            </button>
            <button 
              onClick={handleFollow}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-black uppercase tracking-widest text-[10px] transition-all shadow-lg",
                isFollowing ? "bg-muted text-foreground hover:bg-muted/80" : "bg-foreground text-background hover:opacity-90"
              )}
            >
              {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="relative z-10 flex justify-center md:justify-start gap-12 mt-8 pt-8 border-t border-border">
          <div className="text-center md:text-left">
            <p className="text-3xl font-black text-primary">{profile.followerCount || profile.followers?.length || 0}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Followers</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-3xl font-black text-primary">{videos.length}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Videos Published</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-3xl font-black text-primary">{profile.awards || 0}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Awards Received</p>
          </div>
        </div>
      </div>

      {/* Clubs Section */}
      {profile.joinedClubs && profile.joinedClubs.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
            <Star size={20} className="text-primary" />
            Clubs Joined
          </h2>
          <div className="flex flex-wrap gap-3">
            {profile.joinedClubs.map(club => (
              <span key={club} className="bg-muted text-foreground px-5 py-2.5 rounded-2xl border border-border font-bold text-sm">
                {club}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Videos Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Play size={24} className="text-primary" />
          <h2 className="text-2xl font-black tracking-tight">Videos by {profile.username || profile.displayName}</h2>
        </div>
        {videos.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
            <p className="text-muted-foreground font-bold">No videos published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map(video => (
              <div key={video.id} className="relative group">
                <Link to={`/watch/${video.id}`} className="block bg-card rounded-3xl overflow-hidden border border-border hover:border-primary/30 transition-all shadow-sm hover:shadow-xl h-full">
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <img referrerPolicy="no-referrer" src={video.thumbnailURL || `https://picsum.photos/seed/${video.id}/640/360`} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-white/20 p-3 rounded-full backdrop-blur-md">
                        <Play size={32} className="text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-black text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">{video.title}</h3>
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{video.views || 0} views</span>
                      <span>{video.createdAt ? formatDistanceToNow(new Date(video.createdAt.toMillis ? video.createdAt.toMillis() : video.createdAt)) : 'Just now'} ago</span>
                    </div>
                  </div>
                </Link>
                { (isAdmin || (user && video.creatorId === user.uid)) && (
                  <button 
                    onClick={(e) => handleDeleteVideo(e, video.id, video.creatorId)}
                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-20"
                    title="Delete Video"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete User Modal */}
      {showDeleteUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black mb-4 text-red-500">Delete User</h3>
            <p className="text-muted-foreground mb-8">
              Are you sure you want to delete {profile.username || profile.displayName}? This will delete their profile, all their videos, and mask their comments/messages. <strong className="text-foreground">THIS ACTION IS PERMANENT.</strong>
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteUserModal(false)}
                className="flex-1 bg-muted text-foreground py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteUser}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Modal */}
      {showDeleteVideoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black mb-4 text-red-500">Delete Video</h3>
            <p className="text-muted-foreground mb-8">
              Are you sure you want to delete this video? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteVideoModal(false)}
                className="flex-1 bg-muted text-foreground py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteVideo}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
