import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Upload as UploadIcon, CheckCircle2, FileVideo, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import { FACULTIES, SUBJECTS_BY_FACULTY, ASSIGNMENTS_BY_SUBJECT } from '../constants';

const Upload: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: ''
  });

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const userFaculty = profile?.faculty || FACULTIES[0];
  const availableSubjects = SUBJECTS_BY_FACULTY[userFaculty] || [];
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const [assignments, setAssignments] = useState<{ id: string, name: string, keyword: string, done: boolean, exampleFormat: string }[]>([]);

  // Set initial subject if available
  React.useEffect(() => {
    if (availableSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(availableSubjects[0]);
      setFormData(prev => ({ ...prev, category: availableSubjects[0] }));
    }
  }, [availableSubjects, selectedSubject]);

  // Update assignments when subject changes
  React.useEffect(() => {
    if (selectedSubject && ASSIGNMENTS_BY_SUBJECT[selectedSubject]) {
      setAssignments(ASSIGNMENTS_BY_SUBJECT[selectedSubject].map(a => ({ ...a, done: false })));
    } else {
      setAssignments([]);
    }
  }, [selectedSubject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isMp4 = file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.mp4v');
      if (!isMp4) {
        toast.error('Only MP4 or MP4V video files are allowed.');
        e.target.value = '';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        e.target.value = '';
        return;
      }
      setFileObj(file);
      setFileName(file.name);
      
      const lowerName = file.name.toLowerCase();
      setAssignments(prev => prev.map(a => ({
        ...a,
        done: lowerName.includes(a.keyword.toLowerCase()) ? true : a.done
      })));

      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, "") }));
      }

      // Extract duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (!isNaN(video.duration) && video.duration !== Infinity) {
          setVideoDuration(video.duration);
        }
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fileObj) return;

    // Validation
    if (formData.title.trim().length < 5) {
      toast.error('Title must be at least 5 characters long.');
      return;
    }
    if (formData.description.trim().length < 10) {
      toast.error('Description must be at least 10 characters long.');
      return;
    }
    if (!formData.category && selectedSubject !== 'None' && selectedSubject !== '') {
      toast.error('Please select a category or subject.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload video to Firebase Storage
      const videoRef = ref(storage, `videos/${user.uid}/${Date.now()}_${fileObj.name}`);
      const uploadTask = uploadBytesResumable(videoRef, fileObj);

      // Wait for upload to complete
      const videoURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error("Storage upload error:", error);
            if (error.code === 'storage/canceled') {
               reject(new Error("Upload was canceled."));
            } else {
               reject(new Error("Failed to upload video. Please ensure Firebase Storage is enabled and rules allow uploads."));
            }
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      const finalThumbnail = thumbnailPreview || `https://picsum.photos/seed/${Date.now()}/1280/720`;

      const docRef = await addDoc(collection(db, 'videos'), {
        title: formData.title,
        description: formData.description,
        thumbnailURL: finalThumbnail,
        videoURL: videoURL,
        creatorId: user.uid,
        creatorName: profile?.username || profile?.displayName || user.displayName || 'Anonymous',
        creatorFaculty: userFaculty,
        views: 0,
        likes: 0,
        dislikes: 0,
        category: formData.category || (selectedSubject === 'None' ? '' : selectedSubject),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        duration: isNaN(videoDuration) ? 0 : videoDuration,
        createdAt: serverTimestamp()
      });

      toast.success('Video uploaded successfully!');
      navigate(`/watch/${docRef.id}`);
    } catch (error) {
      console.error('Error uploading video:', error);
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          handleFirestoreError(error, OperationType.CREATE, 'videos');
        } else {
          toast.error(error.message, { duration: 6000 });
        }
      } else {
        toast.error('Upload failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const isMMU = !!profile?.studentId || user?.email === 'fcazlan@gmail.com' || user?.email?.endsWith('@mmu.edu.my');
  const isStaff = !profile?.studentId;

  if (!isMMU) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle size={64} className="text-[#E31837]" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-white/60">Only MMU students and staff can upload videos.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-[#E31837] p-2 rounded-xl">
          <UploadIcon size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter">Upload Video</h1>
      </div>

      <div className={cn("grid grid-cols-1 gap-8", isStaff ? "lg:grid-cols-1 max-w-3xl mx-auto" : "lg:grid-cols-3")}>
        {/* Left: Upload Form */}
        <div className={cn("bg-card p-8 rounded-3xl border border-border shadow-2xl", !isStaff && "lg:col-span-2")}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Dropzone */}
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary transition-colors relative cursor-pointer bg-muted/30">
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className="flex flex-col items-center gap-4 pointer-events-none">
                <FileVideo size={48} className={fileName ? "text-primary" : "text-muted-foreground/40"} />
                {fileName ? (
                  <div className="space-y-1">
                    <p className="font-bold text-lg text-foreground">{fileName}</p>
                    <p className="text-sm text-green-500 font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 size={16} /> File selected ({(fileObj?.size || 0) / (1024 * 1024) < 1 ? `${((fileObj?.size || 0) / 1024).toFixed(1)} KB` : `${((fileObj?.size || 0) / (1024 * 1024)).toFixed(1)} MB`})
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-lg text-foreground">Drag and drop video files to upload</p>
                    <p className="text-sm text-muted-foreground">Max file size: 50MB. Your videos will be private until you publish them.</p>
                  </div>
                )}
                <button type="button" className="bg-primary text-white px-6 py-2 rounded-full font-bold mt-2">
                  Select File
                </button>
              </div>
            </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Video Thumbnail</label>
                  <div className="flex items-center gap-4">
                    <div className="w-40 h-24 bg-muted border border-border rounded-xl overflow-hidden flex items-center justify-center relative">
                      {thumbnailPreview ? (
                        <img referrerPolicy="no-referrer" src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-muted-foreground/40 text-xs text-center p-2">No thumbnail selected</div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleThumbnailChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-2">Upload a custom thumbnail for your video. Recommended size: 1280x720.</p>
                      <label className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors border border-border">
                        Choose Image
                        <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Title (required)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-all text-foreground"
                    placeholder="Add a title that describes your video"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                  <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-all text-foreground resize-none"
                    placeholder="Tell viewers about your video"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</label>
                    <select 
                      value={selectedSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setFormData({ ...formData, category: e.target.value === 'None' ? '' : e.target.value });
                      }}
                      className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-all text-foreground appearance-none"
                    >
                      <option value="None">None</option>
                      {availableSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tags (comma separated)</label>
                    <input 
                      type="text" 
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full bg-muted border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-all text-foreground"
                      placeholder="e.g., AI, Robotics, 2026"
                    />
                  </div>
                </div>
              </div>

            <div className="pt-4 border-t border-border flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/')} className="px-6 py-2 font-bold hover:bg-muted rounded-full transition-colors">
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || !fileObj}
                className="bg-primary text-white px-8 py-2 rounded-full font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    {uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${Math.round(uploadProgress)}%` : 'Publishing...'}
                  </>
                ) : 'Publish Video'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Assignment Tracker */}
        {!isStaff && (
          <div className="bg-card p-6 rounded-3xl border border-border shadow-2xl h-fit sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-yellow-500" size={24} />
              <h3 className="text-xl font-bold">Assignment Tracker</h3>
            </div>
            
            <div className="mb-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Faculty</label>
              <div className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-muted-foreground text-sm">
                {userFaculty}
              </div>
              <p className="text-[10px] text-muted-foreground/60 italic">Locked to your profile faculty</p>
            </div>

            <div className="mb-6 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Select Subject</label>
              <select 
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl py-2 px-3 focus:outline-none focus:border-primary transition-all text-foreground text-sm"
              >
                <option value="" disabled>Choose your subject</option>
                <option value="None">None</option>
                {availableSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {selectedSubject && selectedSubject !== 'None' ? (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Uploading for a class? We automatically check your file name against pending assignments.
                </p>

                <div className="space-y-4">
                  {assignments.map(assignment => (
                    <div 
                      key={assignment.id} 
                      className={cn(
                        "p-4 rounded-xl border transition-all flex flex-col gap-2",
                        assignment.done 
                          ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" 
                          : "bg-muted border-border text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{assignment.name}</span>
                        {assignment.done ? <CheckCircle2 size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-border" />}
                      </div>
                      <div className="text-[10px] opacity-60 bg-muted/50 p-2 rounded">
                        <span className="font-bold uppercase">Example Format:</span> {assignment.exampleFormat}
                      </div>
                      {!assignment.done && (
                        <div className="text-[10px] italic">
                          Keyword: <span className="font-mono">"{assignment.keyword}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {assignments.some(a => a.done) && (
                  <div className="mt-6 bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-500/20">
                    <CheckCircle2 size={16} />
                    Assignment requirement met!
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground/40 text-sm">
                Please select a subject to view your pending assignments.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
