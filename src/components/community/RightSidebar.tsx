import React, { useEffect, useState } from 'react';
import { Calendar, Hash, Users, ChevronRight, MapPin, Loader2 } from 'lucide-react';
import { HOT_TOPICS, SUGGESTED_CLUBS } from './mockData';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../AuthProvider';
import { toast } from 'sonner';

export const RightSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(3));
    const unsub = onSnapshot(q, (snapshot) => {
      setUpcomingEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return () => unsub();
  }, []);

  const handleJoinClub = async (clubName: string) => {
    if (!user) {
      toast.error("Please sign in to interact with clubs.");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        joinedClubs: arrayUnion(clubName)
      });
      toast.success(`Added ${clubName} to chats!`);
      // Since there is no dedicated chats page, we simulate adding to chat feature
    } catch (error) {
      toast.error("Failed to add club to chat.");
      console.error(error);
    }
  };

  return (
    <aside className="hidden lg:flex w-64 xl:w-80 flex-col gap-6 shrink-0 sticky top-24 pb-12">
      
      {/* Upcoming Events Card */}
      <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-5 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-primary/20 transition-all duration-500"></div>
        
        <div className="flex items-center justify-between mb-5 relative z-10">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Upcoming Events
          </h3>
        </div>
        
        <div className="flex flex-col gap-4 relative z-10">
          {loading ? (
             <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <div key={event.id} onClick={() => navigate('/explore')} className="group/event cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center shrink-0 group-hover/event:bg-primary/20 group-hover/event:border-primary/30 transition-all">
                    <span className="text-[10px] font-bold text-primary uppercase leading-tight">EVENT</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/90 group-hover/event:text-white transition-colors line-clamp-1">{event.title}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin size={10} /> {event.deadline || event.date || 'TBA'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          )}
          
          <button 
            onClick={() => navigate('/explore')}
            className="w-full mt-2 text-xs font-bold text-primary flex items-center justify-center gap-1 hover:text-white transition-colors py-2 rounded-xl hover:bg-white/5"
          >
            View All Events <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Hot Topics */}
      <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-5 shadow-2xl">
        <h3 className="font-bold text-white flex items-center gap-2 mb-4">
          <Hash size={18} className="text-blue-500" />
          Hot Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {HOT_TOPICS.map((topic, i) => (
            <span 
              key={i} 
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/10 cursor-pointer transition-all"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Suggested Clubs */}
      <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-5 shadow-2xl">
        <h3 className="font-bold text-white flex items-center gap-2 mb-4">
          <Users size={18} className="text-purple-500" />
          Suggested Clubs
        </h3>
        <div className="flex flex-col gap-4">
          {SUGGESTED_CLUBS.map((club) => (
            <div key={club.id} onClick={() => handleJoinClub(club.name)} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 font-bold text-white/80 group-hover:border-purple-500/50 transition-all">
                  {club.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">{club.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{club.members} members</p>
                </div>
              </div>
              <button className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-purple-500 hover:text-white transition-colors">
                <Users size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

    </aside>
  );
};
