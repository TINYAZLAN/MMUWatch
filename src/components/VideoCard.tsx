import React from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, CheckCircle2, Bookmark } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { VideoMetadata } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthProvider';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

interface VideoCardProps {
  video: VideoMetadata;
  className?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, className }) => {
  const { user, profile } = useAuth();
  const isSaved = profile?.savedVideos?.includes(video.id);
  const watchPath = `/watch/${video.id}`;

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
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

  const formatDuration = (seconds?: number) => {
    if (!seconds || isNaN(seconds) || seconds === 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  let thumbSrc = video.thumbnailURL || `https://picsum.photos/seed/${video.id}/1280/720`;
  if (
    thumbSrc && 
    (thumbSrc.includes('r2.dev') || thumbSrc.includes('r2.cloudflarestorage.com'))
  ) {
    if (
      !thumbSrc.includes('img.youtube.com') && 
      !thumbSrc.includes('i.ytimg.com')
    ) {
      const key = thumbSrc.split('/').pop();
      thumbSrc = `/api/video/${key}`;
    }
  }

  return (
    <div className={cn("group flex flex-col gap-3 cursor-pointer", className)}>
      {/* Thumbnail */}
      <Link to={watchPath} className="relative aspect-video rounded-xl overflow-hidden bg-muted">
        <img referrerPolicy="no-referrer"   
          src={thumbSrc} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          
        />
        {formatDuration(video.duration) && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
            {formatDuration(video.duration)}
          </div>
        )}
        <button 
          onClick={handleSave}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100",
            isSaved ? "bg-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
          )}
        >
          <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </Link>

      {/* Info */}
      <div className="flex gap-3 px-1">
        <Link to={`/channel/${video.creatorId}`} className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-muted border border-border">
          <img referrerPolicy="no-referrer"   
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${video.creatorId}`} 
            alt="Creator" 
            className="w-full h-full object-cover"
            
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={watchPath}>
            <h3 className="font-black text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors tracking-tight">
              {video.title}
            </h3>
          </Link>
          <div className="mt-1 flex flex-col text-[11px] text-muted-foreground font-medium">
            <Link to={`/channel/${video.creatorId}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
              {video.creatorName || `Student-${video.creatorId.slice(0, 5)}`}
              <CheckCircle2 size={12} fill="currentColor" className="text-primary" />
            </Link>
            <p className="mt-0.5">
              {video.views.toLocaleString()} views • {formatDistanceToNow(new Date(video.createdAt.toMillis ? video.createdAt.toMillis() : video.createdAt))} ago
            </p>
          </div>
        </div>
        <button className="flex-shrink-0 p-1 h-fit hover:bg-muted rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical size={18} className="text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default VideoCard;
