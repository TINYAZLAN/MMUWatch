import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Bell, Video, Home, Compass, GraduationCap, Users, Upload, LogIn, LogOut, MessageCircle, X, Send, Hash } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, getDoc, arrayUnion } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../lib/utils';
import { Message } from '../types';
import { toast } from 'sonner';
import Footer from './Footer';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../ThemeContext';
import { MMUText } from './MMUText';

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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsubscribe();
  }, [user]);

  const handleAcceptFriend = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    if (!user || !n.senderId) return;
    try {
      const myRef = doc(db, 'users', user.uid);
      const theirRef = doc(db, 'users', n.senderId);
      
      await updateDoc(myRef, { friends: arrayUnion(n.senderId) });
      await updateDoc(theirRef, { friends: arrayUnion(user.uid) });
      await updateDoc(doc(db, 'notifications', n.id), { read: true, type: 'friend_accept' });
      
      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const renderNotificationText = (n: any) => {
    if (n.message) return n.message;
    return `${n.fromName} ${n.type === 'like' ? 'liked your video' : n.type === 'comment' ? 'commented on your video' : 'replied to your comment'}`;
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
    setIsNotificationsOpen(false);
    if (n.link) {
      navigate(n.link);
    } else if (n.videoId) {
      navigate(`/watch/${n.videoId}`);
    } else if (n.senderId && n.type === 'friend_request') {
      navigate(`/channel/${n.senderId}`);
    }
  };
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
            <div className="bg-transparent rounded-full p-1">
              <img referrerPolicy="no-referrer" src="/mmu-logo.svg" alt="MMU Logo" className="h-8 group-hover:opacity-90 transition-opacity" />
            </div>
            <span className={cn("text-2xl font-black tracking-tighter transition-colors text-foreground group-hover:text-primary")}>
              <MMUText text="MMUWatch" />
            </span>
          </Link>

          {/* Main Nav Links */}
          <nav className="hidden md:flex items-center gap-6 font-semibold text-sm">
            <Link to="/" className={cn("flex items-center gap-2 transition-colors text-muted-foreground hover:text-primary")}><Home size={18} /> Home</Link>
            <Link to="/community" className={cn("flex items-center gap-2 transition-colors text-muted-foreground hover:text-primary")}><Users size={18} /> Community</Link>
            <Link to="/explore" className={cn("flex items-center gap-2 transition-colors text-muted-foreground hover:text-primary")}><Compass size={18} /> Explore</Link>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden lg:flex justify-center">
          <Link to="/search" className="relative flex items-center w-full max-w-md group">
            <div className={cn("w-full border rounded-full py-2 px-4 pl-10 flex items-center text-muted-foreground transition-all bg-muted border-border group-hover:border-primary group-hover:bg-background")}>
              <span className="truncate">Search videos, tags, clubs...</span>
            </div>
            <Search className={cn("absolute left-3 text-muted-foreground group-hover:text-primary transition-colors")} size={18} />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            to="/search"
            className={cn("lg:hidden p-2 rounded-full transition-colors hover:bg-muted text-muted-foreground")}
          >
            <Search size={20} />
          </Link>

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
                            onClick={() => handleNotificationClick(n)}
                            className={cn(
                              "p-3 rounded-lg text-sm transition-colors cursor-pointer", 
                              n.read ? "opacity-60" : "bg-muted/50",
                              "hover:bg-muted"
                            )}
                          >
                            <div className="flex gap-3">
                              {n.senderAvatar && <img src={n.senderAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[13px]">{renderNotificationText(n)}</p>
                                {n.videoTitle && <p className={cn("text-xs mt-1 text-muted-foreground truncate")}>{n.videoTitle}</p>}
                                
                                {n.type === 'friend_request' && !n.read && (
                                  <button
                                    onClick={(e) => handleAcceptFriend(e, n)}
                                    className="mt-2 text-xs bg-primary text-white px-3 py-1.5 rounded-full font-bold hover:bg-primary/90"
                                  >
                                    Accept
                                  </button>
                                )}
                              </div>
                            </div>
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
    </div>
  );
};

export default Layout;

