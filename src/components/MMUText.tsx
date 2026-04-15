import React from 'react';

interface MMUTextProps {
  text: string;
  className?: string;
}

export const MMUText: React.FC<MMUTextProps> = ({ text, className = '' }) => {
  if (!text) return null;
  
  const parts = text.split(/(MMU)/g);
  
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part === 'MMU' ? (
          <span key={i} className="font-black tracking-tight">
            <span className="text-[#014ca0]">M</span>
            <span className="text-[#014ca0]">M</span>
            <span className="text-[#e31837]">U</span>
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};
