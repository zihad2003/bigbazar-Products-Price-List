import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { getOptimizedUrl } from '../../utils/media';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

function dismissKey(image) {
  return `bb_promo_popup:${image}`;
}

export default function PromoPopup({ image, link, hidden }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const poster = String(image || '').trim();
  const href = String(link || '').trim();

  useEffect(() => {
    if (!poster || hidden) return undefined;
    try {
      if (sessionStorage.getItem(dismissKey(poster))) return undefined;
    } catch (_) {}
    const timer = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(timer);
  }, [poster, hidden]);

  const remember = () => {
    try { sessionStorage.setItem(dismissKey(poster), '1'); } catch (_) {}
  };

  const close = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    remember();
    setOpen(false);
  };

  const go = () => {
    if (!href) return;
    remember();
    setOpen(false);
    if (href.startsWith('/') && !href.startsWith('//')) {
      navigate(href);
      return;
    }
    window.location.assign(href);
  };

  const visible = open && !hidden && !!poster;
  useBodyScrollLock(visible);
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6 bg-black/60" role="dialog" aria-modal="true" aria-label="Offer">
      <button type="button" className="absolute inset-0" aria-label="Close popup" onClick={close} />
      <div className="relative w-max max-w-[min(92vw,420px)]">
        <button
          type="button"
          onClick={go}
          disabled={!href}
          className={`block overflow-hidden rounded-2xl bg-white shadow-2xl ${href ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <img
            src={getOptimizedUrl(poster, { w: 900 })}
            alt=""
            className="block max-w-[min(92vw,420px)] max-h-[min(78dvh,680px)] w-auto h-auto object-contain bg-neutral-100"
          />
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 w-11 h-11 rounded-full bg-white text-neutral-900 shadow-lg flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
