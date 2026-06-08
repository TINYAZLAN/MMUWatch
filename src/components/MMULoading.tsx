import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface MMULoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  text?: string;
}

export const MMULoading: React.FC<MMULoadingProps> = ({ className, size = 'fullscreen', text = 'Loading...' }) => {
  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-4",
    size === 'fullscreen' && "min-h-[60vh]",
    size === 'lg' && "py-32",
    size === 'md' && "py-16",
    size === 'sm' && "py-8",
    className
  );

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center">
        {/* Outer glowing rings */}
        <motion.div 
          className="absolute inset-0 rounded-full border border-primary/30 bg-primary/10"
          animate={{ scale: [0.8, 2.5], opacity: [0, 0.8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute inset-0 rounded-full border border-primary/30 bg-primary/10"
          animate={{ scale: [0.8, 2.5], opacity: [0, 0.8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1.5 }}
        />
        
        {/* Core Logo Container */}
        <motion.div 
          className="relative bg-background/40 backdrop-blur-2xl w-24 h-24 rounded-[2rem] shadow-2xl shadow-primary/20 border border-white/20 flex items-center justify-center overflow-hidden"
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Glass glare effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
          
          {/* Logo Animation */}
          <motion.img 
            src="/mmu-logo.svg" 
            alt="MMU Logo" 
            className="w-14 h-14 object-contain drop-shadow-lg z-10"
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
      
      {/* Loading Text */}
      {text && (
        <motion.p 
          className="text-muted-foreground font-bold tracking-widest uppercase text-xs mt-4"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};
