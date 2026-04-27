import React from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

import { Link, useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: any;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  onTagClick?: (tag: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onDelete, canDelete, onTagClick }) => {
  const navigate = useNavigate();
  const [isUpvoted, setIsUpvoted] = React.useState(post.isUpvoted || false);
  const [upvotes, setUpvotes] = React.useState(post.upvotes || 0);

  const handleUpvote = () => {
    if (isUpvoted) {
      setUpvotes((prev: number) => prev - 1);
      setIsUpvoted(false);
    } else {
      setUpvotes((prev: number) => prev + 1);
      setIsUpvoted(true);
    }
  };

  const getAvatar = () => {
    if (post.author?.avatar) return post.author.avatar;
    if (post.creatorAvatar) return post.creatorAvatar;
    return `https://ui-avatars.com/api/?name=${post.creatorName || 'User'}&background=random`;
  };

  const navigateToProfile = () => {
    if (post.creatorId) {
      navigate(`/channel/${post.creatorId}`);
    }
  };

  const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt.toMillis ? post.createdAt.toMillis() : post.createdAt)) + ' ago' : 'Recently';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0f1115] border border-white/5 rounded-[2rem] p-5 sm:p-6 shadow-2xl relative overflow-hidden group transition-all duration-300 hover:border-white/10"
    >
      {/* Author Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={navigateToProfile}>
          <img 
            src={getAvatar()} 
            alt={post.creatorName || post.author?.name} 
            className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary/30 transition-all"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-base leading-none hover:underline">{post.creatorName || post.author?.name}</h3>
              {post.author?.isOfficial && <CheckCircle2 size={14} className="text-blue-400" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-primary font-medium">{post.author?.role || 'Student'}</span>
              <span className="w-1 h-1 rounded-full bg-white/20"></span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {canDelete && (
            <button 
              onClick={() => onDelete?.(post.id)}
              className="text-muted-foreground hover:text-red-500 p-2 rounded-full hover:bg-white/5 transition-colors"
              title="Delete post"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button className="text-muted-foreground hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mb-5">
        <h4 className="font-bold text-white mb-2 text-lg">{post.title}</h4>
        <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.map((tag: string) => (
              <span 
                key={tag} 
                onClick={() => onTagClick?.(tag)}
                className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded cursor-pointer hover:bg-primary/20 transition-colors"
               >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {(post.image || post.imageURL) && (
          <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 relative group/image cursor-pointer">
            <img src={post.image || post.imageURL} alt="Post content" className="w-full h-auto object-cover max-h-[400px] group-hover/image:scale-[1.02] transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors duration-300"></div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 border-t border-white/5 pt-4">
        <button 
          onClick={handleUpvote}
          className={cn(
            "flex items-center gap-2 text-sm font-medium transition-colors group/btn",
            isUpvoted ? "text-primary" : "text-muted-foreground hover:text-white"
          )}
        >
          <div className={cn(
            "p-2 rounded-full transition-colors",
            isUpvoted ? "bg-primary/20" : "bg-white/5 group-hover/btn:bg-white/10"
          )}>
            <Heart size={18} className={cn(isUpvoted && "fill-primary")} />
          </div>
          <span className={cn(isUpvoted && "font-bold")}>{upvotes}</span>
        </button>

        <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors group/btn">
          <div className="p-2 rounded-full bg-white/5 group-hover/btn:bg-blue-500/20 group-hover/btn:text-blue-400 transition-colors">
            <MessageCircle size={18} />
          </div>
          <span>{post.stats?.comments || post.comments || 0}</span>
        </button>

        <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors group/btn ml-auto">
          <div className="p-2 rounded-full bg-white/5 group-hover/btn:bg-green-500/20 group-hover/btn:text-green-400 transition-colors">
            <Share2 size={18} />
          </div>
        </button>
      </div>
    </motion.div>
  );
};
