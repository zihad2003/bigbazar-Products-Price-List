import React from 'react';
import { Sparkles, Megaphone, Tag } from 'lucide-react';

/**
 * Minimal Moving Text Announcement Bar
 * Controlled by Admin via site_settings (key: 'ticker_announcement')
 * Displays moving text across screen if enabled and text is present.
 */
const TickerAnnouncement = ({ ticker, className = '' }) => {
  if (!ticker || !ticker.enabled || !ticker.text || !ticker.text.trim()) {
    return null;
  }

  const text = ticker.text.trim();
  const speed = ticker.speed || 25;
  const bgColor = ticker.bg_color || '#ce112d';
  const textColor = ticker.text_color || '#ffffff';

  return (
    <div 
      className={`w-full relative z-[1005] overflow-hidden py-2 px-2 shadow-sm border-b border-white/10 select-none ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex w-max animate-marquee cursor-pointer">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-6 shrink-0 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 opacity-90 shrink-0 animate-pulse" />
            <span className="font-semibold text-xs md:text-sm tracking-wide">{text}</span>
            <span className="opacity-40 text-xs px-3">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TickerAnnouncement;
