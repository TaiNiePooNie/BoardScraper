"use client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ProductImg } from "./ProductImg";

/**
 * Floating lightbox. Click the image to toggle 2.5× zoom anchored at the cursor;
 * move the mouse to pan while zoomed. Keys: ←/→ navigate, Esc closes.
 */
export function ZoomModal({ images, alt, startIndex, onClose }: { images: string[]; alt: string; startIndex: number; onClose: () => void }) {
  const [i, setI] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const go = useCallback((d: number) => { setZoomed(false); setI((p) => (p + d + images.length) % images.length); }, [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);

  const track = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${alt} images`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative flex max-h-full w-full max-w-4xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-[80vh] w-full overflow-hidden rounded-xl bg-white" onMouseMove={track} onClick={(e) => { track(e); setZoomed((z) => !z); }}>
          <ProductImg
            src={images[i]}
            alt={`${alt} ${i + 1}`}
            className={`h-full w-full select-none object-contain transition-transform duration-200 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            style={{ transform: zoomed ? "scale(2.5)" : "scale(1)", transformOrigin: origin }}
           
          />
        </div>
        <div className="mt-3 flex gap-2">
          {images.map((src, idx) => (
            <button key={idx} onClick={() => { setZoomed(false); setI(idx); }} className={`h-16 w-12 overflow-hidden rounded border-2 bg-white ${idx === i ? "border-glacier" : "border-transparent opacity-60"}`}>
              <ProductImg src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
        <button onClick={onClose} className="absolute -top-2 right-0 rounded-full bg-white/90 p-1.5 text-ink" aria-label="Close"><X className="h-5 w-5" /></button>
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 top-[40vh] rounded-full bg-white/90 p-2 text-ink" aria-label="Previous"><ChevronLeft /></button>
            <button onClick={() => go(1)} className="absolute right-2 top-[40vh] rounded-full bg-white/90 p-2 text-ink" aria-label="Next"><ChevronRight /></button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
