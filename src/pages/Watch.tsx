import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection, query, limit, getDocs, updateDoc, increment, addDoc, orderBy, where, serverTimestamp, arrayUnion, arrayRemove, onSnapshot, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { VideoMetadata, Comment } from '../types';
import { Heart, Share2, MoreHorizontal, CheckCircle2, Send, Sparkles, Clock, Play, MessageSquare, Bookmark, Reply, Award, X, Trash2, AlertCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../AuthProvider';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import VideoCard from '../components/VideoCard';
import { toast } from 'sonner';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const Watch: React.FC = () => {
  const { videoId: routeVideoId } = useParams<{ videoId: string }>();
  const { user, profile } = useAuth();
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [uploaderProfile, setUploaderProfile] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<VideoMetadata[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showRepliesFor, setShowRepliesFor] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteVideoModal, setShowDeleteVideoModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const toggleReplies = (commentId: string) => {
    setShowRepliesFor(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const isSaved = profile?.savedVideos?.includes(video?.id || '');
  const isLiked = video?.likedBy?.includes(user?.uid || '');
  const isFollowing = profile?.following?.includes(video?.creatorId || '');

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  let videoSrc = video?.videoURL || (video as any)?.url;
  
  const isYouTube = videoSrc?.includes('youtube.com') || videoSrc?.includes('youtu.be');
  let youtubeId = '';
  if (isYouTube) {
    const match = videoSrc.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    youtubeId = match ? match[1] : '';
  }
  
  // Intercept dummy or direct S3 domains and route them to our proxy
  if (videoSrc) {
    if (videoSrc.includes('r2.dev') || videoSrc.includes('r2.cloudflarestorage.com')) {
        const key = videoSrc.split('/').pop();
        videoSrc = `/api/video/${key}`;
    }
  }

  let posterSrc = video?.thumbnailURL;
  if (posterSrc) {
    if (posterSrc.includes('r2.dev') || posterSrc.includes('r2.cloudflarestorage.com')) {
        const key = posterSrc.split('/').pop();
        posterSrc = `/api/video/${key}`;
    }
  }

  const hasIncrementedViews = useRef(false);

  useEffect(() => {
    hasIncrementedViews.current = false;
  }, [routeVideoId]);

  const handleDeleteVideo = () => {
    if (!video || !user) return;
    const isOwner = video.creatorId === user.uid;
    if (!isAdmin && !isOwner) return;
    
    setShowDeleteVideoModal(true);
  };

  const confirmDeleteVideo = async () => {
    if (!video || !user) return;
    setShowDeleteVideoModal(false);

    try {
      // Only delete the video document. 
      // Orphaned comments won't be fetched, and savedVideo references will be filtered out on read.
      await deleteDoc(doc(db, 'videos', video.id));

      toast.success("Video deleted successfully.");
      navigate('/');
    } catch (error) {
      console.error("Error deleting video:", error);
      handleFirestoreError(error, OperationType.DELETE, `videos/${video.id}`);
    }
  };

  const handleCommentDelete = async (commentId: string, commentUserId: string) => {
    if (!user || !video) return;
    const isOwner = commentUserId === user.uid;
    if (!isAdmin && !isOwner) return;
    
    try {
      await deleteDoc(doc(db, 'videos', video.id, 'comments', commentId));
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleReplyDelete = async (commentId: string, replyId: string, replyUserId: string) => {
    if (!user || !video) return;
    const isOwner = replyUserId === user.uid;
    if (!isAdmin && !isOwner) return;

    try {
      const commentRef = doc(db, 'videos', video.id, 'comments', commentId);
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const updatedReplies = comment.replies?.filter((r: any) => r.id !== replyId) || [];
      await updateDoc(commentRef, { replies: updatedReplies });
      toast.success("Reply deleted");
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast.error("Failed to delete reply");
    }
  };

  const handleLikeVideo = async () => {
    if (!user || !video) {
      toast.error("Please sign in to like videos");
      return;
    }
    try {
      const videoRef = doc(db, 'videos', video.id);
      if (isLiked) {
        await updateDoc(videoRef, { 
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
        toast.success("Removed from liked videos");
      } else {
        await updateDoc(videoRef, { 
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
        toast.success("Added to liked videos!");
        
        // Notification
        if (video.creatorId !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: video.creatorId,
            fromId: user.uid,
            fromName: profile?.username || user.displayName || 'Someone',
            type: 'like',
            videoId: video.id,
            videoTitle: video.title,
            createdAt: serverTimestamp(),
            read: false
          });
        }
      }
    } catch (error) {
      console.error("Error liking video:", error);
      toast.error("Failed to update like status");
    }
  };

  const handleSaveVideo = async () => {
    if (!user || !video) {
      toast.error("Please sign in to save videos");
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      if (isSaved) {
        await updateDoc(userRef, {
          savedVideos: arrayRemove(video.id)
        });
        toast.success("Removed from saved videos");
      } else {
        await updateDoc(userRef, {
          savedVideos: arrayUnion(video.id)
        });
        toast.success("Saved to your profile");
      }
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video");
    }
  };

  const handleFollow = async () => {
    if (!user || !video) {
      toast.error("Please sign in to follow creators");
      return;
    }
    if (video.creatorId === user.uid) {
      toast.error("You cannot follow yourself");
      return;
    }

    try {
      const myRef = doc(db, 'users', user.uid);
      const theirRef = doc(db, 'users', video.creatorId);

      if (isFollowing) {
        await updateDoc(myRef, { 
          following: arrayRemove(video.creatorId),
          followingCount: increment(-1)
        });
        await updateDoc(theirRef, { 
          followers: arrayRemove(user.uid),
          followerCount: increment(-1)
        });
        toast.success("Unfollowed");
      } else {
        await updateDoc(myRef, { 
          following: arrayUnion(video.creatorId),
          followingCount: increment(1)
        });
        await updateDoc(theirRef, { 
          followers: arrayUnion(user.uid),
          followerCount: increment(1)
        });
        toast.success("Following!");
        
        // Notification
        await addDoc(collection(db, 'notifications'), {
          userId: video.creatorId,
          fromId: user.uid,
          fromName: profile?.username || user.displayName || 'Someone',
          type: 'follow',
          videoId: video.id,
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

  const handleCommentLike = async (commentId: string) => {
    if (!user || !video) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const isCommentLiked = comment.likedBy?.includes(user.uid);
    const commentRef = doc(db, 'videos', video.id, 'comments', commentId);

    try {
      if (isCommentLiked) {
        await updateDoc(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!user || !video) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const replyIndex = comment.replies?.findIndex((r: any) => r.id === replyId);
    if (replyIndex === undefined || replyIndex === -1) return;
    
    // We make a shallow copy of replies
    const updatedReplies = [...(comment.replies || [])];
    const reply = updatedReplies[replyIndex];
    if (!reply.likedBy) reply.likedBy = [];

    const isLiked = reply.likedBy.includes(user.uid);
    if (isLiked) {
      reply.likedBy = reply.likedBy.filter((uid: string) => uid !== user.uid);
      reply.likes = Math.max(0, (reply.likes || 1) - 1);
    } else {
      reply.likedBy.push(user.uid);
      reply.likes = (reply.likes || 0) + 1;
    }

    try {
      const commentRef = doc(db, 'videos', video.id, 'comments', commentId);
      await updateDoc(commentRef, {
        replies: updatedReplies
      });
    } catch (error) {
      console.error("Error liking reply:", error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!user || !newComment.trim() || !video) return;
    try {
      const commentData = {
        videoId: video.id,
        userId: user.uid,
        userName: profile?.username || profile?.studentId || profile?.displayName || user.displayName || 'User',
        userPhoto: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        text: newComment,
        createdAt: new Date().toISOString(),
        likes: 0,
        replies: []
      };
      
      await addDoc(collection(db, 'videos', video.id, 'comments'), commentData);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReplySubmit = async (commentId: string) => {
    if (!user || !replyText.trim() || !video) return;
    try {
      const replyData = {
        id: Math.random().toString(36).substring(7),
        videoId: video.id,
        userId: user.uid,
        userName: profile?.username || profile?.displayName || 'User',
        userPhoto: profile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        text: replyText,
        createdAt: new Date().toISOString(),
        likes: 0
      };

      const commentRef = doc(db, 'videos', video.id, 'comments', commentId);
      await updateDoc(commentRef, {
        replies: arrayUnion(replyData)
      });

      // Mock notification
      await addDoc(collection(db, 'notifications'), {
        userId: comments.find(c => c.id === commentId)?.userId,
        fromId: user.uid,
        fromName: profile?.username || 'Someone',
        type: 'reply',
        videoId: video.id,
        videoTitle: video.title,
        createdAt: serverTimestamp(),
        read: false
      });

      setReplyTo(null);
      setReplyText('');
      toast.success('Reply posted!');
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  useEffect(() => {
    let unsubscribeUploader: (() => void) | null = null;
    let unsubscribeVideo: (() => void) | null = null;
    let unsubscribeComments: (() => void) | null = null;

    if (!routeVideoId) {
      setError('No video ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, 'videos', routeVideoId);
    
    unsubscribeVideo = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const videoData = { id: snap.id, ...snap.data() } as VideoMetadata;
        setVideo(videoData);
        
        // Fetch uploader profile in real-time
        if (!unsubscribeUploader) {
          unsubscribeUploader = onSnapshot(doc(db, 'users', videoData.creatorId), (userSnapshot) => {
            if (userSnapshot.exists()) {
              setUploaderProfile(userSnapshot.data());
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, 'users');
          });
        }

        // Increment views once
        if (!hasIncrementedViews.current) {
          hasIncrementedViews.current = true;
          
          const incrementViewCount = async () => {
            try {
              if (user) {
                const viewerDocRef = doc(db, 'videos', routeVideoId, 'viewers', user.uid);
                const viewerDoc = await getDoc(viewerDocRef);
                if (!viewerDoc.exists()) {
                  await setDoc(viewerDocRef, { viewedAt: serverTimestamp() });
                  await updateDoc(docRef, { views: increment(1) });
                }
              } else {
                // Anonymous user, check localStorage
                const viewedVideos = JSON.parse(localStorage.getItem('viewedVideos') || '[]');
                if (!viewedVideos.includes(routeVideoId)) {
                  viewedVideos.push(routeVideoId);
                  localStorage.setItem('viewedVideos', JSON.stringify(viewedVideos));
                  await updateDoc(docRef, { views: increment(1) });
                }
              }
            } catch (e) {
              console.warn("Could not increment views", e);
            }
          };

          incrementViewCount();
          
          // Fetch recommendations
          try {
            let recsQ;
            if (videoData.category) {
              recsQ = query(
                collection(db, 'videos'),
                where('category', '==', videoData.category),
                limit(5)
              );
            } else {
              recsQ = query(collection(db, 'videos'), limit(5));
            }
            const recsSnapshot = await getDocs(recsQ);
            let recs = recsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as VideoMetadata)).filter(v => v.id !== routeVideoId);
            if (recs.length === 0) {
              // fallback to generic
              const fallbackQ = query(collection(db, 'videos'), limit(5));
              const fallbackSnapshot = await getDocs(fallbackQ);
              recs = fallbackSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as VideoMetadata)).filter(v => v.id !== routeVideoId);
            }
            setRecommendations(recs.slice(0, 4));
          } catch (e) {
            console.warn("Could not fetch recommendations", e);
          }
        }
        
        setLoading(false);
      } else {
        setError('Video not found');
        setLoading(false);
      }
    }, (err) => {
      setError('Error fetching video');
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'videos');
    });

    // Real-time comments
    const commentsQ = query(collection(db, 'videos', routeVideoId, 'comments'), orderBy('createdAt', 'desc'));
    unsubscribeComments = onSnapshot(commentsQ, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'comments');
    });

    return () => {
      if (unsubscribeVideo) unsubscribeVideo();
      if (unsubscribeComments) unsubscribeComments();
      if (unsubscribeUploader) unsubscribeUploader();
    };
  }, [routeVideoId]);

  useEffect(() => {
    let player: any;
    if (videoPlayerRef.current && !isYouTube && videoSrc) {
      player = videojs(videoPlayerRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        controlBar: {
          playToggle: true,
          volumePanel: {
            inline: false
          },
          currentTimeDisplay: true,
          timeDivider: true,
          durationDisplay: true,
          progressControl: true,
          fullscreenToggle: true,
          pictureInPictureToggle: false,
          remainingTimeDisplay: false,
        }
      });

      player.on('play', () => { setIsPlaying(true); setIsEnded(false); });
      player.on('pause', () => { setIsPlaying(false); setIsEnded(player.ended()); });
      player.on('ended', () => { setIsPlaying(false); setIsEnded(true); });
    }

    return () => {
      if (player) {
        player.dispose();
      }
    };
  }, [videoSrc, isYouTube]);

  useEffect(() => {
    if (isYouTube) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const videoElement = document.querySelector('video');
        if (videoElement) {
          if (videoElement.paused) {
            videoElement.play();
          } else {
            videoElement.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto pb-20 px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-2 hidden lg:block">
            <div className="bg-muted animate-pulse h-64 rounded-3xl"></div>
          </div>
          <div className="lg:col-span-7 space-y-4">
            <div className="w-full aspect-video bg-muted animate-pulse rounded-2xl"></div>
            <div className="h-8 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          </div>
          <div className="lg:col-span-3 hidden lg:block space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-xl"></div>
            <div className="h-32 bg-muted animate-pulse rounded-xl"></div>
            <div className="h-32 bg-muted animate-pulse rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: video?.title || 'Watch this video on MMUWatch',
        url: url
      }).catch(err => {
        console.error("Error sharing:", err);
        // Fallback to clipboard if share modal was cancelled or failed
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard!");
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle size={64} className="text-red-500" />
        <h2 className="text-2xl font-bold">Oops! Something went wrong</h2>
        <p className="text-muted-foreground">{error || 'Video not found or has been removed.'}</p>
        <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-full font-bold mt-4 hover:bg-primary/90 transition-colors">
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Uploader Details (Sticky) */}
        <div className="lg:col-span-2 relative">
          <div className="bg-card p-6 rounded-3xl border border-border shadow-sm sticky top-24">
            <div className="flex flex-col items-center text-center space-y-4">
              <Link to={`/channel/${video.creatorId}`} className="w-20 h-20 rounded-full overflow-hidden bg-muted border-4 border-primary shadow-xl">
                <img referrerPolicy="no-referrer" src={uploaderProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.creatorId}`} alt="Creator" className="w-full h-full object-cover" />
              </Link>
              <div>
                <Link to={`/channel/${video.creatorId}`} className="text-lg font-black hover:text-primary transition-colors flex items-center justify-center gap-1">
                  {uploaderProfile?.username || video.creatorName}
                  <CheckCircle2 size={16} fill="currentColor" className="text-primary" />
                </Link>
                <p className="text-primary font-bold text-[10px] mt-0.5 uppercase tracking-wider">{uploaderProfile?.faculty || video.creatorFaculty || 'MMU Faculty'}</p>
                <div className="flex items-center justify-center gap-1 text-amber-500">
                  <Award size={14} />
                  <span className="text-xs font-bold">{uploaderProfile?.awards || 0} Awards</span>
                </div>
              </div>
              
              <div className="w-full pt-4 border-t border-border space-y-4">
                <button 
                  onClick={handleFollow}
                  className={cn(
                    "w-full font-bold py-2.5 rounded-xl transition-all shadow-lg",
                    isFollowing 
                      ? "bg-muted text-foreground hover:bg-muted/80" 
                      : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                  )}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <div className="flex justify-around text-sm">
                  <div className="text-center">
                    <p className="font-black">{uploaderProfile?.followerCount || uploaderProfile?.followers?.length || 0}</p>
                    <p className="text-muted-foreground text-[9px] uppercase tracking-widest font-bold">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black">{uploaderProfile?.awards || 0}</p>
                    <p className="text-muted-foreground text-[9px] uppercase tracking-widest font-bold">Awards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Video Player (Wider) */}
        <div className="lg:col-span-10">
          <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-border aspect-video relative group">
            {videoSrc ? (
              isYouTube ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  className="w-full h-full"
                  allowFullScreen
                  title="YouTube video player"
                />
              ) : (
              <>
                <div data-vjs-player>
                  <video 
                    ref={videoPlayerRef}
                    className="video-js vjs-theme-mmu vjs-big-play-centered"
                    poster={posterSrc || undefined}
                  >
                    <source src={videoSrc} type="video/mp4" />
                  </video>
                </div>
              </>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20">
                <AlertCircle size={48} className="text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">Video source unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width Bottom Section: Title, Description, Comments */}
      <div className="mt-8 space-y-8">
        {/* Video Info */}
        <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2 tracking-tight">{video.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-medium"><Play size={14} /> {video.views?.toLocaleString()} views</span>
                <span className="flex items-center gap-1 font-medium"><Clock size={14} /> {video.createdAt ? formatDistanceToNow(new Date(video.createdAt.toMillis ? video.createdAt.toMillis() : video.createdAt), { addSuffix: true }) : 'Just now'}</span>
                <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-xs font-bold border border-primary/20">{video.category}</span>
              </div>
            </div>

            {/* Primary Interactions Aligned with Title */}
            <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-2xl border border-border">
              {(isAdmin || (user && video.creatorId === user.uid)) && (
                <button 
                  onClick={handleDeleteVideo}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold hover:bg-red-500/10 text-red-500 transition-all"
                  title="Delete Video"
                >
                  <Trash2 size={20} />
                  <span>Delete</span>
                </button>
              )}

              <button 
                onClick={handleLikeVideo}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                  isLiked ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                <span>{video.likes.toLocaleString()}</span>
              </button>
              
              <button 
                onClick={handleSaveVideo}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all",
                  isSaved ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold hover:bg-muted text-muted-foreground transition-all"
              >
                <Share2 size={20} />
                <span>Share</span>
              </button>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div className="bg-muted/30 p-6 rounded-2xl border border-border">
              <p className="whitespace-pre-wrap text-foreground/80 leading-relaxed text-base">{video.description}</p>
            </div>
          </div>
        </div>

        {/* Recommended Videos */}
        <div className="space-y-4">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" />
            Recommended for You
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendations.map(rec => (
              <VideoCard key={rec.id} video={rec} />
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-card p-8 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-primary p-2 rounded-xl">
              <MessageSquare size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-black">Comments <span className="text-muted-foreground ml-2">{comments.length}</span></h2>
          </div>

          {/* Add Comment */}
          {user ? (
            <div className="flex gap-4 mb-10">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                <img referrerPolicy="no-referrer" src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Me" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full bg-muted/50 border border-border rounded-2xl p-4 pr-16 focus:outline-none focus:border-primary transition-all resize-none h-24 text-foreground"
                />
                <button 
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                  className="absolute right-4 bottom-4 bg-primary p-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 border border-border border-dashed rounded-2xl p-8 text-center mb-10">
              <MessageSquare size={48} className="mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-medium mb-6">Join the conversation with other MMU students.</p>
              <button onClick={() => navigate('/login')} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
                Sign In to Comment
              </button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex gap-4">
                  <Link to={`/channel/${comment.userId}`} className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                    <img referrerPolicy="no-referrer" src={comment.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} alt="User" className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1">
                    <div className="bg-muted/30 p-6 rounded-2xl border border-border group-hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Link to={`/channel/${comment.userId}`} className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer">{comment.userName}</Link>
                          <span className="text-muted-foreground text-xs ml-3">{formatDistanceToNow(new Date(comment.createdAt.toMillis ? comment.createdAt.toMillis() : comment.createdAt))} ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(isAdmin || (user && comment.userId === user.uid)) && (
                            <button 
                              onClick={() => handleCommentDelete(comment.id, comment.userId)}
                              className="text-red-500 hover:text-red-600 transition-colors p-1"
                              title="Delete Comment"
                            >
                              <X size={16} />
                            </button>
                          )}
                          <button className="text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>
                      <p className="text-base mt-2 text-foreground/90 leading-relaxed">{comment.text}</p>
                      <div className="flex items-center gap-6 mt-4">
                        <button 
                          onClick={() => handleCommentLike(comment.id)}
                          className={cn(
                            "flex items-center gap-2 transition-colors font-medium",
                            comment.likedBy?.includes(user?.uid || '') ? "text-primary" : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          <Heart size={16} className={comment.likedBy?.includes(user?.uid || '') ? "fill-primary" : ""} />
                          <span className="text-sm">{comment.likes > 0 ? comment.likes : 'Like'}</span>
                        </button>
                        <button 
                          onClick={() => setReplyTo(comment.id)}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium"
                        >
                          <Reply size={16} />
                          <span className="text-sm">Reply</span>
                        </button>
                        {comment.replies && comment.replies.length > 0 && (
                          <button 
                            onClick={() => toggleReplies(comment.id)}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium ml-auto bg-primary/10 px-3 py-1.5 rounded-full"
                          >
                            <span className="text-sm font-bold">{showRepliesFor.has(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                            {showRepliesFor.has(comment.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Replies */}
                    {showRepliesFor.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                      <div className="ml-12 mt-4 space-y-4 relative before:absolute before:inset-y-0 before:-left-6 before:w-px before:bg-border/50">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="flex gap-3 group/reply relative">
                            <div className="absolute top-4 -left-6 w-4 h-px bg-border/50"></div>
                            <Link to={`/channel/${reply.userId}`} className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0 z-10">
                              <img referrerPolicy="no-referrer" src={reply.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`} alt="User" className="w-full h-full object-cover" />
                            </Link>
                            <div className="flex-1 bg-muted/10 hover:bg-muted/20 transition-colors p-4 rounded-2xl border border-border/50">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Link to={`/channel/${reply.userId}`} className="font-bold text-sm hover:text-primary transition-colors">{reply.userName}</Link>
                                  <span className="text-muted-foreground text-[10px]">{formatDistanceToNow(new Date(reply.createdAt.toMillis ? reply.createdAt.toMillis() : reply.createdAt))} ago</span>
                                </div>
                                {(isAdmin || (user && reply.userId === user.uid)) && (
                                  <button 
                                    onClick={() => handleReplyDelete(comment.id, reply.id, reply.userId)}
                                    className="text-red-500 hover:text-red-600 transition-colors p-1 opacity-0 group-hover/reply:opacity-100"
                                    title="Delete Reply"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{reply.text}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <button 
                                  onClick={() => handleReplyLike(comment.id, reply.id)}
                                  className={cn(
                                    "flex items-center gap-1 transition-colors font-medium text-[10px]",
                                    reply.likedBy?.includes(user?.uid || '') ? "text-primary" : "text-muted-foreground hover:text-primary"
                                  )}
                                >
                                  <Heart size={12} className={reply.likedBy?.includes(user?.uid || '') ? "fill-primary" : ""} />
                                  <span>{reply.likes > 0 ? reply.likes : 'Like'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {replyTo === comment.id && (
                      <div className="ml-12 mt-4 flex gap-3 relative before:absolute before:inset-y-0 before:-left-6 before:w-px before:bg-border/50">
                        <div className="absolute top-6 -left-6 w-4 h-px bg-border/50"></div>
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 bg-muted/30 border border-border/50 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm text-foreground z-10"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleReplySubmit(comment.id)}
                          className="bg-primary px-6 py-3 rounded-2xl font-bold text-sm text-white hover:bg-primary/90 transition-all z-10"
                        >
                          Reply
                        </button>
                        <button 
                          onClick={() => setReplyTo(null)}
                          className="text-muted-foreground hover:text-foreground transition-colors text-sm px-2 z-10"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Video Modal */}
      {showDeleteVideoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black mb-4 text-red-500">Delete Video</h3>
            <p className="text-muted-foreground mb-8">
              Are you sure you want to delete this video? This will also delete all comments and replies. <strong className="text-foreground">THIS ACTION IS PERMANENT.</strong>
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

export default Watch;
