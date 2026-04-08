import React from 'react';
import { GraduationCap, CheckCircle2, ArrowRight, Sparkles, ShieldCheck, Globe, Zap } from 'lucide-react';

const Apply: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 py-10">
      {/* Left Side: Marketing */}
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="bg-red-600/20 text-red-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest w-fit">
            Admissions 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
            START YOUR <span className="text-red-600">JOURNEY</span> AT MMU
          </h1>
          <p className="text-xl text-white/60 leading-relaxed">
            Join Malaysia's first private university and become part of a global community of innovators, creators, and leaders.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <BenefitCard 
            icon={<Zap className="text-yellow-400" />} 
            title="Industry-Ready" 
            desc="97% Graduate Employability rate within 6 months." 
          />
          <BenefitCard 
            icon={<Globe className="text-blue-400" />} 
            title="Global Network" 
            desc="Partnerships with top tech firms like Google, Intel, and Huawei." 
          />
          <BenefitCard 
            icon={<Sparkles className="text-purple-400" />} 
            title="Innovation Hub" 
            desc="State-of-the-art labs and creative studios." 
          />
          <BenefitCard 
            icon={<ShieldCheck className="text-green-400" />} 
            title="Accredited" 
            desc="MQA accredited and globally recognized degrees." 
          />
        </div>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="font-bold text-lg">Why MMU?</h3>
          <ul className="space-y-3">
            {[
              "First private university in Malaysia",
              "Top-tier research and development facilities",
              "Vibrant campus life in Cyberjaya and Melaka",
              "Strong alumni network of 70,000+ worldwide"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Side: Action */}
      <div className="bg-[#00205B] p-8 md:p-12 rounded-[40px] border border-white/10 shadow-2xl flex flex-col justify-center items-center text-center space-y-8">
        <div className="bg-white/10 p-6 rounded-full">
          <GraduationCap size={64} className="text-[#E31837]" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tight">Ready to Apply?</h2>
          <p className="text-white/60 text-lg max-w-sm mx-auto">
            Take the next step in your educational journey. Visit the official MMU website to submit your application.
          </p>
        </div>

        <a 
          href="https://www.mmu.edu.my" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full max-w-md bg-[#E31837] text-white py-5 rounded-2xl font-black text-xl hover:bg-red-700 transition-all scale-100 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-red-600/20"
        >
          Go to MMU Website
          <ArrowRight size={24} />
        </a>
      </div>
    </div>
  );
};

const BenefitCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors">
    <div className="bg-white/5 p-3 rounded-xl h-fit">{icon}</div>
    <div className="space-y-1">
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default Apply;
