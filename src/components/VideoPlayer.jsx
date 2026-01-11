import ReactPlayer from 'react-player';
import React, { useState, useEffect } from 'react';

export default function VideoPlayer({ url }) {
  const [playableUrl, setPlayableUrl] = useState(url);

  useEffect(() => {
    const processUrl = (inputUrl) => {
      // Basic check for TikTok short links (Note: true resolution often requires a backend due to CORS/Redirects)
      // This attempts to handle the client-side manageable parts or passes it through.
      if (inputUrl && (inputUrl.includes('vt.tiktok.com') || inputUrl.includes('vm.tiktok.com'))) {
        // In a real frontend-only app, we can't easily follow redirects (CORS). 
        // We trust ReactPlayer or the user handles the full link.
        // However, we can try to warn or prompt if needed. 
        // For now, we pass it, but if the user provided logic to "convert", we'd add it here.
        // Since the user asked for a "system", we'll assume they might paste short links.
        // ReactPlayer often struggles with short links directly.
        console.log('TikTok short link detected:', inputUrl);
      }
      setPlayableUrl(inputUrl);
    };
    processUrl(url);
  }, [url]);

  if (!playableUrl) return null;

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 relative group">
      <ReactPlayer
        url={playableUrl}
        width="100%"
        height="100%"

        controls
        className="react-player"
        config={{
          tiktok: {
            preloadData: true,
            // Attempt to force embed mode if applicable
          }
        }}
      />
    </div>
  );
}