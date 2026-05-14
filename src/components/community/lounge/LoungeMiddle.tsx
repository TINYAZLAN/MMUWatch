import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';
import { MessageCircle, Hash, Users, BookOpen, User as UserIcon, LogIn, Send, Info } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { handleFirestoreError, OperationType } from '../../../lib/firestore-errors';
import { Message } from '../../../types';
import { Link } from 'react-router-dom';

interface LoungeMiddleProps {
  user: any;
  profile: any;
}

export const LoungeMiddle: React.FC<LoungeMiddleProps> = ({ user, profile }) => {
  if (!user || !profile) {
    return (
      <div className="flex flex-col h-[75vh] w-full bg-[#15171e] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden items-center justify-center p-8 text-center">
        <LogIn size={48} className="text-primary opacity-50 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
        <p className="text-muted-foreground">Please sign in to access the Student Lounge and chat with friends.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'Class' | 'Clubs' | 'Friends'>('Class');
  
  // States for Chat
  const [activeChannel, setActiveChannel] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Class logic
  const DEFAULT_SUBJECTS: Record<string, string[]> = {
    'Faculty of Business (FOB)': ['Accounting 101', 'Business Admin', 'Marketing'],
    'Faculty of Engineering and Technology (FET)': ['Circuit Analysis', 'Engineering Math', 'Electronics'],
    'Faculty of Information Science and Technology (FIST)': ['Data Structures', 'Web Development', 'Software Engineering'],
    'Faculty of Law (FOL)': ['Business Law', 'Criminal Law']
  };

  const [allClubs, setAllClubs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all real clubs from Firestore to get their metadata (logo, name, etc.)
    const q = query(collection(db, 'communityClubs'));
    const unsub = onSnapshot(q, (snap) => {
      setAllClubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';
  
  // Real clubs logic based on joined clubs (check name since we store name)
  const clubChannels = allClubs.filter(c => (profile?.joinedClubs || []).includes(c.name) || (profile?.subjects || []).includes(c.name));

  // Friends logic
  const [friendsTab, setFriendsTab] = useState<'Personal' | 'Group'>('Personal');
  const [friendNames, setFriendNames] = useState<Record<string, string>>({});
  const friendsList = profile?.friends || [];
  const DEFAULT_GROUPS = ['Study Group Alpha', 'Project Team'];

  const getPrivateChannelId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  useEffect(() => {
    // Select default channel based on tab
    if (activeTab === 'Class') {
      let defaultChannel = 'General Class';
      if (isAdmin) {
        defaultChannel = DEFAULT_SUBJECTS['Faculty of Business (FOB)'][0];
      } else {
        if (profile?.subjects && profile.subjects.length > 0) {
          defaultChannel = profile.subjects[0];
        } else if (profile?.faculty && DEFAULT_SUBJECTS[profile.faculty]) {
          defaultChannel = DEFAULT_SUBJECTS[profile.faculty][0];
        }
      }
      setActiveChannel(defaultChannel);
    }
    if (activeTab === 'Clubs') setActiveChannel(''); // Require clicking a club
    if (activeTab === 'Friends') {
      if (friendsTab === 'Personal' && friendsList.length > 0) setActiveChannel(friendsList[0]);
      else if (friendsTab === 'Group') setActiveChannel(DEFAULT_GROUPS[0]);
    }
  }, [activeTab, friendsTab]);

  useEffect(() => {
    const fetchFriendNames = async () => {
      if (!profile?.friends || profile.friends.length === 0) return;
      const names: Record<string, string> = {};
      for (const fId of profile.friends) {
        if (!friendNames[fId]) {
          try {
            const fDoc = await getDoc(doc(db, 'users', fId));
            if (fDoc.exists()) {
              names[fId] = fDoc.data().username || fDoc.data().displayName || 'User';
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
      if (Object.keys(names).length > 0) {
        setFriendNames(prev => ({ ...prev, ...names }));
      }
    };
    fetchFriendNames();
  }, [profile?.friends]);

  useEffect(() => {
    if (!activeChannel) return;

    let channelId = activeChannel;
    if (activeTab === 'Friends' && friendsTab === 'Personal') {
      channelId = getPrivateChannelId(user.uid, activeChannel);
    }

    const q = query(
      collection(db, 'messages'), 
      where('channel', '==', channelId),
      orderBy('createdAt', 'desc'), 
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
      setMessages(msgs);
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [activeChannel, activeTab, friendsTab, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    let channelId = activeChannel;
    if (activeTab === 'Friends' && friendsTab === 'Personal') {
      channelId = getPrivateChannelId(user.uid, activeChannel);
    }

    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        userName: profile?.username || profile?.displayName || user.displayName || 'Student',
        text: newMessage,
        channel: channelId,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getChannelName = () => {
    if (activeTab === 'Friends' && friendsTab === 'Personal') {
      return friendNames[activeChannel] || 'Friend';
    }
    if (activeTab === 'Clubs') {
      const c = clubChannels.find(c => c.id === activeChannel);
      return c ? c.name : activeChannel;
    }
    return activeChannel;
  };

  const activeClubBg = activeTab === 'Clubs' && activeChannel ? clubChannels.find(c => c.id === activeChannel)?.bg || 'bg-card' : 'bg-card';

  return (
    <div className="flex flex-col h-[75vh] w-full bg-[#15171e] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">
      
      {/* Top Navigation Tabs */}
      <div className="flex bg-[#0f1115] p-2 border-b border-border">
        {(['Class', 'Clubs', 'Friends'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-all rounded-xl",
              activeTab === tab ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-white/5 hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sub-Sidebar (Channel selector) */}
        <div className="w-1/3 max-w-[200px] bg-[#0f1115]/50 border-r border-border overflow-y-auto flex flex-col p-3 gap-2">
          
          {activeTab === 'Class' && (
            <div className="flex flex-col gap-4 pb-4">
              {Object.entries(DEFAULT_SUBJECTS)
                .filter(([faculty]) => isAdmin || !profile?.faculty || profile.faculty === faculty)
                .map(([faculty, subjects]) => (
                <div key={faculty} className="flex flex-col gap-1">
                  <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-2 mb-1">{faculty}</h4>
                  {subjects.map(ch => (
                    <button
                      key={ch}
                      onClick={() => setActiveChannel(ch)}
                      className={cn(
                        "p-2.5 rounded-xl text-left font-bold transition-colors flex items-center gap-2 text-sm",
                        activeChannel === ch ? "bg-primary/20 text-primary border border-primary/30" : "bg-black/20 text-muted-foreground hover:text-white"
                      )}
                    >
                      <BookOpen size={14} />
                      <span className="truncate">{ch}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Clubs' && (
            <div className="flex flex-col gap-3">
              {clubChannels.length > 0 ? clubChannels.map(club => (
                <button
                  key={club.id}
                  onClick={() => setActiveChannel(club.id)}
                  className={cn(
                    "p-4 rounded-xl text-left transition-all relative overflow-hidden group shadow-lg border border-white/10",
                    club.bg || "bg-card",
                    activeChannel === club.id ? "ring-2 ring-white scale-[1.02] grayscale-0 opacity-100" : "opacity-80 hover:opacity-100 grayscale hover:grayscale-0"
                  )}
                >
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                  <div className="relative z-10 flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-3xl">{club.emoji || club.logo || '🎪'}</span>
                    <span className={cn("text-white font-bold text-sm tracking-tight", club.font || "font-sans")}>{club.name}</span>
                  </div>
                </button>
              )) : (
                <p className="text-xs text-center text-muted-foreground mt-4">You haven't joined any clubs.</p>
              )}
            </div>
          )}

          {activeTab === 'Friends' && (
             <div className="flex flex-col h-full gap-2">
               <div className="flex bg-black/40 rounded-lg p-1 mb-2">
                 <button onClick={() => setFriendsTab('Personal')} className={cn("flex-1 text-[10px] font-bold py-1 rounded-md", friendsTab === 'Personal' ? "bg-primary text-white" : "text-muted-foreground")}>Friends</button>
                 <button onClick={() => setFriendsTab('Group')} className={cn("flex-1 text-[10px] font-bold py-1 rounded-md", friendsTab === 'Group' ? "bg-primary text-white" : "text-muted-foreground")}>Groups</button>
               </div>
               
               {friendsTab === 'Personal' ? (
                 friendsList.length > 0 ? friendsList.map((fId: string) => (
                   <button
                     key={fId}
                     onClick={() => setActiveChannel(fId)}
                     className={cn(
                       "p-2 rounded-xl text-left font-bold transition-colors flex items-center gap-2 text-sm",
                       activeChannel === fId ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                     )}
                   >
                     <UserIcon size={14} />
                     <span className="truncate">{friendNames[fId] || 'User'}</span>
                   </button>
                 )) : <p className="text-xs text-muted-foreground text-center mt-4">No friends added.</p>
               ) : (
                 DEFAULT_GROUPS.map(g => (
                   <button
                     key={g}
                     onClick={() => setActiveChannel(g)}
                     className={cn(
                       "p-2 rounded-xl text-left font-bold transition-colors flex items-center gap-2 text-sm",
                       activeChannel === g ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                     )}
                   >
                     <Users size={14} />
                     <span className="truncate">{g}</span>
                   </button>
                 ))
               )}
               
               {friendsTab === 'Group' && (
                 <button className="mt-auto bg-primary/20 text-primary text-xs py-2 rounded-lg font-bold hover:bg-primary hover:text-white transition-colors">
                   + Create Group
                 </button>
               )}
             </div>
          )}

        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative w-full overflow-hidden bg-card/50">
          
          {activeChannel ? (
            <>
              {/* Optional Custom background for clubs */}
              {activeTab === 'Clubs' && (
                <div className={cn("absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay", activeClubBg)}></div>
              )}

              {/* Chat Header */}
              <div className="bg-[#0f1115]/80 backdrop-blur-md p-4 border-b border-white/5 z-10 flex items-center shadow-md">
                <Hash size={18} className="text-primary mr-2" />
                <h3 className="font-bold text-white text-lg">{getChannelName()}</h3>
              </div>

              {/* Messages List */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
                {messages.length > 0 ? messages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col max-w-[75%]", msg.userId === user.uid ? "ml-auto items-end" : "items-start")}>
                    <Link to={`/channel/${msg.userId}`} className="text-xs text-muted-foreground mb-1 px-1 hover:text-primary transition-colors font-medium">
                      {msg.userName}
                    </Link>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[15px] shadow-sm", 
                      msg.userId === user.uid ? "bg-primary text-white rounded-br-sm" : "bg-black/40 text-white rounded-bl-sm border border-white/5"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3 opacity-60">
                    <MessageCircle size={48} />
                    <p>Start a conversation!</p>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-4 bg-[#0f1115]/90 backdrop-blur-md border-t border-white/5 z-10">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message #${getChannelName().toLowerCase().replace(/\s+/g, '-')}...`} 
                    className="w-full bg-black/50 border border-white/10 rounded-full pl-5 pr-12 py-3 text-[15px] focus:outline-none focus:border-primary text-white transition-all shadow-inner"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 bg-primary text-white p-2 rounded-full disabled:opacity-50 disabled:grayscale hover:scale-105 transition-all shadow-lg">
                    <Send size={16} className="ml-[1px]" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle size={64} className="opacity-20 mb-4" />
              <p className="text-lg font-medium">Select a channel to start chatting</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
