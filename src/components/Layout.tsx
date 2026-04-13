import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Bell, Video, Home, Compass, GraduationCap, Users, Upload, LogIn, LogOut, MessageCircle, X, Send, Hash } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, getDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { Message } from '../types';
import { toast } from 'sonner';
import Footer from './Footer';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../ThemeContext';

const ChatPopup = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Global' | 'Class' | 'Clubs' | 'Friends'>('Global');
  const [activeChannel, setActiveChannel] = useState('Joint-Campus Chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const joinedClubs = profile?.joinedClubs || [];

  const [friendNames, setFriendNames] = useState<Record<string, string>>({});

  const getPrivateChannelId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  const channelCategories = {
    Global: ['Joint-Campus Chat', 'Cyberjaya Campus Chat', 'Melaka Campus Chat'],
    Class: profile?.faculty ? [profile.faculty] : ['General Class'],
    Clubs: joinedClubs.length > 0 ? joinedClubs : ['No clubs joined'],
    Friends: profile?.friends || []
  };

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
    if (!isOpen || !user) return;

    const isFriendChannel = channelCategories.Friends.includes(activeChannel);
    const channelId = isFriendChannel ? getPrivateChannelId(user.uid, activeChannel) : activeChannel;

    const q = query(
      collection(db, 'messages'), 
      where('channel', '==', channelId),
      orderBy('createdAt', 'desc'), 
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).reverse();
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [isOpen, user, activeChannel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    // Public category restriction: only admins can type
    const isGlobalChannel = channelCategories.Global.includes(activeChannel);
    if (isGlobalChannel && !isAdmin) {
      toast.error("Only administrators can post in global channels.");
      return;
    }

    const isFriendChannel = channelCategories.Friends.includes(activeChannel);
    const channelId = isFriendChannel ? getPrivateChannelId(user.uid, activeChannel) : activeChannel;

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

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-[#E31837] text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-colors hover:scale-105 z-50 flex items-center justify-center"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-[450px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="bg-muted p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <MessageCircle size={18} className="text-primary" />
              Student Lounge
            </h3>
          </div>

          <div className="flex border-b border-border bg-card">
            {(Object.keys(channelCategories) as Array<keyof typeof channelCategories>).map(c => (
              <button
                key={c}
                onClick={() => {
                  setActiveCategory(c);
                  setActiveChannel(channelCategories[c][0]);
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1",
                  activeCategory === c ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Hash size={12} /> {c}
              </button>
            ))}
          </div>
          
          <div className="bg-muted p-2 border-b border-border">
            <select 
              value={activeChannel}
              onChange={(e) => setActiveChannel(e.target.value)}
              className="w-full bg-card text-foreground text-xs p-2 rounded border border-border focus:outline-none focus:border-primary"
            >
              {channelCategories[activeCategory].map(ch => (
                <option key={ch} value={ch}>{friendNames[ch] || ch}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.userId === user.uid ? "ml-auto items-end" : "items-start")}>
                <Link to={`/channel/${msg.userId}`} onClick={() => setIsOpen(false)} className="text-[10px] text-muted-foreground mb-1 px-1 hover:text-primary transition-colors">
                  {msg.userName}
                </Link>
                <div className={cn("px-3 py-2 rounded-2xl text-sm", msg.userId === user.uid ? "bg-primary text-white rounded-br-none" : "bg-muted text-foreground rounded-bl-none")}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-muted border-t border-border flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${(friendNames[activeChannel] || activeChannel).toLowerCase().replace(/\s+/g, '-')}...`} 
              className="flex-1 bg-card rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground border border-border"
            />
            <button type="submit" disabled={!newMessage.trim()} className="bg-primary text-white p-2 rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'fcazlan@gmail.com';

  return (
    <div className={cn("min-h-screen font-sans transition-colors duration-300 bg-background text-foreground")}>
      {/* Top Navigation Dashboard */}
      <header className={cn("fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 border-b shadow-lg transition-colors duration-300 bg-card border-border")}>
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <img referrerPolicy="no-referrer" src="MMU LOGO.svg" alt="MMU Logo" className="h-8 bg-white p-1 rounded-md group-hover:opacity-90 transition-opacity" />
            <span className={cn("text-2xl font-black tracking-tighter transition-colors text-foreground group-hover:text-primary")}>MMUWatch</span>
          </Link>

          {/* Main Nav Links */}
          <nav className="hidden md:flex items-center gap-6 font-semibold text-sm">
            <Link to="/" className={cn("flex items-center gap-2 transition-colors text-muted-foreground hover:text-primary")}><Home size={18} /> Home</Link>
            <Link to="/clubs" className={cn("flex items-center gap-2 transition-colors text-muted-foreground hover:text-primary")}><Users size={18} /> Clubs</Link>
            <Link to="/explore" className={cn("flex items-center gap-2 transition-colors text-muted-foreground hover:text-primary")}><Compass size={18} /> Explore</Link>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden lg:block">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, clubs, or assignments..."
              className={cn("w-full border rounded-full py-2 px-4 pl-10 focus:outline-none focus:border-primary transition-all bg-muted border-border text-foreground")}
            />
            <Search className={cn("absolute left-3 text-muted-foreground")} size={18} />
          </form>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={cn("lg:hidden p-2 rounded-full transition-colors hover:bg-muted text-muted-foreground")}
          >
            <Search size={20} />
          </button>

          {!user && (
            <a href="https://www.mmu.edu.my" target="_blank" rel="noopener noreferrer" className={cn("hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full font-bold transition-colors bg-primary text-white hover:bg-primary/90")}>
              <GraduationCap size={18} />
              Apply Now
            </a>
          )}
          
          {user ? (
            <>
              <Link to="/upload" className="hidden sm:flex items-center gap-2 bg-primary text-white px-4 py-1.5 rounded-full font-bold hover:bg-primary/90 transition-colors">
                <Upload size={18} />
                Upload
              </Link>
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen);
                    setIsProfileOpen(false);
                  }}
                  className={cn("p-2 rounded-full hidden sm:block transition-colors hover:bg-muted text-muted-foreground")}
                >
                  <Bell size={20} />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className={cn("absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl p-2 border z-50 bg-card border-border text-foreground")}>
                    <div className={cn("px-4 py-3 border-b mb-2 flex items-center justify-between border-border")}>
                      <p className="font-bold">Notifications</p>
                      <button 
                        onClick={async () => {
                          const batch = notifications.filter(n => !n.read);
                          for (const n of batch) {
                            await updateDoc(doc(db, 'notifications', n.id), { read: true });
                          }
                          toast.success("All notifications marked as read");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto space-y-1">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={async () => {
                              if (!n.read) {
                                await updateDoc(doc(db, 'notifications', n.id), { read: true });
                              }
                              setIsNotificationsOpen(false);
                              navigate(`/watch/${n.videoId}`);
                            }}
                            className={cn(
                              "p-3 rounded-lg text-sm transition-colors cursor-pointer", 
                              n.read ? "opacity-60" : "bg-muted/50",
                              "hover:bg-muted"
                            )}
                          >
                            <p className="font-medium">{n.fromName} {n.type === 'like' ? 'liked your video' : n.type === 'comment' ? 'commented on your video' : 'replied to your comment'}</p>
                            <p className={cn("text-xs mt-1 text-muted-foreground")}>{n.videoTitle}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-sm text-muted-foreground">No notifications yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => {
                    setIsProfileOpen(!isProfileOpen);
                    setIsNotificationsOpen(false);
                  }}
                  className={cn("w-9 h-9 rounded-full overflow-hidden border-2 transition-colors border-border hover:border-primary")}
                >
                  <img referrerPolicy="no-referrer" src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" />
                </button>
                
                {isProfileOpen && (
                  <div className={cn("absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl p-2 border z-50 bg-card border-border text-foreground")}>
                    <div className={cn("px-4 py-3 border-b mb-2 border-border")}>
                      <p className="font-bold truncate">{user.displayName}</p>
                      <p className={cn("text-xs truncate text-muted-foreground")}>{user.email}</p>
                      {isAdmin && <span className="inline-block mt-1 text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold">Admin</span>}
                    </div>
                    <Link to="/upload" onClick={() => setIsProfileOpen(false)} className={cn("sm:hidden block px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-primary")}>Upload Video</Link>
                    <Link to={`/profile`} onClick={() => setIsProfileOpen(false)} className={cn("block px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted")}>Your Profile</Link>
                    <button 
                      onClick={() => { toggleTheme(); setIsProfileOpen(false); }} 
                      className={cn("w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted")}
                    >
                      {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </button>
                    <button onClick={() => { handleLogout(); setIsProfileOpen(false); }} className={cn("w-full text-left px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-red-500 mt-1 transition-colors hover:bg-muted")}>
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="flex items-center gap-2 border-2 border-primary text-primary px-4 py-1.5 rounded-full font-bold hover:bg-primary hover:text-white transition-all">
              <LogIn size={18} />
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn("fixed top-16 left-0 right-0 p-4 z-40 border-b lg:hidden bg-card border-border")}
          >
            <form onSubmit={handleSearch} className="relative flex items-center">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campus..."
                className={cn("w-full border rounded-full py-3 px-4 pl-10 focus:outline-none focus:border-primary transition-all bg-muted border-border text-foreground")}
              />
              <Search className={cn("absolute left-3 text-muted-foreground")} size={18} />
              <button 
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="absolute right-3 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn("pt-16 min-h-screen flex flex-col", isMobileSearchOpen && "blur-sm")}>
        <div className="max-w-7xl mx-auto p-6 flex-1 w-full">
          {children}
        </div>
        <Footer />
      </main>

      <ChatPopup />
    </div>
  );
};

export default Layout;
