import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { MMUText } from './MMUText';

const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-border py-12 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-black tracking-tighter text-foreground"><MMUText text="MMUWATCH" /></h3>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">Mini IT Project Group 14 Demo</p>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <Link 
            to="/credits" 
            className="text-primary font-bold hover:underline transition-all"
          >
            Credits
          </Link>
          
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>Made with</span>
            <Heart size={16} className="text-primary fill-primary" />
            <span>for Multimedia University</span>
          </div>
        </div>
        
        <p className="text-muted-foreground/40 text-[10px] font-medium uppercase tracking-[0.2em]">
          © 2026 <MMUText text="MMUWATCH" /> • ALL RIGHTS RESERVED
        </p>
      </div>
    </footer>
  );
};

export default Footer;
