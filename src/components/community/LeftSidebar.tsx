import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { Home, Users, Calendar, MessageCircle } from 'lucide-react';

const NAVIGATION_ITEMS: { icon: any; label: string; id: string; badge?: string }[] = [
  { icon: Home, label: 'Posts', id: 'home' },
  { icon: Users, label: 'Clubs', id: 'clubs' },
  { icon: Calendar, label: 'All Events', id: 'events' },
  { icon: MessageCircle, label: 'Lounge', id: 'friends' },
];
import { useNavigate } from 'react-router-dom';

interface LeftSidebarProps {
  activeItem: string;
  setActiveItem: (id: string) => void;
  onlineUsers?: { id?: string, name: string, avatar: string }[];
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeItem, setActiveItem, onlineUsers = [] }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState<'All' | 'Online' | 'Offline'>('All');

  const handleNavClick = (id: string) => {
    if (id === 'events') {
      navigate('/explore');
    } else {
      setActiveItem(id);
    }
  };

  const filteredUsers = onlineUsers.filter(u => {
    if (filter === 'All') return true;
    if (filter === 'Online') return u.isOnline !== false;
    if (filter === 'Offline') return u.isOnline === false;
    return true;
  });

  return (
    <aside className="hidden md:flex lg:w-56 xl:w-64 flex-col gap-2 shrink-0 sticky top-20 py-6">
      <nav className="flex flex-col gap-1.5 w-full">
        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all group relative overflow-hidden",
                isActive 
                  ? "bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white font-medium"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon 
                  size={20} 
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive ? "text-primary stroke-[2.5px]" : "stroke-2"
                  )} 
                />
                <span className="z-10">{item.label}</span>
              </div>
              
              {item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                  {item.badge}
                </span>
              )}
              
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary z-0"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Online Members Widget */}
      {onlineUsers.length > 0 && activeItem !== 'friends' && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-4 px-4">Friends ({onlineUsers.length})</h3>
          <div className="flex flex-col gap-3 px-4">
            {onlineUsers.map((friend, i) => (
              <div 
                key={i} 
                onClick={() => navigate(`/channel/${friend.id}`)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative">
                  <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all" />
                  <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background", friend.isOnline !== false ? "bg-green-500 shadow-[0_0_5px_theme(colors.green.500)]" : "bg-gray-500")}></span>
                </div>
                <span className="text-sm text-foreground/80 group-hover:text-white transition-colors">{friend.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extended Friends Widget for Lounge */}
      {activeItem === 'friends' && (
        <div className="mt-8 pt-6 border-t border-white/5 px-2">
          <div className="bg-[#0f1115] border border-white/5 rounded-[2rem] p-4 shadow-2xl relative overflow-hidden">
            <h3 className="font-black text-white text-base mb-3">Friends List</h3>
            <div className="flex bg-black/40 rounded-xl p-1 mb-4">
              <button onClick={() => setFilter('All')} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors", filter === 'All' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}>All</button>
              <button onClick={() => setFilter('Online')} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors", filter === 'Online' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}>Online</button>
              <button onClick={() => setFilter('Offline')} className={cn("flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors", filter === 'Offline' ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white")}>Offline</button>
            </div>
            <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto hidden-scrollbar">
              {filteredUsers.map((friend, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/channel/${friend.id}`)}
                  className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="relative">
                    <img src={friend.avatar} alt={friend.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all" />
                    <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background", friend.isOnline !== false ? "bg-green-500 shadow-[0_0_5px_theme(colors.green.500)]" : "bg-gray-500")}></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{friend.name}</span>
                    <span className="text-[10px] text-muted-foreground">{friend.isOnline !== false ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
