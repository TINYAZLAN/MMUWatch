import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  options: any;
  onReady?: (player: any) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ options, onReady }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-theme-mmu', 'vjs-big-play-centered');
      
      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
        
        const player = playerRef.current = videojs(videoElement, options, () => {
          if (onReady) {
            onReady(player);
          }
        });
      }
    } else {
      const player = playerRef.current;
      if (options.sources) {
        player.src(options.sources);
      }
      if (options.poster !== undefined) {
        player.poster(options.poster);
      }
    }
  }, [options, onReady]);

  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player ref={videoRef} className="w-full h-full [&>.video-js]:w-full [&>.video-js]:h-full" />
  );
};

export default VideoPlayer;
