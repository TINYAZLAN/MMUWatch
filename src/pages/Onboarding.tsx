import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthProvider';
import { toast } from 'sonner';

import { FACULTIES, DEPARTMENTS } from '../constants';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const Onboarding: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    faculty: FACULTIES[0],
    levelOfStudy: 'Degree',
    department: DEPARTMENTS[0],
    studentId: '',
    displayName: '',
    username: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    // If already onboarded, redirect
    if (profile?.studentId) {
      navigate('/');
    }
  }, [profile, navigate, user]);

  if (!user) {
    return <div className="text-center py-20">Please log in first.</div>;
  }

  if (profile?.studentId) {
    return null;
  }

  const isStaff = user?.email?.toLowerCase().endsWith('@mmu.edu.my') && !user?.email?.toLowerCase().includes('student');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.displayName.trim().length < 3) {
      toast.error('Full Name must be at least 3 characters long.');
      return;
    }
    if (formData.username.trim().length < 3) {
      toast.error('Username must be at least 3 characters long.');
      return;
    }
    if (!isStaff && !/^\d{3}[a-zA-Z]{2}[a-zA-Z0-9]{5}$/.test(formData.studentId)) {
      toast.error("Student ID must be in format XXXYYZZZZZ (e.g. 121AA12345)");
      return;
    }

    if (isStaff && !/^MM\d{5}$/.test(formData.studentId)) {
      toast.error('Staff ID must be in format MMXXXXX (e.g. MM12345)');
      return;
    }

    setIsSubmitting(true);
    try {
      const role = isStaff ? 'admin' : 'viewer';

      const userData = {
        ...formData,
        faculty: isStaff ? 'Staff' : formData.faculty,
        levelOfStudy: isStaff ? 'Staff' : formData.levelOfStudy,
        department: isStaff ? formData.department : '',
        uid: user.uid,
        email: user.email || '',
        role: role,
        displayName: formData.displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous User',
        username: formData.username || formData.studentId,
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        createdAt: new Date().toISOString(),
        awards: 0,
        followers: [],
        following: [],
        joinedClubs: [],
        likedVideos: [],
        likedComments: [],
        subjects: []
      };

      const profileData = {
        uid: user.uid,
        displayName: userData.displayName,
        username: userData.username,
        photoURL: userData.photoURL,
        faculty: userData.faculty,
        levelOfStudy: userData.levelOfStudy,
        department: userData.department,
        role: userData.role,
        awards: 0,
        followers: [],
        following: [],
        joinedClubs: []
      };

      // Write to private users collection
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      
      // Write to public profiles collection
      await setDoc(doc(db, 'profiles', user.uid), profileData, { merge: true });
      
      // Force reload to get new profile data
      window.location.href = '/';
    } catch (error) {
      console.error('Error saving profile:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-card border border-border rounded-2xl shadow-xl">
      <h2 className="text-2xl font-black mb-6 text-center tracking-tight">Complete Your Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isStaff ? (
          <div>
            <label className="block text-sm font-bold mb-1">Department / Office</label>
            <select 
              name="department" 
              required 
              value={formData.department} 
              onChange={handleChange}
              className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:outline-none focus:border-primary"
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-bold mb-1">Faculty</label>
              <select 
                name="faculty" 
                value={formData.faculty} 
                onChange={handleChange}
                className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:outline-none focus:border-primary"
              >
                {FACULTIES.map(faculty => (
                  <option key={faculty} value={faculty}>{faculty}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Note: Faculty cannot be changed later.</p>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Level of Study</label>
              <select 
                name="levelOfStudy" 
                value={formData.levelOfStudy} 
                onChange={handleChange}
                className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Foundation">Foundation</option>
                <option value="Diploma">Diploma</option>
                <option value="Degree">Degree</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-bold mb-1">{isStaff ? 'MMU ID' : 'Student ID'}</label>
          <input 
            type="text" 
            name="studentId" 
            required 
            value={formData.studentId} 
            onChange={handleChange}
            className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:outline-none focus:border-primary"
            placeholder={isStaff ? "e.g. STAFF123" : "e.g. 1211100000"}
          />
          {!isStaff && <p className="text-[10px] text-muted-foreground mt-1">Must be exactly 10 digits.</p>}
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Full Name</label>
          <input 
            type="text" 
            name="displayName" 
            required 
            value={formData.displayName} 
            onChange={handleChange}
            className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:outline-none focus:border-primary"
            placeholder="Your Full Name"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Username</label>
          <input 
            type="text" 
            name="username" 
            required 
            value={formData.username} 
            onChange={handleChange}
            className="w-full bg-muted border border-border rounded-lg p-3 text-foreground focus:outline-none focus:border-primary"
            placeholder="Choose a unique username"
          />
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors mt-6 shadow-lg shadow-primary/20"
        >
          {isSubmitting ? 'Saving...' : 'Complete Setup'}
        </button>
      </form>
    </div>
  );
};

export default Onboarding;
