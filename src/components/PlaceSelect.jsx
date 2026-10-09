import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function PlaceSelect({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = '',
  style,
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  const place = () => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    setBox({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(280, Math.max(140, spaceBelow)),
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups = [];
  options.forEach((option) => {
    const key = option.group || '';
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, label: option.group, options: [] };
      groups.push(group);
    }
    group.options.push(option);
  });
  const byLabel = (a, b) => {
    const sample = `${a.label || ''}${b.label || ''}`;
    const locale = /[\u0980-\u09FF]/.test(sample) ? 'bn' : 'en';
    return String(a.label || '').localeCompare(String(b.label || ''), locale, { sensitivity: 'base' });
  };
  groups.forEach((group) => group.options.sort(byLabel));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`${className} relative`}
        style={{
          ...style,
          color: selected ? style?.color : (style ? 'var(--text-muted)' : undefined),
        }}
      >
        <span className={`block truncate pr-2 ${selected ? '' : 'text-neutral-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && box && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[4000] overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white shadow-2xl py-1"
          style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
        >
          {options.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-neutral-400">{placeholder}</p>
          )}
          {groups.map((group) => (
            <div key={group.key || 'all'}>
              {group.label && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{group.label}</p>
              )}
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-[16px] sm:text-sm ${
                    option.value === value
                      ? 'bg-[#ce112d]/10 text-[#ce112d] font-semibold'
                      : 'text-neutral-800 hover:bg-neutral-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
