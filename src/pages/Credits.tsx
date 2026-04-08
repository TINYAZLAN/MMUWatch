import React from 'react';
import { Eye, Brain, Network, Image, Monitor, Palette, ShieldCheck, Heart } from 'lucide-react';

const Credits: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black tracking-tighter text-white">Project <span className="text-[#E31837]">Credits</span></h1>
        <p className="text-white/60 text-xl font-medium">MMUWatch: Mini IT Project Group 14 Demo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Supervisor */}
        <div className="md:col-span-2 bg-[#00205B] p-10 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-yellow-500/20 p-6 rounded-2xl border border-yellow-500/30">
            <Eye size={48} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Supervisor</p>
            <h3 className="text-4xl font-black text-white">Ms. Robiatun Adawiah</h3>
          </div>
        </div>

        {/* Project Manager */}
        <div className="bg-[#00205B] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/30">
            <Brain size={32} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Project Manager</p>
            <h3 className="text-2xl font-black text-white">Azlan Shahzan bin Azrin Hisyam</h3>
            <p className="text-white/60 text-sm font-bold mt-1">(252FT253PS)</p>
          </div>
        </div>

        {/* System Architect */}
        <div className="bg-[#00205B] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-purple-500/20 p-4 rounded-2xl border border-purple-500/30">
            <Network size={32} className="text-purple-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">System Architect</p>
            <h3 className="text-2xl font-black text-white">Muhammad Ammar Ashyraf bin Moh</h3>
            <p className="text-white/60 text-sm font-bold mt-1">(252FT253D3)</p>
          </div>
        </div>

        {/* Frontend Engineer */}
        <div className="bg-[#00205B] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-green-500/20 p-4 rounded-2xl border border-green-500/30">
            <Image size={32} className="text-green-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Frontend Engineer</p>
            <h3 className="text-2xl font-black text-white">Hashviena A/P Ravichandran</h3>
            <p className="text-white/60 text-sm font-bold mt-1">(252FT253L6)</p>
          </div>
        </div>

        {/* UI/UX Designer */}
        <div className="bg-[#00205B] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-pink-500/20 p-4 rounded-2xl border border-pink-500/30">
            <Palette size={32} className="text-pink-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">UI/UX Designer</p>
            <h3 className="text-2xl font-black text-white">Wan Nur Arissa binti Wan Mohd</h3>
            <p className="text-white/60 text-sm font-bold mt-1">(252FT253M1)</p>
          </div>
        </div>

        {/* Backend Developers */}
        <div className="md:col-span-2 bg-[#00205B] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-red-500/20 p-4 rounded-2xl border border-red-500/30">
            <ShieldCheck size={32} className="text-[#E31837]" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Backend Developers</p>
            <h3 className="text-2xl font-black text-white">Azlan Shahzan & Muhammad Ammar</h3>
          </div>
        </div>

        {/* Frontend Developers */}
        <div className="md:col-span-2 bg-[#00205B] p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="bg-green-500/20 p-4 rounded-2xl border border-green-500/30">
            <Monitor size={32} className="text-green-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Frontend Developers</p>
            <h3 className="text-2xl font-black text-white">Hashviena and Wan Nur Arissa</h3>
          </div>
        </div>
      </div>

      <div className="bg-[#E31837] p-12 rounded-[3rem] text-center space-y-6 shadow-2xl shadow-red-500/20">
        <Heart size={48} className="text-white mx-auto fill-white animate-pulse" />
        <h2 className="text-4xl font-black text-white tracking-tighter">Thank You for Supporting MMUWatch!</h2>
        <p className="text-white/80 text-lg max-w-2xl mx-auto font-medium">
          This project was developed as part of the Mini IT Project course at Multimedia University. 
          We appreciate all the feedback and support from our faculty and peers.
        </p>
      </div>
    </div>
  );
};

export default Credits;
