import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'sonner';
import { LogIn, UserPlus, GraduationCap } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pre-validation for MMU emails
    const isMMU = email.endsWith('mmu.edu.my') || email === 'fcazlan@gmail.com';
    if (!isMMU) {
      toast.error('Access Denied', { 
        description: 'Only MMU student emails (@student.mmu.edu.my or @mmu.edu.my) are allowed.' 
      });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Signed in successfully!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully!');
      }
      navigate('/');
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      let errorMessage = error.message || 'Please check your credentials and try again.';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. If you do not have an account yet, please switch to "Sign Up" below.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Please switch to "Sign In".';
      }

      toast.error('Authentication failed', { 
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#00205B] rounded-3xl p-8 shadow-2xl border border-white/10 text-white">
        <div className="text-center mb-8">
          <div className="bg-[#E31837] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-white/60 mt-2">
            {isLogin ? 'Sign in to continue to MMUWatch' : 'Join the MMUWatch community'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-white/50">
              MMU Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@student.mmu.edu.my"
              className="w-full bg-[#00153B] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#E31837] transition-all text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-widest text-white/50">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#00153B] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-[#E31837] transition-all text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#E31837] text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : isLogin ? (
              <>
                <LogIn size={20} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={20} /> Sign Up
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-white/60 hover:text-white transition-colors font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
