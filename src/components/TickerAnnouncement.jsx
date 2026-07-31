import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Minimal Moving Text Announcement Bar
 * Controlled by Admin via site_settings (key: 'ticker_announcement')
 * Displays seamless moving marquee text across any viewport width.
 */
const TickerAnnouncement = ({ ticker, className = '' }) => {
  if (!ticker || !ticker.enabled || !ticker.text || !ticker.text.trim()) {
    return null;
  }

  const text = ticker.text.trim();
  const bgColor = ticker.bg_color || '#ce112d';
  const textColor = ticker.text_color || '#ffffff';

  // Read speed from ticker settings set by Admin (in seconds)
  const rawSpeed = parseInt(ticker.speed, 10);
  const speedInSeconds = !isNaN(rawSpeed) && rawSpeed > 0 ? rawSpeed : 65;

  const items = Array.from({ length: 8 });

  return (
    <div 
      className={`w-full relative z-[1005] overflow-hidden py-2 shadow-sm border-b border-white/10 select-none flex whitespace-nowrap ${className}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div 
        className="flex shrink-0 animate-marquee items-center"
        style={{ animationDuration: `${speedInSeconds}s` }}
      >
        {items.map((_, i) => (
          <div key={`a-${i}`} className="flex items-center gap-3 px-6 shrink-0">
            <Sparkles className="w-3.5 h-3.5 opacity-90 shrink-0 animate-pulse" />
            <span className="font-semibold text-xs md:text-sm tracking-wide">{text}</span>
            <span className="opacity-40 text-xs px-3">•</span>
          </div>
        ))}
      </div>
      <div 
        className="flex shrink-0 animate-marquee items-center" 
        style={{ animationDuration: `${speedInSeconds}s` }}
        aria-hidden="true"
      >
        {items.map((_, i) => (
          <div key={`b-${i}`} className="flex items-center gap-3 px-6 shrink-0">
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
