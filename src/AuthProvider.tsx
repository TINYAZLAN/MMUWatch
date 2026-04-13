import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const isMMU = firebaseUser.email?.endsWith('mmu.edu.my') || firebaseUser.email === 'fcazlan@gmail.com';
        if (!isMMU) {
          await auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsAuthReady(true);
          toast.error('Access Denied', {
            description: 'Only MMU student emails (@student.mmu.edu.my or @mmu.edu.my) are allowed.'
          });
          return;
        }

        // Listen to profile in real-time
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            // Create new profile if it doesn't exist
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              role: 'viewer',
              subscriptions: [],
              watchHistory: [],
              savedVideos: [],
              followers: [],
              followerCount: 0,
              following: [],
              followingCount: 0,
              awards: 0,
              joinedClubs: []
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            } catch (err) {
              console.error("Error creating initial profile:", err);
              // We still want to stop loading even if creation fails
            }
            // onSnapshot will fire again after creation
          }
          setLoading(false);
          setIsAuthReady(true);
        }, (error) => {
          console.error("Profile listener error:", error);
          setLoading(false);
          setIsAuthReady(true);
        });
      } else {
        setProfile(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = useMemo(() => ({ 
    user, 
    profile, 
    loading, 
    isAuthReady 
  }), [user, profile, loading, isAuthReady]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
