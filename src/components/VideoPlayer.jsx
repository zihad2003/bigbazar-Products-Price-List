import React, { useState, useEffect } from 'react';
import { Instagram, AlertCircle, Play, ExternalLink } from 'lucide-react';
import { getInstagramEmbedUrl, extractInstagramId } from '../utils/instagram';

const VideoPlayer = ({ src, poster, isActive }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const embedUrl = getInstagramEmbedUrl(src);
  const videoId = extractInstagramId(src);

  if (!src) return (
    <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-700">
      <Play size={48} />
    </div>
  );

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      {/* Background Poster / Blur Fallback */}
      {poster && !isLoaded && (
        <img
          src={poster}
          className="absolute inset-0 w-full h-full object-cover blur-xl opacity-30 scale-110"
          alt=""
        />
      )}

      {embedUrl ? (
        <div className="w-full h-full flex flex-col relative">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 absolute inset-0 z-10"
            frameBorder="0"
            allowFullScreen
            scrolling="no"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out'
            }}
            onLoad={() => setIsLoaded(true)}
          />

          {/* Always accessible fallback/direct link */}
          <div className="absolute bottom-6 right-6 z-50 pointer-events-auto">
            <a
              href={`https://www.instagram.com/reel/${videoId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#ce112d] hover:border-[#ce112d] transition-all shadow-xl"
            >
              <Instagram size={14} /> Watch on App <ExternalLink size={12} />
            </a>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-6 text-center space-y-4">
          <AlertCircle size={32} className="text-[#ce112d]" />
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Source not supported</p>
        </div>
      )}

      {!isLoaded && embedUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-0">
          <div className="w-10 h-10 border-4 border-[#ce112d]/20 border-t-[#ce112d] rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;