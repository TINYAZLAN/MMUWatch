import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, onPlay, onPause, onEnded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => { setIsPlaying(true); onPlay && onPlay(); };
    const handlePause = () => { setIsPlaying(false); onPause && onPause(); };
    const handleEnded = () => { setIsPlaying(false); onEnded && onEnded(); };
    const handleTimeUpdate = () => { setProgress((video.currentTime / video.duration) * 100); };
    const handleLoadedMetadata = () => { setDuration(video.duration); };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onPlay, onPause, onEnded]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        // play returns a promise
        videoRef.current.play().catch(() => {
          // ignore auto play errors
        });
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-black flex items-center justify-center overflow-hidden group rounded-xl",
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
      />

      {/* Big Play Button (centered, hides when playing) */}
      {!isPlaying && (
        <button
          className="absolute inset-0 m-auto w-24 h-24 bg-primary/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-2xl border border-white/20 z-10"
        >
          <Play size={44} className="pl-1.5" fill="currentColor" />
        </button>
      )}

      {/* Controls Bar */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 z-20 pointer-events-none",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <div 
          className="bg-black/60 backdrop-blur-xl rounded-2xl p-2 px-4 shadow-2xl border border-white/10 flex items-center gap-4 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={togglePlay} className="text-white hover:text-primary transition-colors flex-shrink-0">
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          
          <div className="flex items-center gap-2 text-white/80 text-xs font-mono flex-shrink-0 min-w-[40px]">
            {formatTime(videoRef.current?.currentTime || 0)}
          </div>

          <div className="flex-1 relative flex items-center h-5 group/slider cursor-pointer">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10 my-auto h-full m-0 p-0"
            />
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden pointer-events-none transition-all group-hover/slider:h-2.5">
              <div 
                className="h-full bg-primary relative pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/80 text-xs font-mono flex-shrink-0 min-w-[40px]">
            {formatTime(duration)}
          </div>

          <button onClick={toggleMute} className="text-white hover:text-primary transition-colors flex-shrink-0">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors flex-shrink-0">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
