import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Hash, Smile, Send, Loader2, X } from 'lucide-react';
import { useAuth } from '../../AuthProvider';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';

export const CreatePostBox: React.FC = () => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showTags, setShowTags] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setIsFocused(true);
    }
  };

  const uploadToCloudflare = async (file: File): Promise<string> => {
    const res = await fetch("/api/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type })
    });
    if (!res.ok) throw new Error("Failed to generate signed URL");
    const { signedUrl, publicUrl } = await res.json();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(publicUrl);
        else reject(new Error("Upload failed"));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !imageFile && !imagePreview) || !user) return;
    setIsSubmitting(true);
    try {
      let finalImageUrl = imagePreview && !imageFile ? imagePreview : null;
      if (imageFile) {
        finalImageUrl = await uploadToCloudflare(imageFile);
      }

      await addDoc(collection(db, 'communityPosts'), {
        title: '',
        content: content,
        imageURL: finalImageUrl,
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        creatorId: user.uid,
        creatorName: profile?.username || profile?.displayName || user.displayName || 'Anonymous',
        creatorAvatar: profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        creatorRole: profile?.role || (user.email === 'fcazlan@gmail.com' ? 'admin' : 'Student'),
        createdAt: serverTimestamp(),
        upvotes: 0,
        comments: 0
      });
      
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      setTagsInput('');
      setShowTags(false);
      toast.success('Post created!');
    } catch (error: any) {
      toast.error('Failed to post: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-[#0f1115] border rounded-[2rem] p-5 shadow-2xl transition-all duration-300 relative overflow-hidden ${isFocused || imagePreview ? 'border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.1)]' : 'border-white/5'}`}>
      
      {isFocused && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[60px] pointer-events-none"></div>
      )}

      <div className="flex gap-4 relative z-10">
        <img 
          src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'User'}`} 
          alt="Avatar" 
          className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent bg-muted"
        />
        
        <div className="flex-1 min-w-0">
          <textarea
            placeholder="What's on your mind? Share your thoughts, ask questions, or announce something..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { if (!imagePreview && !content) setIsFocused(false) }}
            className="w-full bg-transparent text-white placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px] text-lg py-2"
            rows={isFocused || content.length > 0 || imagePreview ? 3 : 1}
          />
          
          {imagePreview && (
            <div className="relative mt-2 mb-4 max-w-sm rounded-xl overflow-hidden border border-white/10">
              <img src={imagePreview} alt="Preview" className="w-full h-auto" />
              <button 
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {showTags && (
            <div className="mt-2 mb-4 space-y-2">
              <input
                type="text"
                placeholder="Add tags (comma separated) e.g. web, coding, css"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
              <input
                type="url"
                placeholder="Or paste an image URL to save storage"
                value={imagePreview || ''}
                onChange={(e) => {
                  setImageFile(null);
                  setImagePreview(e.target.value || null);
                  setIsFocused(true);
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
            </div>
          )}
          
          <div className={`flex items-center justify-between pt-3 transition-opacity duration-300 ${isFocused || content || imagePreview ? 'opacity-100' : 'opacity-50'}`}>
            <div className="flex items-center gap-1">
              <input 
                 type="file" 
                 accept="image/*" 
                 ref={fileInputRef}
                 className="hidden" 
                 onChange={handleImageChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center justify-center cursor-pointer">
                <ImageIcon size={20} />
              </button>
              <button 
                onClick={() => setShowTags(!showTags)}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${showTags ? 'text-blue-400 bg-blue-400/10' : 'text-muted-foreground hover:text-blue-400 hover:bg-blue-400/10'}`}
              >
                <Hash size={20} />
              </button>
              <button className="p-2 text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 rounded-full transition-colors flex items-center justify-center">
                <Smile size={20} />
              </button>
            </div>
            
            <button 
              onClick={(e) => { e.preventDefault(); handleSubmit(); }}
              disabled={(!content.trim() && !imageFile && !imagePreview) || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg ${
                (content.trim().length > 0 || imageFile || imagePreview) && !isSubmitting
                  ? 'bg-primary text-white shadow-primary/20 hover:scale-105' 
                  : 'bg-white/5 text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <>Post <Send size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
