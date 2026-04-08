import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthProvider';
import { ThemeProvider } from './ThemeContext';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Apply from './pages/Apply';
import Upload from './pages/Upload';
import Clubs from './pages/Clubs';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Search from './pages/Search';
import Onboarding from './pages/Onboarding';
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import Credits from './pages/Credits';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  
  if (!profile?.studentId) return <Navigate to="/onboarding" />;
  
  return <>{children}</>;
};

const AuthWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  
  // If user is logged in but hasn't completed onboarding, force them to onboarding page
  // unless they are already on the onboarding page
  if (user && profile && !profile.studentId && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-center" richColors theme="dark" />
        <Router>
          <ScrollToTop />
          <AuthWrapper>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/watch/:videoId" element={<Watch />} />
                <Route path="/apply" element={<Apply />} />
                <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
                <Route path="/clubs" element={<Clubs />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/search" element={<Search />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/channel/:userId" element={<UserProfile />} />
                <Route path="/credits" element={<Credits />} />
                {/* Fallback for other routes */}
                <Route path="*" element={<div className="text-center py-20 text-white/50">Page coming soon...</div>} />
              </Routes>
            </Layout>
          </AuthWrapper>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
