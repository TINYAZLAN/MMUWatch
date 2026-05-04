import React, { useState } from 'react';
import { cn } from '../../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface LoungeRightSidebarProps {
  profile: any;
  onlineUsers: any[];
}

export const LoungeRightSidebar: React.FC<LoungeRightSidebarProps> = ({ profile, onlineUsers }) => {
  const [filter, setFilter] = useState<'All' | 'Online' | 'Offline'>('All');
  const navigate = useNavigate();

  // Mocking offline users for now (anyone in friends not in onlineUsers)
  const allFriends = profile?.friends || [];
  
  // Since we only get top 10 as online in the community page effect, we'll pretend some are offline.
  // Ideally, we'd have a real presence system.
  const displayUsers = onlineUsers.map((u, i) => ({
    ...u,
    isOnline: i % 3 !== 0 // Just mock some to be offline 
  }));

  const filteredUsers = displayUsers.filter(u => {
    if (filter === 'All') return true;
    if (filter === 'Online') return u.isOnline;
    if (filter === 'Offline') return !u.isOnline;
    return true;
  });

  return (
    <aside className="hidden lg:flex w-80 flex-col gap-6 shrink-0 sticky top-20 pb-10">
      <div className="bg-[#0f1115] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
        <h3 className="font-black text-white text-lg mb-4">Friends List</h3>
        
        {/* Filters */}
        <div className="flex bg-black/40 rounded-xl p-1 mb-4">
          {['All', 'Online', 'Offline'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "flex-1 text-xs font-bold py-1.5 rounded-lg transition-all",
                filter === f ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredUsers.length > 0 ? filteredUsers.map((friend) => (
            <div 
              key={friend.id} 
              onClick={() => navigate(`/channel/${friend.id}`)}
              className="flex items-center gap-3 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <div className="relative">
                <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all" />
                <span className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background shadow-md",
                  friend.isOnline ? "bg-green-500 shadow-[0_0_5px_theme(colors.green.500)]" : "bg-gray-500"
                )}></span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{friend.name}</span>
                <span className="text-xs text-muted-foreground">{friend.isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          )) : (
            <p className="text-muted-foreground text-sm text-center py-4">No friends found.</p>
          )}
        </div>
      </div>
    </aside>
  );
};
